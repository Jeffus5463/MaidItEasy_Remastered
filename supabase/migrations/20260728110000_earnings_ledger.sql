-- MaidItEasy — partner earnings / payout ledger (Phase 2.9)
--
-- KNOWN_ISSUES.md #3: commission (job fee x rate) was computed inline for
-- display only, never stored — no record of what a worker has earned or
-- been paid, no payout history to reconcile against. This adds a
-- persistent, one-row-per-completed-job ledger.
--
-- job_fee, commission_rate, and commission_amount are snapshotted at
-- completion time by a trigger (not recomputed later), so a future change
-- to the commission rate doesn't rewrite history for jobs already done.
--
-- Idempotent: safe to run this whole file again.

-- Single source of truth for the rate snapshotted onto new earnings rows.
-- Keep this in sync with COMMISSION_RATE in src/data.ts (pure commission,
-- decisions-log.md #8). Intentionally NOT the per-partner
-- partners.commission_rate column — the app doesn't use that column for
-- this calculation today (see app/(partner)/job.tsx, completed.tsx), so
-- snapshotting it here would silently start being wrong for anyone whose
-- column value differs from the flat rate everyone is actually paid.
create or replace function public.current_commission_rate()
returns numeric
language sql
immutable
as $$ select 0.20 $$;

revoke all on function public.current_commission_rate() from public, anon, authenticated;

create table if not exists public.earnings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  partner_id uuid not null references public.partners (id),
  job_fee integer not null,
  commission_rate numeric(4, 3) not null,
  commission_amount integer not null,
  earned_at timestamptz not null default now(),
  paid_at timestamptz,
  payout_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists earnings_partner_id_idx on public.earnings (partner_id);
create index if not exists earnings_payout_id_idx on public.earnings (payout_id);

alter table public.earnings enable row level security;

-- A partner reads only their own earnings rows.
drop policy if exists "earnings_partner_own_read" on public.earnings;
create policy "earnings_partner_own_read" on public.earnings for select using (
  exists (
    select 1 from public.partners p
    where p.id = earnings.partner_id and p.auth_user_id = auth.uid()
  )
);

-- Admin: full access (payout recording updates paid_at/payout_id), same
-- admins-table-membership pattern as bookings_admin_all etc.
drop policy if exists "earnings_admin_all" on public.earnings;
create policy "earnings_admin_all" on public.earnings for all using (
  exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
);

-- Writes the earnings row the instant a job is marked completed — a DB
-- trigger rather than a second client-side insert (from
-- src/lib/partner.ts#completeJob) so it can't be missed, e.g. by the app
-- losing connectivity between the status update and a separate insert.
create or replace function public.record_job_earnings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' and new.partner_id is not null then
    insert into public.earnings (booking_id, partner_id, job_fee, commission_rate, commission_amount)
    values (
      new.id,
      new.partner_id,
      new.total,
      public.current_commission_rate(),
      round(new.total * public.current_commission_rate())::integer
    )
    on conflict (booking_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_record_earnings on public.bookings;
create trigger bookings_record_earnings
after update on public.bookings
for each row execute function public.record_job_earnings();

-- Backfill: preserve history for bookings already completed before this
-- migration ran. earned_at is approximated from the booking's created_at
-- since bookings has no completed_at timestamp to use instead.
insert into public.earnings (booking_id, partner_id, job_fee, commission_rate, commission_amount, earned_at)
select
  b.id,
  b.partner_id,
  b.total,
  public.current_commission_rate(),
  round(b.total * public.current_commission_rate())::integer,
  b.created_at
from public.bookings b
where b.status = 'completed' and b.partner_id is not null
on conflict (booking_id) do nothing;
