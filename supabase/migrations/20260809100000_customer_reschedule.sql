-- Genuine logic #6: lets a customer move their own pending/assigned booking
-- to a different date/start_hour without cancelling and rebooking.

-- Mirrors available_start_hours() but threads an exclude-booking-id through
-- to has_free_qualified_partner() (which already accepts one — see
-- *_hourly_booking_capacity.sql — just never had a client-facing wrapper
-- that used it), so previewing the SAME day the customer is already booked
-- on doesn't show their own current slot/worker as falsely unavailable.
create or replace function public.available_start_hours_for_reschedule(
  p_service_id text, p_date date, p_duration_hours integer, p_exclude_booking_id uuid
)
returns table (start_hour integer, available boolean)
language sql
stable
security definer
set search_path = public
as $$
  select h.start_hour,
    (h.start_hour * 60 + p_duration_hours * 60 + public.buffer_minutes() <= public.business_close_hour() * 60)
    and public.has_free_qualified_partner(p_service_id, p_date, h.start_hour, p_duration_hours, p_exclude_booking_id)
  from generate_series(public.business_open_hour(), public.business_close_hour() - 1) as h(start_hour)
$$;

revoke all on function public.available_start_hours_for_reschedule(text, date, integer, uuid) from public, anon, authenticated;
grant execute on function public.available_start_hours_for_reschedule(text, date, integer, uuid) to authenticated;

-- The sole path a customer reschedules their own booking through. Must do
-- its own authoritative qualified_free_partners() check rather than
-- leaning on enforce_booking_capacity()'s trigger: on UPDATE, that trigger
-- only re-verifies capacity when partner_id changes or the booking leaves
-- 'pending' -- a reschedule that keeps the SAME partner (still free at the
-- new time) trips neither condition, so it would silently skip validating
-- the new date/start_hour if this function didn't check it itself.
--
-- service_id/units/duration_hours/total are never touched (preserves the
-- snapshot invariant, see CLAUDE.md). Always resets status to 'pending' +
-- accepted_at = null, even when the same partner ends up assigned -- their
-- earlier accept was for the old time, not the new one, so it needs a
-- fresh confirm either way (same treatment as release_and_rehold()).
create or replace function public.reschedule_booking_customer(
  p_booking_id uuid, p_new_date date, p_new_start_hour integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_candidate uuid;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_booking.customer_id is distinct from auth.uid() then
    raise exception 'Not authorized to reschedule this booking.';
  end if;

  if v_booking.status not in ('pending', 'assigned') then
    raise exception 'This booking can no longer be rescheduled here — please call us.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_new_date::text, 0));

  -- Prefer keeping the current partner if they're still free for the new
  -- slot (continuity, same idea as AssignModal pre-selecting the soft-held
  -- worker) -- else fall back to the least-loaded qualified free worker.
  -- Same v_candidate shape as enforce_booking_capacity()'s own check.
  v_candidate := v_booking.partner_id;
  if v_candidate is not null then
    if not exists (
      select 1 from public.qualified_free_partners(v_booking.service_id, p_new_date, p_new_start_hour, v_booking.duration_hours, p_booking_id) qp
      where qp.id = v_candidate
    ) then
      v_candidate := null;
    end if;
  end if;

  if v_candidate is null then
    select qp.id into v_candidate
    from public.qualified_free_partners(v_booking.service_id, p_new_date, p_new_start_hour, v_booking.duration_hours, p_booking_id) qp
    limit 1;
  end if;

  if v_candidate is null then
    raise exception 'That time is no longer available — please pick another.';
  end if;

  update public.bookings
  set date = p_new_date,
      start_hour = p_new_start_hour,
      partner_id = v_candidate,
      status = 'pending',
      accepted_at = null,
      assignment_source = 'auto',
      decline_reason = null,
      decline_note = null,
      declined_at = null
  where id = p_booking_id;
end;
$$;

revoke all on function public.reschedule_booking_customer(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.reschedule_booking_customer(uuid, date, integer) to authenticated;
