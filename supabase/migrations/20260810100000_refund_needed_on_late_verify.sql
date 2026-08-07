-- Bug fix: cancel_booking_customer() and the admin's CancelBookingModal both
-- compute refund_needed from the linked payment's status AT THE MOMENT of
-- cancellation. If a GCash payment is still 'awaiting_payment' when the
-- booking is cancelled, refund_needed is correctly false (nothing verified
-- yet) — but /gcash doesn't exclude cancelled bookings from its list, so an
-- admin can still mark that payment 'verified' afterward. refund_needed
-- never gets revisited once set, so a real refund silently never surfaces
-- in /refunds. This trigger retroactively flags it the moment a late
-- verification happens.
create or replace function public.sync_refund_needed_on_late_verify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.method = 'gcash' and new.status = 'verified' and old.status is distinct from 'verified' then
    update public.bookings
    set refund_needed = true
    where id = new.booking_id
      and status = 'cancelled'
      and refund_needed = false
      -- Only for reasons that ever owe a refund — a late/expired-unpaid
      -- cancellation never does, verified or not. Admin-cancelled bookings
      -- carry no cancel_reason at all (CancelBookingModal doesn't set one),
      -- so null must be treated as refund-eligible too (plain `not in`
      -- would silently exclude it under three-valued NULL logic).
      and (cancel_reason is null or cancel_reason not in ('expired-unpaid', 'customer-cancelled-late'));
  end if;
  return new;
end;
$$;

drop trigger if exists payments_sync_refund_needed on public.payments;
create trigger payments_sync_refund_needed
after update on public.payments
for each row execute function public.sync_refund_needed_on_late_verify();

revoke all on function public.sync_refund_needed_on_late_verify() from public, anon, authenticated;

-- Backfill: two bookings caught by this exact gap during testing.
update public.bookings
set refund_needed = true
where id in ('ad2ed5aa-09dd-47bb-8aaa-a1c1cecdb46b', '06c29655-ac3c-43e5-b3a8-b9cf74873b21')
  and status = 'cancelled'
  and refund_needed = false;
