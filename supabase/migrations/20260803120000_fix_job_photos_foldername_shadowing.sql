-- MaidItEasy — fix job-photos Storage RLS: column shadowing bug
--
-- job_photos_bucket_insert/update/read (from *_tighten_partner_rls.sql and
-- *_job_photos_private.sql) call storage.foldername(name) inside a
-- correlated subquery that also selects from public.partners p. Since
-- partners has its own "name" column, the unqualified "name" reference
-- resolves to partners.name (inner scope shadows the outer storage.objects
-- row) instead of the uploaded object's path — so (storage.foldername(name))[1]
-- never equals the booking id, and the WITH CHECK can never pass. Every
-- partner photo upload has been failing RLS ("new row violates row-level
-- security policy") because of this. Fix: qualify the reference as
-- storage.objects.name so it can't be shadowed.
--
-- Idempotent: safe to run this whole file again.

drop policy if exists "job_photos_bucket_insert" on storage.objects;
create policy "job_photos_bucket_insert" on storage.objects for insert with check (
  bucket_id = 'job-photos'
  and exists (
    select 1 from public.bookings b
    join public.partners p on p.id = b.partner_id
    where b.id::text = (storage.foldername(storage.objects.name))[1] and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "job_photos_bucket_update" on storage.objects;
create policy "job_photos_bucket_update" on storage.objects for update using (
  bucket_id = 'job-photos'
  and exists (
    select 1 from public.bookings b
    join public.partners p on p.id = b.partner_id
    where b.id::text = (storage.foldername(storage.objects.name))[1] and p.auth_user_id = auth.uid()
  )
);

drop policy if exists "job_photos_bucket_read" on storage.objects;
create policy "job_photos_bucket_read" on storage.objects for select using (
  bucket_id = 'job-photos'
  and (
    exists (
      select 1 from public.bookings b
      join public.partners p on p.id = b.partner_id
      where b.id::text = (storage.foldername(storage.objects.name))[1] and p.auth_user_id = auth.uid()
    )
    or exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
  )
);
