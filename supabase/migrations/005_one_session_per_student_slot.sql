-- A student should not hold two sessions at the same moment.
--
-- 004 left this out because rows already in the table broke it. This migration
-- clears those first, then adds the index, then teaches book_session() to tell
-- the two kinds of clash apart.

-- ------------------------------------------------------------- clean up ---
-- Where one student holds several confirmed bookings at the same timestamp,
-- keep the one they made first and cancel the rest.
with ranked as (
  select
    id,
    row_number() over (
      partition by student_id, scheduled_at
      order by created_at asc, id asc
    ) as position
  from public.bookings
  where status = 'confirmed'
)
update public.bookings b
  set status = 'cancelled'
  from ranked r
  where b.id = r.id
    and r.position > 1;

-- ---------------------------------------------------------------- index ---
create unique index if not exists bookings_student_slot_unique
  on public.bookings (student_id, scheduled_at)
  where status = 'confirmed';

-- ------------------------------------------------------------- messages ---
-- Two different clashes now reach the same exception handler, so tell them
-- apart by which index fired.
create or replace function public.book_session(
  p_alumni_id uuid,
  p_scheduled_at timestamptz
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.bookings;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_scheduled_at <= now() then
    raise exception 'That slot is already in the past.'
      using errcode = 'P0001';
  end if;

  begin
    insert into public.bookings (student_id, alumni_id, scheduled_at)
    values (auth.uid(), p_alumni_id, p_scheduled_at)
    returning * into v_row;
  exception
    when unique_violation then
      if position('bookings_student_slot_unique' in sqlerrm) > 0 then
        raise exception 'You already have another session booked at that time.'
          using errcode = 'P0001';
      else
        raise exception 'That slot was just booked by someone else. Pick another.'
          using errcode = 'P0001';
      end if;
  end;

  return v_row;
end;
$$;

revoke all on function public.book_session(uuid, timestamptz) from public;
grant execute on function public.book_session(uuid, timestamptz) to authenticated;
