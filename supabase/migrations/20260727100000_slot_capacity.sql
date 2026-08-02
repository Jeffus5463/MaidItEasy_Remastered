-- MaidItEasy — real slot capacity for customer-side availability (Phase 2.7)
--
-- Decision (BUILD_PLAN.md Phase 2.7): a time slot is unavailable when the
-- count of non-terminal bookings already holding that service+date+time is
-- >= the count of eligible partners (active + verified + tagged for the
-- service + on shift that weekday). A pending booking reserves a seat.
--
-- These run as SECURITY DEFINER functions rather than loosening bookings/
-- partners RLS: a customer needs an aggregate count across *other*
-- customers' bookings to know if a slot is full, but must never see their
-- rows or contact info. Returning only integers keeps that boundary intact
-- while still being readable under the customer's own (possibly anonymous)
-- authenticated session. Reused by src/lib/bookings.ts#createBooking for the
-- pre-insert recheck, and by the bookings_capacity_guard trigger below.
--
-- Idempotent: safe to run this whole file again.

create or replace function public.eligible_partner_count(p_service_id text, p_date date)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.partners p
  where p.active
    and p.verified
    and p_service_id = any(p.service_tags)
    and (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from p_date)::int + 1] = any(p.available_days)
$$;

create or replace function public.slot_demand_count(p_service_id text, p_date date, p_time text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.bookings b
  where b.service_id = p_service_id
    and b.date = p_date
    and b.time = p_time
    and b.status not in ('completed', 'cancelled')
$$;

-- Demand grouped by time for a service+date, so the customer app can check
-- every slot in one round trip instead of one call per TIMES entry. Only
-- returns rows for times that already have at least one non-terminal
-- booking — the client treats any time missing from this list as 0 demand
-- (keeps the fixed TIMES list itself only in src/data.ts, not duplicated here).
create or replace function public.slot_demand_by_time(p_service_id text, p_date date)
returns table (slot_time text, demand integer)
language sql
stable
security definer
set search_path = public
as $$
  select b.time as slot_time, count(*)::int as demand
  from public.bookings b
  where b.service_id = p_service_id
    and b.date = p_date
    and b.status not in ('completed', 'cancelled')
  group by b.time
$$;

revoke all on function public.eligible_partner_count(text, date) from public;
revoke all on function public.slot_demand_count(text, date, text) from public;
revoke all on function public.slot_demand_by_time(text, date) from public;

grant execute on function public.eligible_partner_count(text, date) to authenticated;
grant execute on function public.slot_demand_count(text, date, text) to authenticated;
grant execute on function public.slot_demand_by_time(text, date) to authenticated;
