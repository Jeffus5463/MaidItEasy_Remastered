-- Tracks when a partner declined a job, so "recently declined" (admin
-- dispatcher surfacing, see CLAUDE.md -> Admin console) has genuine
-- recency instead of just "still carrying an unresolved decline flag."
-- Nullable/additive: existing declined bookings simply have no timestamp.
alter table public.bookings add column if not exists declined_at timestamptz;
