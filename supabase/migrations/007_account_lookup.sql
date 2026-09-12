-- "Forgot password" should tell the user whether the address is actually ours.
--
-- The sign-in page used to answer every request with "If {email} has an
-- account, a reset link is on its way." That hedge exists to avoid confirming
-- which addresses are registered, but it leaves someone who mistyped their
-- address waiting for mail that will never arrive. This migration gives the
-- client a way to ask the user database directly.
--
-- Trade-off, stated plainly: this is an account-enumeration oracle. Anyone can
-- call it, without a session, and learn whether an address is registered - that
-- is the whole point of the change. Keep Supabase's auth rate limits on, and if
-- the directory ever holds addresses worth harvesting, put a captcha in front
-- of the forgot-password form rather than reverting to the vague message.
--
-- auth.users is not reachable from the anon role, so the lookup has to run as
-- security definer. It returns a single boolean and nothing else - no id, no
-- name, no provider - so a caller learns exactly one bit per address.

create or replace function public.account_exists(p_email text)
returns boolean
language sql
security definer
set search_path = auth, public
stable
as $$
  select exists (
    select 1
    from auth.users u
    where lower(u.email) = lower(trim(p_email))
      and u.deleted_at is null
  );
$$;

revoke all on function public.account_exists(text) from public;
grant execute on function public.account_exists(text) to anon, authenticated;
