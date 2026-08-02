-- MaidItEasy — lock down the Phase 2.9 earnings functions (bug fix)
--
-- Same class of oversight as *_lock_down_capacity_functions.sql: Supabase
-- grants EXECUTE to anon/authenticated by default the moment a function is
-- created in the public schema, so "revoke ... from public" alone doesn't
-- block anon/authenticated callers — they need explicit revokes. Confirmed
-- via the security advisor after applying *_earnings_ledger.sql: anon could
-- call record_job_earnings() directly via /rest/v1/rpc/record_job_earnings,
-- and unpaid_booking_expiry_minutes()/current_commission_rate() were
-- missing `set search_path`, same hardening every other function in this
-- project already has.
--
-- record_job_earnings() is trigger-only, same as enforce_booking_capacity()
-- — it should never be directly callable.
--
-- Idempotent: safe to run this whole file again.

revoke all on function public.record_job_earnings() from public, anon, authenticated;

create or replace function public.unpaid_booking_expiry_minutes()
returns integer
language sql
immutable
set search_path = public
as $$ select 30 $$;

create or replace function public.current_commission_rate()
returns numeric
language sql
immutable
set search_path = public
as $$ select 0.20 $$;

revoke all on function public.unpaid_booking_expiry_minutes() from public, anon, authenticated;
revoke all on function public.current_commission_rate() from public, anon, authenticated;
