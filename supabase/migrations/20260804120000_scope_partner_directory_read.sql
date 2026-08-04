-- MaidItEasy — scope the partner-directory read (KNOWN_ISSUES.md, Security &
-- privacy #1, P0). partners_authenticated_read (init_schema migration)
-- granted SELECT on the entire partners table -- every column, every row --
-- to any session where auth.role() = 'authenticated'. Since the customer
-- app's phone-OTP is a stub that calls signInAnonymously() (src/lib/auth.ts),
-- any customer who logs in gets a session that satisfies that check, and the
-- table is reachable directly over Supabase's REST endpoint with the public
-- anon key already embedded in the app bundle -- bypassing the app's own
-- narrow queries entirely and exposing every worker's contact/barangay/email.
--
-- Replaces it with two row-scoped policies covering the only two real
-- client-side callers of this table:
--   - a partner reading their own row (src/lib/partnerAuth.ts, login +
--     must_change_password gate)
--   - a customer reading the partner assigned to one of their own bookings
--     (src/lib/bookings.ts's useBookingTracking, the only customer-facing
--     read of this table)
-- The admin roster/dispatch (admin/src/lib/data.ts) needs no new policy --
-- it's already fully covered by the existing partners_admin_write policy
-- ("for all", gated on admins-table membership). Verified live: an
-- admin session's `select * from partners` still returns every row.
--
-- The customer-side check can't be a plain "exists (select 1 from bookings
-- where ...)" inline in the policy -- public.bookings has its own RLS
-- (bookings_partner_own_read) that in turn checks public.partners, so a
-- policy on partners that directly queries bookings creates a policy cycle
-- between the two tables ("infinite recursion detected in policy for
-- relation "partners"", confirmed live). partner_serves_customer() is a
-- SECURITY DEFINER helper (same pattern as qualified_free_partners() etc. in
-- *_hourly_booking_capacity.sql) that bypasses RLS internally to break that
-- cycle; it only ever returns a boolean, never rows, so exposing it to
-- `authenticated` via RPC doesn't widen access beyond "is this partner on
-- one of my own bookings".
--
-- Idempotent: safe to run this whole file again.

create or replace function public.partner_serves_customer(p_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bookings b
    where b.partner_id = p_partner_id
      and b.customer_id = auth.uid()
  );
$$;

revoke all on function public.partner_serves_customer(uuid) from public, anon;
grant execute on function public.partner_serves_customer(uuid) to authenticated;

drop policy if exists "partners_authenticated_read" on public.partners;

create policy "partners_self_read" on public.partners for select using (
  auth_user_id = auth.uid()
);

create policy "partners_booking_customer_read" on public.partners for select using (
  public.partner_serves_customer(partners.id)
);
