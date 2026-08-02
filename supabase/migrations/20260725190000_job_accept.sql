-- MaidItEasy — track when a partner actually accepts an assigned job (bug fix)
--
-- Previously "Accept" on the job-detail screen wrote nothing — status stayed
-- 'assigned' whether or not the partner had opened the job and accepted it.
-- That meant the dashboard's schedule list (which links every assigned job
-- straight to the active-job screen) let a partner skip the Accept screen
-- entirely and jump directly to "On my way" (en_route) on a job they'd never
-- looked at. accepted_at is set by acceptJob() (src/lib/partner.ts) when the
-- partner presses Accept, and both the dashboard schedule list and the
-- active-job screen now gate on it.
--
-- Idempotent: safe to run this whole file again.

alter table public.bookings add column if not exists accepted_at timestamptz;
