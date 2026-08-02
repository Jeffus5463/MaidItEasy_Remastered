-- MaidItEasy — server-side guard against overselling a slot (Phase 2.7)
--
-- The client-side recheck in src/lib/bookings.ts#createBooking (calling
-- eligible_partner_count/slot_demand_count from *_slot_capacity.sql right
-- before insert) narrows the race window but two simultaneous confirms can
-- still both pass that check before either row exists. This trigger closes
-- it for real: it takes a transaction-scoped advisory lock keyed on
-- service+date+time so concurrent inserts for the same slot serialize, then
-- re-counts capacity/demand inside the lock and rejects if the slot is full.
--
-- Idempotent: safe to run this whole file again.

create or replace function public.enforce_booking_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_demand integer;
begin
  if new.status not in ('completed', 'cancelled') then
    perform pg_advisory_xact_lock(hashtextextended(new.service_id || new.date::text || new.time, 0));

    v_capacity := public.eligible_partner_count(new.service_id, new.date);
    v_demand := public.slot_demand_count(new.service_id, new.date, new.time);

    if v_demand >= v_capacity then
      raise exception 'That slot just filled up — please pick another time.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_capacity_guard on public.bookings;
create trigger bookings_capacity_guard
before insert on public.bookings
for each row execute function public.enforce_booking_capacity();
