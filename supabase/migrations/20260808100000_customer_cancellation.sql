-- Genuine logic #5: a customer-facing cancellation path with a time-based
-- refund policy, plus a real two-state refund ledger (refund_needed was a
-- bare boolean with no "processed" signal — see CLAUDE.md -> Admin console).

-- Turns refund_needed into a real ledger: refund_needed && refunded_at is
-- null -> owed; refund_needed && refunded_at is set -> processed. No real
-- money moves here, same reconciliation-stamp pattern as
-- earnings.paid_at/payout_id.
alter table public.bookings add column if not exists refunded_at timestamptz;

-- Free cancellation must happen at least this many hours before the
-- booking's start_hour; past this, cancel_booking_customer() below still
-- lets the customer cancel (through 'assigned') but no refund is owed.
-- Mirrored client-side as CANCELLATION_WINDOW_HOURS in src/data.ts (same
-- duplicated-constant convention as MIN_BOOKING_HOURS/BUFFER_MINUTES).
create or replace function public.cancellation_window_hours()
returns integer
language sql
immutable
as $$ select 2 $$;

revoke all on function public.cancellation_window_hours() from public, anon, authenticated;

-- The sole path a customer cancels their own booking through. Recomputes
-- refund eligibility server-side from the linked payment row rather than
-- trusting a client-supplied value (same posture as
-- enforce_booking_capacity() never trusting a client-sent total).
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

  select * into v_payment from public.payments where booking_id = p_booking_id limit 1;

  v_refund_needed := v_payment is not null
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

-- bookings_update_own had no `with check`, so a signed-in customer could
-- update ANY column on their own row via a raw client call (status, total,
-- refund_needed, partner_id, ...) — dormant today (no app code performs a
-- bookings UPDATE at all) but exactly the hole cancel_booking_customer()
-- above is meant to close: a naive client-side cancel would otherwise be
-- able to skip the window/refund check entirely. Customers now cancel
-- exclusively through that function (security definer, bypasses RLS); no
-- existing customer-app flow relies on a direct bookings UPDATE.
drop policy if exists "bookings_update_own" on public.bookings;
