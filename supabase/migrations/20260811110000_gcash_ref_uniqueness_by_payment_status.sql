-- MaidItEasy — Phase 14 ticket 2: reference uniqueness keys off payment
-- status, not booking status
--
-- enforce_gcash_ref_uniqueness()/gcash_ref_in_use() (*_gcash_payment_
-- integrity.sql) excluded cancelled bookings so a reference from an
-- auto-cancelled "expired-unpaid" booking could be reused — that made sense
-- only because expire_stale_unpaid_bookings() existed to produce those
-- auto-cancelled rows. Ticket 1 removed that mechanism entirely, so the
-- exclusion is now the wrong rule for what's left: a booking can still be
-- cancelled today (admin cancel, customer self-cancel) while its GCash
-- reference is verified or still awaiting verification — real or pending
-- money — and `b.status <> 'cancelled'` would incorrectly free that
-- reference for reuse the moment the booking is cancelled.
--
-- Decision (final, do not re-ask, BUILD_PLAN.md Phase 14): a reference on
-- any NON-REJECTED payment (verified or awaiting) is permanently in use,
-- regardless of what happens to the booking afterward. A REJECTED payment
-- frees its reference for reuse — it was never a confirmed payment, and the
-- admin's human review is what catches genuine fraud/reuse attempts anyway.
--
-- Idempotent: safe to run this whole file again.

create or replace function public.enforce_gcash_ref_uniqueness()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.method = 'gcash' and new.gcash_ref is not null then
    if exists (
      select 1
      from public.payments p
      where p.method = 'gcash'
        and p.gcash_ref = new.gcash_ref
        and p.id <> new.id
        and p.status <> 'rejected'
    ) then
      raise exception 'This GCash reference number has already been used for another booking.';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.gcash_ref_in_use(p_gcash_ref text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.payments p
    where p.method = 'gcash'
      and p.gcash_ref = p_gcash_ref
      and p.status <> 'rejected'
  );
$$;

revoke all on function public.gcash_ref_in_use(text) from public, anon;
grant execute on function public.gcash_ref_in_use(text) to authenticated;
