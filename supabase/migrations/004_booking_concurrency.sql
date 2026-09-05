-- Two students hitting the same slot at the same instant.
--
-- The partial unique index below is what actually decides the winner: both
-- transactions try to insert (alumni_id, scheduled_at); Postgres lets the first
-- one to commit through and rejects the second with SQLSTATE 23505. There is no
-- read-then-write window to lose, so the outcome does not depend on the app.
--
-- book_session() wraps that in a single statement and turns the raw constraint
-- violation into a message the UI can show as-is.

create unique index if not exists bookings_slot_unique
  on public.bookings (alumni_id, scheduled_at)
  where status = 'confirmed';

-- A student should also not be in two places at once.
create unique index if not exists bookings_student_slot_unique
  on public.bookings (student_id, scheduled_at)
  where status = 'confirmed';

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

create or replace function public.cancel_booking(p_booking_id uuid)
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

  update public.bookings
    set status = 'cancelled'
    where id = p_booking_id
      and student_id = auth.uid()
      and status = 'confirmed'
    returning * into v_row;

  if v_row.id is null then
    raise exception 'That booking is no longer active.'
      using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;

revoke all on function public.book_session(uuid, timestamptz) from public;
revoke all on function public.cancel_booking(uuid) from public;
grant execute on function public.book_session(uuid, timestamptz) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
