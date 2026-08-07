-- MaidItEasy — fix: admin cancel never flags a refund
--
-- admin_cancel_booking() and cancel_booking_customer() both computed
-- refund eligibility with `v_payment is not null`, where v_payment is a
-- composite (public.payments%rowtype) variable — in Postgres, `IS NOT
-- NULL` on a row value is true only if EVERY field is non-null, not just
-- that a row was found. payments.reject_reason is null for any payment
-- that was never rejected (the normal case for a verified GCash payment),
-- so `v_payment is not null` evaluated to false essentially always,
-- collapsing refund_needed to false regardless of the payment's real
-- method/status. Fixed by using plpgsql's FOUND (set by SELECT INTO),
-- which only reflects whether a row was returned. Also added `order by
-- created_at desc` to the payment lookup as defensive hardening — no
-- booking has more than one payment row today, but this removes a
-- nondeterministic-row-pick landmine if that ever changes.
--
-- Idempotent: safe to run this whole file again.

create or replace function public.admin_cancel_booking(p_booking_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_payment public.payments;
  v_refund_needed boolean;
begin
  if not exists (select 1 from public.admins a where a.auth_user_id = auth.uid()) then
    raise exception 'Not authorized.';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found.';
  end if;

  select * into v_payment from public.payments where booking_id = p_booking_id order by created_at desc limit 1;

  v_refund_needed := found and v_payment.method = 'gcash' and v_payment.status = 'verified';

  update public.bookings
  set status = 'cancelled',
      refund_needed = v_refund_needed,
      refunded_at = null
  where id = p_booking_id;

  return v_refund_needed;
end;
$$;

revoke all on function public.admin_cancel_booking(uuid) from public, anon, authenticated;
grant execute on function public.admin_cancel_booking(uuid) to authenticated;

create or replace function public.cancel_booking_customer(p_booking_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_payment public.payments;
  v_hours_until numeric;
  v_within_window boolean;
  v_refund_needed boolean;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found.';
  end if;

  if v_booking.customer_id is distinct from auth.uid() then
    raise exception 'Not authorized to cancel this booking.';
  end if;

  if v_booking.status not in ('pending', 'assigned') then
    raise exception 'This booking can no longer be cancelled here — please call us.';
  end if;

  v_hours_until := extract(epoch from (
    (v_booking.date + (v_booking.start_hour || ' hours')::interval) - now()
  )) / 3600;
  v_within_window := v_hours_until >= public.cancellation_window_hours();

  select * into v_payment from public.payments where booking_id = p_booking_id order by created_at desc limit 1;

  v_refund_needed := found
    and v_payment.method = 'gcash'
    and v_payment.status = 'verified'
    and v_within_window;

  update public.bookings
  set status = 'cancelled',
      cancel_reason = case when v_within_window then 'customer-cancelled' else 'customer-cancelled-late' end,
      refund_needed = v_refund_needed,
      refunded_at = null
  where id = p_booking_id;

  return v_refund_needed;
end;
$$;

revoke all on function public.cancel_booking_customer(uuid) from public, anon, authenticated;
grant execute on function public.cancel_booking_customer(uuid) to authenticated;
revoke execute on function public.cancel_booking_customer(uuid) from authenticated;

-- Backfill: bookings already cancelled by the buggy version above, where a
-- refund was in fact owed.
update public.bookings b
set refund_needed = true
where b.status = 'cancelled'
  and b.refund_needed = false
  and b.refunded_at is null
  and (b.cancel_reason is null or b.cancel_reason not in ('expired-unpaid', 'customer-cancelled-late'))
  and exists (
    select 1 from public.payments p
    where p.booking_id = b.id and p.method = 'gcash' and p.status = 'verified'
  );
