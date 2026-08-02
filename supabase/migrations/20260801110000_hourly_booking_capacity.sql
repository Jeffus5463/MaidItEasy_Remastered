-- MaidItEasy — span-based soft-hold capacity engine (Phase 4, ticket 2)
--
-- Replaces the Phase 2.7 anonymous per-slot capacity model
-- (*_slot_capacity.sql, *_booking_capacity_guard.sql) with per-worker
-- timelines: a slot is available only if at least one qualified worker is
-- free for the WHOLE span (start_hour -> start_hour+duration_hours) plus a
-- trailing buffer_minutes(), across ALL of that worker's bookings that day
-- -- not just the same service -- so a worker busy on cleaning is
-- correctly unavailable for aircon in the same window. Resolves
-- KNOWN_ISSUES.md Genuine-logic #1.
--
-- "Assignment stays manual" (BUILD_PLAN.md Phase 4): setting a booking's
-- partner_id here is only a SOFT HOLD on that worker's timeline, not a
-- dispatch -- status stays 'pending' either way. The admin's confirm/
-- override in AssignModal (which flips status to 'assigned') is still the
-- real assignment; the hold just means AssignModal opens pre-selected on
-- whoever the engine already reserved, and no two customers can ever grab
-- the same worker's time before a dispatcher acts. `assignment_source`
-- records how the CURRENT partner_id got there (auto hold vs manual
-- admin pick) so a later auto/FCFS mode can promote a hold straight to a
-- dispatch without a schema change.
--
-- SECURITY DEFINER throughout, same reasoning as *_slot_capacity.sql: a
-- customer session must not read other customers' bookings or the full
-- partner directory in bulk to know whether a slot is free, but does need
-- an aggregate answer. qualified_free_partners() itself returns full
-- partner rows and stays ungranted/internal-only -- called only from the
-- functions below and the trigger, which execute as the function owner
-- regardless of the calling role's own grants (same as
-- enforce_booking_capacity() already calling the old capacity functions
-- with zero grants of its own). Only the boolean/table wrappers are
-- granted to `authenticated`.
--
-- Idempotent: safe to run this whole file again.

-- ---------------------------------------------------------------------
-- Every qualified worker free for [start_hour, start_hour+duration_hours)
-- + a trailing buffer on p_date, for p_service_id. Ordered least-loaded
-- first (fewest of that worker's own non-terminal bookings that day) --
-- callers that want "the" least-loaded free worker take the first row.
-- p_exclude_booking_id excludes one booking's own existing row from the
-- busy-conflict check (needed when re-validating/re-holding a booking that
-- already occupies part of the timeline being checked).
create or replace function public.qualified_free_partners(
  p_service_id text,
  p_date date,
  p_start_hour integer,
  p_duration_hours integer,
  p_exclude_booking_id uuid default null
)
returns setof public.partners
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.partners p
  where p.active
    and p.verified
    and p_service_id = any(p.service_tags)
    and (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from p_date)::int + 1] = any(p.available_days)
    and p_start_hour >= p.available_start_hour
    and (p_start_hour + p_duration_hours) <= p.available_end_hour
    and not exists (
      select 1
      from public.bookings b
      left join public.payments pay on pay.booking_id = b.id
      where b.partner_id = p.id
        and b.date = p_date
        and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
        and b.status not in ('completed', 'cancelled')
        and (pay.status is null or pay.status <> 'rejected')
        and not (
          pay.method = 'gcash'
          and pay.status = 'awaiting_payment'
          and pay.created_at < now() - (public.unpaid_booking_expiry_minutes()::text || ' minutes')::interval
        )
        -- interval overlap: [existing_start, existing_end+buffer) vs [new_start, new_end+buffer)
        and (p_date + (p_start_hour || ' hours')::interval)
          < (p_date + (b.start_hour || ' hours')::interval + (b.duration_hours || ' hours')::interval + (public.buffer_minutes() || ' minutes')::interval)
        and (p_date + (b.start_hour || ' hours')::interval)
          < (p_date + (p_start_hour || ' hours')::interval + (p_duration_hours || ' hours')::interval + (public.buffer_minutes() || ' minutes')::interval)
    )
  order by (
    select count(*) from public.bookings bb
    where bb.partner_id = p.id and bb.date = p_date and bb.status not in ('completed', 'cancelled')
  ) asc, p.id asc
$$;

