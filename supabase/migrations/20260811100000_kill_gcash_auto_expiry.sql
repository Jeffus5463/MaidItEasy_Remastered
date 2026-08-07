-- MaidItEasy — Phase 14 ticket 1: kill GCash auto-expiry
--
-- Phase 10 (*_gcash_payment_integrity.sql) made a GCash reference + proof
-- screenshot mandatory AT BOOKING CREATION, so payments.status =
-- 'awaiting_payment' now means "customer already paid, admin hasn't
-- verified yet" — but the older Phase 2.9 unpaid-expiry logic
-- (*_unpaid_booking_expiry.sql) still treated that same state as "customer
-- hasn't paid yet" and both excluded it from capacity after 30 minutes AND
-- auto-cancelled it via cron, silently cancelling paying customers.
--
-- Decision (final, do not re-ask, BUILD_PLAN.md Phase 14): GCash bookings
-- are never auto-cancelled by a timer. Every GCash booking carries a
-- submitted reference + proof from creation, so there is no "unpaid GCash"
-- state left to expire — the admin verify/reject queue (/gcash) is the
-- only gate. Cash is untouched (it was never subject to this — the old
-- exclusion/cron only ever matched pay.method = 'gcash').
--
-- Idempotent: safe to run this whole file again.

-- ---------------------------------------------------------------------
-- Drop the timer entirely — nothing left for it to do once GCash is
-- exempt. cron.unschedule is wrapped defensively, same posture as the
-- original cron.schedule in *_unpaid_booking_expiry.sql: if pg_cron isn't
-- enabled in this project (or the job was never scheduled), this no-ops
-- instead of failing the migration.
do $$
begin
  perform cron.unschedule('expire-stale-unpaid-bookings');
exception when others then
  raise notice 'Could not unschedule expire-stale-unpaid-bookings (%). It may not have existed in this project — safe to ignore.', sqlerrm;
end $$;

drop function if exists public.expire_stale_unpaid_bookings();

-- ---------------------------------------------------------------------
-- qualified_free_partners(): remove the GCash-awaiting-payment timer
-- exclusion from the busy-conflict check. A GCash booking's soft-held
-- worker now stays held regardless of how long the payment has been
-- awaiting verification — only a REJECTED payment frees the seat
-- (kept below, unchanged from *_hourly_booking_capacity.sql).
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
