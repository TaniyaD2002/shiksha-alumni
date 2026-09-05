-- Encrypt chat messages at rest.
--
-- What this gives you:
--   * In transit  - TLS, handled by Supabase.
--   * At rest     - message bodies are stored as pgp_sym_encrypt() ciphertext,
--                   so a dump of the messages table (or anyone who somehow
--                   reaches the table directly) sees bytea, not text.
--   * Access      - the key lives in a `private` schema that the anon and
--                   authenticated roles cannot read. Only the two security
--                   definer functions below can decrypt, and they only ever
--                   return rows belonging to the caller.
--
-- What this is NOT: end-to-end encryption. True E2EE needs a keypair per
-- participant, and alumni are rows in public.alumni, not auth users, so they
-- have no account to hold a private key. See README.md ("Message security").

-- Supabase ships pgcrypto in the `extensions` schema. Only create it if this
-- project somehow does not have it, and never move an existing install.
do $ext$
begin
  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    create extension pgcrypto with schema extensions;
  end if;
end;
$ext$;

-- Everything below refers to pgcrypto unqualified, so make sure the schema it
-- actually lives in is on the path for this script.
set search_path = public, extensions;

-- ------------------------------------------------------------- key storage ---
create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table if not exists private.crypto_keys (
  name text primary key,
  secret text not null,
  created_at timestamptz not null default now()
);

alter table private.crypto_keys enable row level security;
revoke all on table private.crypto_keys from anon, authenticated;

-- Generated once. Back this value up: losing it means losing the messages.
insert into private.crypto_keys (name, secret)
values ('messages', encode(gen_random_bytes(32), 'hex'))
on conflict (name) do nothing;

-- ------------------------------------------------------- messages column ---
alter table public.messages
  add column if not exists body_encrypted bytea;

-- Encrypt anything written before this migration ran, then drop the plaintext.
do $$
declare
  k text;
begin
  select secret into k from private.crypto_keys where name = 'messages';

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name = 'message'
  ) then
    update public.messages
      set body_encrypted = pgp_sym_encrypt(message, k)
      where body_encrypted is null and message is not null;

    alter table public.messages drop column message;
  end if;
end;
$$;

alter table public.messages
  alter column body_encrypted set not null;

-- --------------------------------------------------------------- policies ---
-- Direct inserts are gone: every write goes through public.send_message so the
-- body is never handed to the database as plaintext columns. The select policy
-- stays because Realtime needs it, but it only ever exposes ciphertext.
drop policy if exists "send messages as self" on public.messages;

drop policy if exists "read own messages" on public.messages;
create policy "read own messages"
  on public.messages for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- -------------------------------------------------------------- functions ---
create or replace function public.send_message(
  p_receiver_id uuid,
  p_body text
)
returns table (
  id uuid,
  sender_id uuid,
  receiver_id uuid,
  message text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_key text;
  v_row public.messages;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if coalesce(btrim(p_body), '') = '' then
    raise exception 'Message cannot be empty';
  end if;

  if length(p_body) > 4000 then
    raise exception 'Message is too long';
  end if;

  select secret into v_key from private.crypto_keys where name = 'messages';

  insert into public.messages (sender_id, receiver_id, body_encrypted)
  values (auth.uid(), p_receiver_id, pgp_sym_encrypt(p_body, v_key))
  returning * into v_row;

  return query
    select v_row.id, v_row.sender_id, v_row.receiver_id, p_body, v_row.created_at;
end;
$$;

create or replace function public.thread_messages(p_other_id uuid)
returns table (
  id uuid,
  sender_id uuid,
  receiver_id uuid,
  message text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_key text;
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  select secret into v_key from private.crypto_keys where name = 'messages';

  return query
    select
      m.id,
      m.sender_id,
      m.receiver_id,
      pgp_sym_decrypt(m.body_encrypted, v_key),
      m.created_at
    from public.messages m
    where (m.sender_id = v_me and m.receiver_id = p_other_id)
       or (m.sender_id = p_other_id and m.receiver_id = v_me)
    order by m.created_at asc;
end;
$$;

revoke all on function public.send_message(uuid, text) from public;
revoke all on function public.thread_messages(uuid) from public;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.thread_messages(uuid) to authenticated;