revoke all on function public.qualified_free_partners(text, date, integer, integer, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
create or replace function public.has_free_qualified_partner(
  p_service_id text, p_date date, p_start_hour integer, p_duration_hours integer, p_exclude_booking_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.qualified_free_partners(p_service_id, p_date, p_start_hour, p_duration_hours, p_exclude_booking_id)
  )
$$;

revoke all on function public.has_free_qualified_partner(text, date, integer, integer, uuid) from public, anon, authenticated;
grant execute on function public.has_free_qualified_partner(text, date, integer, integer, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Drives the customer-facing hour grid: every start hour in business
-- hours, with `available` true only if it both fits before close (with
-- duration + buffer) and has a free qualified worker.
create or replace function public.available_start_hours(p_service_id text, p_date date, p_duration_hours integer)
returns table (start_hour integer, available boolean)
language sql
stable
security definer
set search_path = public
as $$
  select h.start_hour,
    (h.start_hour * 60 + p_duration_hours * 60 + public.buffer_minutes() <= public.business_close_hour() * 60)
    and public.has_free_qualified_partner(p_service_id, p_date, h.start_hour, p_duration_hours)
  from generate_series(public.business_open_hour(), public.business_close_hour() - 1) as h(start_hour)
$$;

revoke all on function public.available_start_hours(text, date, integer) from public, anon, authenticated;
grant execute on function public.available_start_hours(text, date, integer) to authenticated;

-- ---------------------------------------------------------------------
-- Releases a job's current partner and re-runs the soft-hold against the
-- next qualified free worker, explicitly excluding the one just released
-- (otherwise the engine would just pick them right back). Always leaves
-- status = 'pending' -- a re-hold is not a dispatch, same as the initial
-- booking-time hold; the admin still confirms via AssignModal. Returns the
-- new partner id, or null if nobody is free -- that's the needs-attention
-- case surfaced on the admin board (KNOWN_ISSUES #4).
--
-- Callable directly by clients (declineJob, useUnassignBooking), so unlike
-- the trigger-only functions in this project it needs its own
-- authorization check: only the currently-assigned partner (declining
-- their own job) or an admin may call it for a given booking.
create or replace function public.release_and_rehold(p_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_released_partner uuid;
  v_next_partner uuid;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found.';
  end if;

  if not (
    exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
    or exists (select 1 from public.partners p where p.id = v_booking.partner_id and p.auth_user_id = auth.uid())
  ) then
    raise exception 'Not authorized.';
  end if;

  v_released_partner := v_booking.partner_id;
  perform pg_advisory_xact_lock(hashtextextended(v_booking.date::text, 0));

  select qp.id into v_next_partner
  from public.qualified_free_partners(v_booking.service_id, v_booking.date, v_booking.start_hour, v_booking.duration_hours, p_booking_id) qp
  where qp.id is distinct from v_released_partner
  limit 1;

  update public.bookings
  set partner_id = v_next_partner,
      status = 'pending',
      assignment_source = 'auto',
      accepted_at = null
  where id = p_booking_id;

  return v_next_partner;
end;
$$;

revoke all on function public.release_and_rehold(uuid) from public, anon, authenticated;
grant execute on function public.release_and_rehold(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- The real backstop: takes an advisory lock over the booking's date (a
-- worker's timeline spans every service that day, so locking narrower
-- than "this date" could let two concurrent inserts both grab the same
-- worker across different services), derives/validates duration_hours
-- server-side so a client can't lie about it, and sets/re-verifies the
-- soft-hold atomically inside the lock.
create or replace function public.enforce_booking_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services%rowtype;
  v_candidate uuid;
  v_committing boolean;
begin
  if new.status in ('completed', 'cancelled') then
    return new;
  end if;

  select * into v_service from public.services where id = new.service_id;
  if not found then
    raise exception 'Unknown service.';
  end if;

  -- Duration is derived for per_unit services (units x
  -- estimated_minutes_per_unit) -- always recompute server-side rather
  -- than trusting the client, same defensive posture as partner_id below.
  -- For per_hour services it's the customer's own choice, so validate
  -- instead of overriding it.
  if v_service.pricing_model = 'per_unit' then
    new.duration_hours := greatest(1, ceil((coalesce(new.units, 1) * v_service.estimated_minutes_per_unit) / 60.0))::int;
  else
    if new.duration_hours < public.min_booking_hours() then
      raise exception 'Minimum booking length is % hours.', public.min_booking_hours();
    end if;
  end if;

  if new.start_hour < public.business_open_hour()
    or (new.start_hour * 60 + new.duration_hours * 60 + public.buffer_minutes()) > public.business_close_hour() * 60
  then
    raise exception 'That start time does not fit in business hours.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.date::text, 0));

  v_candidate := new.partner_id;
  if v_candidate is not null then
    if not exists (
      select 1 from public.qualified_free_partners(new.service_id, new.date, new.start_hour, new.duration_hours, new.id) qp
      where qp.id = v_candidate
    ) then
      v_candidate := null;
    end if;
  end if;

  if TG_OP = 'INSERT' then
    if v_candidate is null then
      select qp.id into v_candidate
      from public.qualified_free_partners(new.service_id, new.date, new.start_hour, new.duration_hours, new.id) qp
      limit 1;
    end if;
    if v_candidate is null then
      raise exception 'That time just filled up — please pick another time.';
    end if;
    new.partner_id := v_candidate;
    new.assignment_source := coalesce(new.assignment_source, 'auto');
  elsif TG_OP = 'UPDATE' then
    -- Only re-verify feasibility when a hold is being committed/moved:
    -- the partner_id changed (override or re-hold), or the booking is
    -- leaving 'pending' (the admin's confirm click). Routine status-only
    -- progression by the assigned partner (en_route/in_progress/
    -- completed) leaves partner_id and old.status='pending' both
    -- unchanged by then, so it's skipped -- an already-dispatched job
    -- must never be blocked by a re-check of current qualification.
    v_committing := new.partner_id is not null and (
      new.partner_id is distinct from old.partner_id
      or (old.status = 'pending' and new.status <> 'pending')
    );
    if v_committing and (v_candidate is null or v_candidate <> new.partner_id) then
      raise exception 'That worker is no longer free for this time.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_capacity_guard on public.bookings;
create trigger bookings_capacity_guard
before insert or update on public.bookings
for each row execute function public.enforce_booking_capacity();

revoke all on function public.enforce_booking_capacity() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Superseded by the span-based functions above -- nothing calls these
-- once src/lib/availability.ts and createBooking() move to
-- available_start_hours()/the trigger (BUILD_PLAN.md Phase 4 ticket 3).
drop function if exists public.eligible_partner_count(text, date);
drop function if exists public.slot_demand_count(text, date, text);
drop function if exists public.slot_demand_by_time(text, date);
