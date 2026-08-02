-- MaidItEasy — tighten partner-facing RLS now that real partner login
-- exists (Phase 2.5). Replaces the "any authenticated session" policies
-- from the init/job-photos-storage migrations with checks against the
-- caller's own partners row (partners.auth_user_id = auth.uid()).
--
-- Admin policies (bookings_admin_all, payments_admin_all,
-- services_admin_write, partners_admin_write, and partners_authenticated_read
-- which is also read by customers/partners for public partner info) are
-- intentionally left as-is — admin login doesn't exist yet.
--
-- IMPORTANT caveat: Postgres RLS policies for the same command are OR'd
-- together. bookings_admin_all still grants "for all using
-- (auth.role() = 'authenticated')" — and a signed-in partner IS an
-- authenticated session. So until the admin-login ticket replaces that
-- blanket check with real admins-table membership, a partner's login
-- technically still satisfies the admin policy too, and the scoping added
-- here isn't the sole boundary yet. This migration is still correct and
-- necessary (it's the boundary that starts applying the moment admin RLS
-- is tightened), just not sufficient alone until that lands.
--
-- Idempotent: safe to run this whole file again.

-- bookings: a partner reads/updates only bookings currently assigned to
-- them. The WITH CHECK also allows the new row to be partner_id = null +
-- status = 'pending' — that's what declineJob() writes, and it must pass
-- the check on the resulting row even though that row no longer matches
-- this partner.
drop policy if exists "bookings_partner_assigned_read" on public.bookings;
drop policy if exists "bookings_partner_own_read" on public.bookings;
create policy "bookings_partner_own_read" on public.bookings for select using (
  exists (
    select 1 from public.partners p
    where p.id = bookings.partner_id and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "bookings_partner_assigned_update" on public.bookings;
drop policy if exists "bookings_partner_own_update" on public.bookings;
create policy "bookings_partner_own_update" on public.bookings for update using (
  exists (
    select 1 from public.partners p
    where p.id = bookings.partner_id and p.auth_user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.partners p
    where p.id = bookings.partner_id and p.auth_user_id = auth.uid()
  )
  or (partner_id is null and status = 'pending')
);

-- job_photos: a partner reads/writes only photos on their own assigned
-- bookings.
drop policy if exists "job_photos_authenticated_all" on public.job_photos;
drop policy if exists "job_photos_partner_own" on public.job_photos;
create policy "job_photos_partner_own" on public.job_photos for all using (
  exists (
    select 1 from public.bookings b
    join public.partners p on p.id = b.partner_id
    where b.id = job_photos.booking_id and p.auth_user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.bookings b
    join public.partners p on p.id = b.partner_id
    where b.id = job_photos.booking_id and p.auth_user_id = auth.uid()
  )
);

-- job-photos Storage bucket: uploads/updates scoped to the assigned
-- partner. Object paths are "<booking_id>/<before|after>-<ts>.jpg" (see
-- src/lib/partner.ts#uploadJobPhoto), so the booking id is the first path
-- segment. Public read stays as-is (photos are meant to be viewable by URL).
drop policy if exists "job_photos_bucket_insert" on storage.objects;
create policy "job_photos_bucket_insert" on storage.objects for insert with check (
  bucket_id = 'job-photos'
  and exists (
    select 1 from public.bookings b
    join public.partners p on p.id = b.partner_id
    where b.id::text = (storage.foldername(name))[1] and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "job_photos_bucket_update" on storage.objects;
create policy "job_photos_bucket_update" on storage.objects for update using (
  bucket_id = 'job-photos'
  and exists (
    select 1 from public.bookings b
    join public.partners p on p.id = b.partner_id
    where b.id::text = (storage.foldername(name))[1] and p.auth_user_id = auth.uid()
  )
);
