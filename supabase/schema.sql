-- Run this in the Supabase SQL editor.
-- Adds messages + bookings for the alumni network, with row level security
-- so a signed-in student can only ever read and write their own rows.

-- ---------------------------------------------------------------- alumni ---
-- Alumni are public reference data: any signed-in student may read them.
alter table public.alumni enable row level security;

drop policy if exists "alumni are readable by signed-in users" on public.alumni;
create policy "alumni are readable by signed-in users"
  on public.alumni for select
  to authenticated
  using (true);

-- -------------------------------------------------------------- messages ---
-- receiver_id holds an alumni.id (student -> alumnus) or an auth user id
-- (alumnus -> student), so it is intentionally not foreign-keyed.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  receiver_id uuid not null,
  message text not null check (char_length(trim(message)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx
  on public.messages (sender_id, receiver_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "read own messages" on public.messages;
create policy "read own messages"
  on public.messages for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "send messages as self" on public.messages;
create policy "send messages as self"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = sender_id);

-- Realtime delivery for the chat panel (respects the policies above).
alter publication supabase_realtime add table public.messages;

-- -------------------------------------------------------------- bookings ---
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  alumni_id uuid not null references public.alumni (id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- One booking per alumnus per slot.
create unique index if not exists bookings_slot_unique
  on public.bookings (alumni_id, scheduled_at)
  where status = 'confirmed';

alter table public.bookings enable row level security;

drop policy if exists "read own bookings" on public.bookings;
create policy "read own bookings"
  on public.bookings for select
  to authenticated
  using (auth.uid() = student_id);

drop policy if exists "create own bookings" on public.bookings;
create policy "create own bookings"
  on public.bookings for insert
  to authenticated
  with check (auth.uid() = student_id);

drop policy if exists "cancel own bookings" on public.bookings;
create policy "cancel own bookings"
  on public.bookings for update
  to authenticated
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ------------------------------------------------------ taken slot lookup ---
-- Students may not read each other's bookings, but the booking form still has
-- to know which slots are gone. This function runs as the owner and returns
-- nothing but the busy timestamps for one alumnus.
create or replace function public.taken_slots(p_alumni_id uuid)
returns table (scheduled_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select b.scheduled_at
  from public.bookings b
  where b.alumni_id = p_alumni_id
    and b.status = 'confirmed'
    and b.scheduled_at >= now();
$$;

revoke all on function public.taken_slots(uuid) from public;
grant execute on function public.taken_slots(uuid) to authenticated;
