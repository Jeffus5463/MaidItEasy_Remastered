-- MaidItEasy — Storage bucket for before/after job photos.
-- Public read (so photos are directly servable by URL) but writes are
-- restricted to signed-in users. Same permissive-until-partner-login
-- caveat as the bookings/job_photos table policies in the init migration.
--
-- Idempotent: safe to run this whole file again.

insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', true)
on conflict (id) do nothing;

drop policy if exists "job_photos_bucket_read" on storage.objects;
create policy "job_photos_bucket_read" on storage.objects for select using (
  bucket_id = 'job-photos'
);

drop policy if exists "job_photos_bucket_insert" on storage.objects;
create policy "job_photos_bucket_insert" on storage.objects for insert with check (
  bucket_id = 'job-photos' and auth.role() = 'authenticated'
);

drop policy if exists "job_photos_bucket_update" on storage.objects;
create policy "job_photos_bucket_update" on storage.objects for update using (
  bucket_id = 'job-photos' and auth.role() = 'authenticated'
);
