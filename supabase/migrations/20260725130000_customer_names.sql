-- MaidItEasy — customer names (Phase 2.5 quick win)
-- profiles.full_name is captured once, right after first sign-in.
-- bookings.customer_name is a snapshot taken at booking-creation time from
-- the customer's profile — same pattern as the existing `contact` column
-- (captured per-booking, not joined live), so partner/admin surfaces don't
-- need broader read access to other customers' `profiles` rows.
--
-- Idempotent: safe to run this whole file again.

alter table public.profiles add column if not exists full_name text;
alter table public.bookings add column if not exists customer_name text;
