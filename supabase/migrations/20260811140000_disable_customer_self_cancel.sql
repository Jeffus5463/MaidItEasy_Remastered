-- MaidItEasy — Phase 15: disable customer self-cancellation
--
-- Cancellation is now admin-only; a customer who wants to cancel is routed
-- to SupportBlock ("Call us") instead of app/tracking.tsx's (now removed)
-- self-cancel action. cancel_booking_customer() itself, the
-- refund_needed/refunded_at ledger, and admin_cancel_booking() all stay
-- fully intact — this migration only removes the client's ability to call
-- the customer-cancel RPC directly, as defense-in-depth on top of removing
-- the UI entry point. admin_cancel_booking()'s own grant is untouched, so
-- the admin /refunds flow is unaffected.
--
-- Reversible: re-grant execute to re-enable self-cancel without touching
-- any other part of the schema.
--
-- Idempotent: safe to run this whole file again.

revoke execute on function public.cancel_booking_customer(uuid) from authenticated;
