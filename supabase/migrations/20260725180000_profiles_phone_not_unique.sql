-- MaidItEasy — drop the unique constraint on profiles.phone (bug fix)
--
-- Customer identity is keyed by profiles.id (the Supabase auth user), not by
-- phone — phone is just contact info snapshotted at sign-in (see
-- src/lib/auth.ts#signInWithPhone). Because the customer OTP flow is still a
-- stub (any 6-digit code succeeds via signInAnonymously()), a returning
-- customer whose device lost its persisted session — reinstall, cleared
-- storage, new device, or a fresh anonymous session for any other reason —
-- gets a brand-new auth user on their next login. The upsert then tried to
-- INSERT a new profiles row with the same phone number as their original
-- row, which hit this unique constraint and threw, permanently blocking
-- that phone number from ever logging in again ("Could not verify" on the
-- OTP screen). Nothing else in the app queries profiles by phone, so the
-- constraint wasn't protecting anything.
--
-- Idempotent: safe to run this whole file again.

alter table public.profiles drop constraint if exists profiles_phone_key;
