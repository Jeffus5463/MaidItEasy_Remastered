-- MaidItEasy — hourly booking schema & constants (Phase 4, ticket 1)
--
-- KNOWN_ISSUES.md Genuine-logic #1: job duration wasn't modeled, so a
-- partner busy on a 2-3hr cleaning at 10:00 AM still showed as "free" at
-- 1:00 PM. This migration lays the schema for per-worker timelines: every
-- booking gets a span (start_hour, duration_hours) instead of an opaque
-- "time" string, services declare how their duration is derived
-- (pricing_model), and partners declare their own working-hours window.
-- The actual span/soft-hold capacity engine is the next migration
-- (*_hourly_booking_capacity.sql) — this one is schema + backfill only.
--
-- Decisions (BUILD_PLAN.md Phase 4, final):
-- - Business hours 9:00-21:00, min_booking_hours = 2 (raised from the
--   spec's default of 1 to match the existing "2-3 hrs" cleaning estimate).
-- - Home Cleaning becomes per_hour pricing (hours x hourly_rate); the
--   home-size (Studio/1BR/2BR/3BR) step is dropped from the booking flow.
--   hourly_rate is seeded as a clearly-marked PLACEHOLDER (P399/hr) --
--   flag for the operator to confirm before launch, not a final price.
-- - Aircon stays per_unit, price unchanged (P600/unit); duration is derived
--   from estimated_minutes_per_unit so it produces a span too.
--
-- Idempotent: safe to run this whole file again.

-- ---------------------------------------------------------------------
-- Constants — single source of truth, same pattern as
-- unpaid_booking_expiry_minutes() (*_unpaid_booking_expiry.sql). Unlike
-- that function, the client needs these to render the hour grid and the
-- hours stepper, so (below) they get an explicit grant to `authenticated`
-- instead of being locked to internal/trigger-only use.
create or replace function public.business_open_hour()
returns integer
language sql
immutable
set search_path = public
as $$ select 9 $$;

create or replace function public.business_close_hour()
returns integer
language sql
immutable
set search_path = public
as $$ select 21 $$;

create or replace function public.buffer_minutes()
returns integer
language sql
immutable
set search_path = public
as $$ select 30 $$;

create or replace function public.min_booking_hours()
returns integer
language sql
immutable
set search_path = public
as $$ select 2 $$;

revoke all on function public.business_open_hour() from public, anon, authenticated;
revoke all on function public.business_close_hour() from public, anon, authenticated;
revoke all on function public.buffer_minutes() from public, anon, authenticated;
revoke all on function public.min_booking_hours() from public, anon, authenticated;

grant execute on function public.business_open_hour() to authenticated;
grant execute on function public.business_close_hour() to authenticated;
grant execute on function public.buffer_minutes() to authenticated;
grant execute on function public.min_booking_hours() to authenticated;

-- ---------------------------------------------------------------------
-- services: how a service's price/duration is derived.
do $$ begin
  create type public.pricing_model as enum ('per_hour', 'per_unit');
exception when duplicate_object then null;
end $$;

alter table public.services add column if not exists pricing_model public.pricing_model not null default 'per_unit';
alter table public.services add column if not exists hourly_rate integer;
alter table public.services add column if not exists estimated_minutes_per_unit integer not null default 45;

-- Backfill: Home Cleaning moves to per_hour with a placeholder rate;
-- Aircon stays per_unit (45 min/unit already matches its current design
-- copy — see src/data.ts SERVICES.aircon.duration).
update public.services set pricing_model = 'per_hour', hourly_rate = 399 where id = 'cleaning';
update public.services set pricing_model = 'per_unit', estimated_minutes_per_unit = 45 where id = 'aircon';

do $$ begin
  alter table public.services add constraint services_hourly_rate_check
    check (pricing_model <> 'per_hour' or hourly_rate is not null) not valid;
exception when duplicate_object then null;
end $$;
alter table public.services validate constraint services_hourly_rate_check;

-- ---------------------------------------------------------------------
-- partners: own working-hours window (separate from available_days, which
-- already controls which weekdays a partner works).
alter table public.partners add column if not exists available_start_hour integer not null default 9;
alter table public.partners add column if not exists available_end_hour integer not null default 21;

-- ---------------------------------------------------------------------
-- bookings: the span (start_hour + duration_hours) that replaces the old
-- opaque "time" text for every scheduling/availability computation. `time`
-- itself stays for now (existing rows keep it for reference) but is no
-- longer required going forward -- src/lib/bookings.ts stops writing it.
alter table public.bookings alter column time drop not null;

do $$ begin
  create type public.assignment_source as enum ('auto', 'manual', 'fcfs');
exception when duplicate_object then null;
end $$;

alter table public.bookings add column if not exists start_hour integer;
alter table public.bookings add column if not exists duration_hours integer;
alter table public.bookings add column if not exists assignment_source public.assignment_source not null default 'auto';

-- Backfill start_hour from the legacy "10:00 AM" style time text.
update public.bookings
set start_hour = (
  case
    when time ~* 'AM' then (case when split_part(time, ':', 1)::int = 12 then 0 else split_part(time, ':', 1)::int end)
    else (case when split_part(time, ':', 1)::int = 12 then 12 else split_part(time, ':', 1)::int + 12 end)
  end
)
where start_hour is null and time is not null;

-- Backfill duration_hours: per_hour services get the flat 1hr placeholder
-- (BUILD_PLAN.md Phase 4 ticket 1 — these are historical rows, not new
-- bookings going through the real per_hour flow); per_unit services derive
-- it from units x estimated_minutes_per_unit, same formula the new booking
-- flow uses going forward.
update public.bookings b
set duration_hours = 1
from public.services s
where b.service_id = s.id and s.pricing_model = 'per_hour' and b.duration_hours is null;

update public.bookings b
set duration_hours = greatest(1, ceil((coalesce(b.units, 1) * s.estimated_minutes_per_unit) / 60.0))::int
from public.services s
where b.service_id = s.id and s.pricing_model = 'per_unit' and b.duration_hours is null;

-- Existing assigned/completed bookings were dispatched by hand under the
-- old model -- backfill as 'manual' rather than 'auto' (which now means
-- "the soft-hold engine picked this worker").
update public.bookings set assignment_source = 'manual' where partner_id is not null;

alter table public.bookings alter column start_hour set not null;
alter table public.bookings alter column duration_hours set not null;

do $$ begin
  alter table public.bookings add constraint bookings_start_hour_check
    check (start_hour >= 0 and start_hour < 24) not valid;
exception when duplicate_object then null;
end $$;
alter table public.bookings validate constraint bookings_start_hour_check;

do $$ begin
  alter table public.bookings add constraint bookings_duration_hours_check
    check (duration_hours >= 1) not valid;
exception when duplicate_object then null;
end $$;
alter table public.bookings validate constraint bookings_duration_hours_check;
