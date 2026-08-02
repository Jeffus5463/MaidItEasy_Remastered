-- MaidItEasy — job-photos bucket privacy (Phase 2.6)
-- Switches the before/after photo bucket from public to private. Reads now
-- go through signed URLs (src/lib/partner.ts#getJobPhotoUrl) instead of the
-- old public URL, which worked for anyone regardless of RLS.
--
-- Idempotent: safe to run this whole file again.

update storage.buckets set public = false where id = 'job-photos';

-- Read (and therefore signed-URL generation, which itself checks this
-- policy) is scoped to the assigned partner or an admin — same ownership
-- check already used by the insert/update policies from
-- *_tighten_partner_rls.sql. storage.foldername(name))[1] is the booking
-- id, since uploads are stored at "<booking_id>/<before|after>-<ts>.jpg".
drop policy if exists "job_photos_bucket_read" on storage.objects;
create policy "job_photos_bucket_read" on storage.objects for select using (
  bucket_id = 'job-photos'
  and (
    exists (
      select 1 from public.bookings b
      join public.partners p on p.id = b.partner_id
      where b.id::text = (storage.foldername(name))[1] and p.auth_user_id = auth.uid()
    )
    or exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
  )
);
