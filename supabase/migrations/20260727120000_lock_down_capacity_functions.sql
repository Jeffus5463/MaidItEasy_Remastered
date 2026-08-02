-- MaidItEasy — lock down the Phase 2.7 slot-capacity functions (bug fix)
--
-- *_slot_capacity.sql revoked EXECUTE "from public" and granted it "to
-- authenticated", intending anon (fully unauthenticated) callers to be
-- blocked. That didn't work: Supabase applies its own default privileges
-- (ALTER DEFAULT PRIVILEGES ... GRANT EXECUTE ON FUNCTIONS TO anon,
-- authenticated, service_role) the moment a function is created in the
-- public schema — an explicit ACL entry per-role, not an inherited PUBLIC
-- grant — so "revoke ... from public" never touched it. Confirmed via
-- Supabase's security advisor after applying that migration: anon could
-- call all three RPCs. Revoking from anon explicitly (below) is the fix.
--
-- enforce_booking_capacity() (the bookings_capacity_guard trigger function)
-- has the same problem but should have no grants at all — a trigger
-- function runs via the trigger mechanism regardless of the invoking role's
-- EXECUTE privilege, so it never needed to be callable directly, and
-- leaving it publicly reachable via /rest/v1/rpc/enforce_booking_capacity
-- is needless surface area.
--
-- Idempotent: safe to run this whole file again.

revoke all on function public.eligible_partner_count(text, date) from public, anon, authenticated;
revoke all on function public.slot_demand_count(text, date, text) from public, anon, authenticated;
revoke all on function public.slot_demand_by_time(text, date) from public, anon, authenticated;
revoke all on function public.enforce_booking_capacity() from public, anon, authenticated;

grant execute on function public.eligible_partner_count(text, date) to authenticated;
grant execute on function public.slot_demand_count(text, date, text) to authenticated;
grant execute on function public.slot_demand_by_time(text, date) to authenticated;
-- enforce_booking_capacity() intentionally gets no grant — trigger-only.
