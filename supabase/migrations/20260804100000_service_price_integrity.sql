-- MaidItEasy — service price & active-status integrity (Phase 7, Ticket 1)
--
-- createBooking() has always inserted `total` straight from the client, with
-- no server-side recomputation — unlike duration_hours, which
-- enforce_booking_capacity() already derives/validates server-side. That
-- means a stale (or tampered) client-computed total was recorded/charged
-- as-is, and a service the admin toggled `active = false` could still be
-- booked end-to-end. This redefines enforce_booking_capacity() to close
-- both holes, INSERT-only:
--   - reject the insert if the service is not active
--   - overwrite new.total with the authoritative price computed from the
--     live services row (per_unit: price × units; per_hour: hourly_rate ×
--     duration_hours)
--
-- Invariant (do not violate): price is snapshotted at booking creation.
-- This must stay INSERT-only — routine status progression (en_route,
-- in_progress, completed) and admin assign/unassign all go through UPDATE,
-- and must never re-price an already-created booking, including one still
-- `pending`/awaiting payment. That's what protects a booking already made
-- from a later price change — same snapshot-at-creation model the
-- `earnings` ledger already uses for commission.
--
-- Idempotent: safe to run this whole file again.

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

  -- Price/active integrity: INSERT-only, so an already-created booking
  -- (including a pending one still awaiting payment) is never re-priced by
  -- a later catalog edit or a routine status-only UPDATE.
  if TG_OP = 'INSERT' then
    if not v_service.active then
      raise exception 'This service is not currently available.';
    end if;
    if v_service.pricing_model = 'per_unit' then
      new.total := v_service.price * coalesce(new.units, 1);
    else
      new.total := v_service.hourly_rate * new.duration_hours;
    end if;
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

-- Trigger/grants are unchanged from *_hourly_booking_capacity.sql — redefined
-- here only for clarity that they still apply to the function above.
drop trigger if exists bookings_capacity_guard on public.bookings;
create trigger bookings_capacity_guard
before insert or update on public.bookings
for each row execute function public.enforce_booking_capacity();

revoke all on function public.enforce_booking_capacity() from public, anon, authenticated;
