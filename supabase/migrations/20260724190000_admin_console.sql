-- MaidItEasy — admin console (Phase 4)
-- New columns for the worker roster + service catalog, plus permissive RLS
-- policies so the admin app (anon-signed-in, no real admin auth yet) can
-- read/write across all customers' bookings & payments and manage
-- partners/services. Same "authenticated role, not user-scoped"
-- simplification already used for the partner app; tighten once real admin
-- auth exists.
--
-- Idempotent: safe to run this whole file again.

alter table public.services add column if not exists active boolean not null default true;

alter table public.partners add column if not exists barangay text;
alter table public.partners add column if not exists contact text;
alter table public.partners add column if not exists nbi_verified boolean not null default false;
alter table public.partners add column if not exists agreement_verified boolean not null default true;
alter table public.partners add column if not exists available_days text[] not null default '{}';

-- Backfill the seeded partner so the roster shows a fully-verified row.
update public.partners
set nbi_verified = true, available_days = array['Mon','Tue','Wed','Thu','Fri','Sat']
where id = '00000000-0000-0000-0000-000000000001' and available_days = '{}';

-- bookings: admin reads/updates everything (assign partner_id, change status).
drop policy if exists "bookings_admin_all" on public.bookings;
create policy "bookings_admin_all" on public.bookings for all using (
  auth.role() = 'authenticated'
) with check (
  auth.role() = 'authenticated'
);

-- payments: admin reads/updates everything (verify GCash payments).
drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all" on public.payments for all using (
  auth.role() = 'authenticated'
) with check (
  auth.role() = 'authenticated'
);

-- services: admin can edit price/duration/active + add new services.
drop policy if exists "services_admin_write" on public.services;
create policy "services_admin_write" on public.services for all using (
  auth.role() = 'authenticated'
) with check (
  auth.role() = 'authenticated'
);

-- partners: admin can add workers, edit vetting/days/commission/active.
drop policy if exists "partners_admin_write" on public.partners;
create policy "partners_admin_write" on public.partners for all using (
  auth.role() = 'authenticated'
) with check (
  auth.role() = 'authenticated'
);
