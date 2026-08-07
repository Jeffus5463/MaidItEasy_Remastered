-- MaidItEasy — Phase 14 ticket 6(a): refund reliability, admin cancel path
--
-- useCancelBooking() (admin/src/lib/data.ts) has always written
-- bookings.refund_needed from a client-computed boolean
-- (CancelBookingModal's `paid = payment?.status === 'verified'`, off a
-- `payment` prop passed down from the board's already-fetched list — which
-- can be stale by the time the admin actually clicks confirm). That's the
-- same class of bug cancel_booking_customer() (*_customer_cancellation.sql)
-- already avoids for the customer self-cancel path by recomputing
-- refund eligibility server-side from the live payments row. This gives the
-- admin cancel path the same guarantee.
--
-- cancel_reason is deliberately left null here, same as the admin cancel
-- path before this migration — sync_refund_needed_on_late_verify()
-- (*_refund_needed_on_late_verify.sql) already treats a null cancel_reason
-- as refund-eligible for its late-verify backfill.
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

  select * into v_payment from public.payments where booking_id = p_booking_id limit 1;

  -- Same eligibility rule as CancelBookingModal's pre-cancel warning and
  -- cancel_booking_customer()'s admin-initiated case: a verified GCash
  -- payment always owes a refund on an admin cancel (business-initiated,
  -- not the customer's fault) — no cancellation-window check, unlike the
  -- customer self-cancel path.
  v_refund_needed := v_payment is not null and v_payment.method = 'gcash' and v_payment.status = 'verified';

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
