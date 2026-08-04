-- MaidItEasy — partner vetting/KYC document capture (KNOWN_ISSUES.md, Trust,
-- safety & vetting #1, P0). partners.verified/nbi_verified/agreement_verified
-- were plain booleans an admin flips with no uploaded document behind any of
-- them, no id_verified column at all (the roster hardcoded "ID" as always
-- ticked), and no expiry tracking. This migration adds real document capture
-- against the partner record.
--
-- Decisions (final, do not re-ask): admin-only upload (no partner-app
-- change); expiry is tracked only as a display-only date on nbi_clearance
-- uploads -- it never auto-flips verified/nbi_verified, the admin decides.
-- partners.verified stays the sole, independent dispatch-eligibility gate
-- (qualified_free_partners() is untouched by this migration) -- this is
-- about making the *evidence* behind that judgment real and auditable, not
-- changing how dispatch eligibility is computed.
--
-- Idempotent: safe to run this whole file again.

-- id_verified defaults true so every already-vetted worker's roster keeps
-- showing what it shows today (no regression). New workers are made to
-- start false regardless of this column default -- see
-- admin/src/app/api/partners/route.ts, which now passes id_verified: false
-- explicitly on insert.
alter table public.partners add column if not exists id_verified boolean not null default true;

create table if not exists public.partner_documents (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  doc_type text not null check (doc_type in ('id', 'nbi_clearance', 'agreement')),
  storage_path text not null,
  expires_at date,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.partner_documents enable row level security;

-- Admin-only, both directions -- no dedup constraint; a re-upload (e.g. an
-- NBI renewal) just inserts a new row, and the admin UI always reads the
-- most recent row per (partner_id, doc_type), same "append, don't overwrite"
-- spirit as job_photos.
drop policy if exists "partner_documents_admin_all" on public.partner_documents;
create policy "partner_documents_admin_all" on public.partner_documents for all using (
  exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
);

insert into storage.buckets (id, name, public)
values ('partner-documents', 'partner-documents', false)
on conflict (id) do nothing;

-- Admin-only on the bucket too. Unlike job-photos, there's no per-partner
-- path ownership check needed here (only admins ever touch this bucket), so
-- no storage.foldername() parsing -- avoids that join-shadowing pitfall
-- entirely rather than needing to dodge it.
drop policy if exists "partner_documents_bucket_admin_all" on storage.objects;
create policy "partner_documents_bucket_admin_all" on storage.objects for all using (
  bucket_id = 'partner-documents'
  and exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
) with check (
  bucket_id = 'partner-documents'
  and exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
);
