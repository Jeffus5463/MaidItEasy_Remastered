-- MaidItEasy — persist why a partner declined a job (Phase 2.5)
-- Declining clears partner_id and returns the booking to 'pending' so the
-- dispatcher can reassign it — these columns are how the admin board shows
-- *why*, instead of the job silently reappearing with no context.
--
-- Idempotent: safe to run this whole file again.

alter table public.bookings add column if not exists decline_reason text;
alter table public.bookings add column if not exists decline_note text;
