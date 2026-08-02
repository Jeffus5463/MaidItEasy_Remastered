-- MaidItEasy — admin cancel booking (Phase 2.6)
-- refund_needed just flags a booking for a human to refund manually — no
-- automatic refund is ever attempted. Set true only when the linked
-- payment was already 'verified' at cancel time.
--
-- Idempotent: safe to run this whole file again.

alter table public.bookings add column if not exists refund_needed boolean not null default false;
