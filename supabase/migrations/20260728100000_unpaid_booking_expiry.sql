-- MaidItEasy — unpaid-booking expiry: capacity exclusion + stale cleanup (Phase 2.9)
--
-- KNOWN_ISSUES.md #2: a GCash booking nobody pays for (or whose payment gets
-- rejected) held its slot forever, blocking real customers until an admin
-- noticed and cancelled it by hand. Decision: 30-minute expiry window, kept
-- as a single configurable constant below. Cash-at-office bookings are
-- exempt — they're settled offline and may legitimately sit pending for a
-- day; the admin cancels those manually.
--
-- Primary mechanism = lazy exclusion: redefine slot_demand_count /
-- slot_demand_by_time (see *_slot_capacity.sql) so a slot's demand no
-- longer counts a GCash booking whose payment is still 'awaiting_payment'
-- and older than the window, nor any booking whose payment was 'rejected'.
-- bookings_capacity_guard (see *_booking_capacity_guard.sql) calls
-- slot_demand_count internally, and src/lib/availability.ts /
-- src/lib/bookings.ts#createBooking call these same RPCs — so every caller
-- picks up the exclusion automatically, no client changes needed. The seat
-- frees the instant a booking goes stale, without depending on the cron job
-- below ever running.
--
-- Secondary cleanup: a pg_cron job (confirmed available via
-- list_extensions in this Supabase project) runs every minute and flips
-- genuinely stale unpaid bookings to 'cancelled' so they don't linger as
-- "pending" on the admin board. Wrapped defensively — if pg_cron can't be
-- enabled here (permissions/plan vary by project), this file no-ops on
-- that part instead of failing the whole migration; the lazy exclusion
-- above is the real backstop and keeps working on its own either way.
--
-- Idempotent: safe to run this whole file again.

-- Single source of truth for the expiry window — change this one function
-- to adjust it everywhere it's used.
create or replace function public.unpaid_booking_expiry_minutes()
returns integer
language sql
immutable
as $$ select 30 $$;

revoke all on function public.unpaid_booking_expiry_minutes() from public, anon, authenticated;

-- Set by expire_stale_unpaid_bookings() below; read by the customer app to
-- show a clear "expired" message instead of a generic "cancelled" one.
alter table public.bookings add column if not exists cancel_reason text;

create or replace function public.slot_demand_count(p_service_id text, p_date date, p_time text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.bookings b
  left join public.payments pay on pay.booking_id = b.id
  where b.service_id = p_service_id
    and b.date = p_date
    and b.time = p_time
    and b.status not in ('completed', 'cancelled')
    and (pay.status is null or pay.status <> 'rejected')
    and not (
      pay.method = 'gcash'
      and pay.status = 'awaiting_payment'
      and pay.created_at < now() - (public.unpaid_booking_expiry_minutes()::text || ' minutes')::interval
    )
$$;

create or replace function public.slot_demand_by_time(p_service_id text, p_date date)
returns table (slot_time text, demand integer)
language sql
stable
security definer
set search_path = public
as $$
  select b.time as slot_time, count(*)::int as demand
  from public.bookings b
  left join public.payments pay on pay.booking_id = b.id
  where b.service_id = p_service_id
    and b.date = p_date
    and b.status not in ('completed', 'cancelled')
    and (pay.status is null or pay.status <> 'rejected')
    and not (
      pay.method = 'gcash'
      and pay.status = 'awaiting_payment'
      and pay.created_at < now() - (public.unpaid_booking_expiry_minutes()::text || ' minutes')::interval
    )
  group by b.time
$$;

revoke all on function public.slot_demand_count(text, date, text) from public, anon, authenticated;
revoke all on function public.slot_demand_by_time(text, date) from public, anon, authenticated;
grant execute on function public.slot_demand_count(text, date, text) to authenticated;
grant execute on function public.slot_demand_by_time(text, date) to authenticated;

-- Secondary cleanup: flip stale unpaid bookings to cancelled so the admin
-- board doesn't show them as live 'pending' work. SECURITY DEFINER + no
-- grants — only ever invoked by the pg_cron job below, never by a client.
create or replace function public.expire_stale_unpaid_bookings()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings b
  set status = 'cancelled', cancel_reason = 'expired-unpaid'
  from public.payments pay
  where pay.booking_id = b.id
    and b.status not in ('completed', 'cancelled')
    and pay.method = 'gcash'
    and pay.status = 'awaiting_payment'
    and pay.created_at < now() - (public.unpaid_booking_expiry_minutes()::text || ' minutes')::interval;
end;
$$;

revoke all on function public.expire_stale_unpaid_bookings() from public, anon, authenticated;

do $$
begin
  execute 'create extension if not exists pg_cron';
exception when others then
  raise notice 'pg_cron could not be enabled in this project (%). Skipping the scheduled stale-unpaid cleanup — the lazy exclusion in slot_demand_count/slot_demand_by_time is the real backstop and still works without it. Enable pg_cron via Database -> Extensions in the Supabase dashboard to add the extra housekeeping.', sqlerrm;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'expire-stale-unpaid-bookings',
      '* * * * *',
      $cron$select public.expire_stale_unpaid_bookings();$cron$
    );
  end if;
end $$;
