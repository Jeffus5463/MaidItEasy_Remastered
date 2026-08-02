-- MaidItEasy — GCash reject persists (Phase 2.6)
-- "Reject" used to be a toast-only, unpersisted action. Now it's a real
-- payment_status value with a reason, so a rejected payment stays visible
-- to the dispatcher instead of silently reverting to "awaiting verification".
--
-- ALTER TYPE ... ADD VALUE is safe inside Supabase's single-statement-batch
-- transaction on Postgres 12+, as long as the new value isn't used in the
-- same transaction (it isn't — this migration only adds it).
--
-- Idempotent: safe to run this whole file again.

alter type public.payment_status add value if not exists 'rejected';

alter table public.payments add column if not exists reject_reason text;
