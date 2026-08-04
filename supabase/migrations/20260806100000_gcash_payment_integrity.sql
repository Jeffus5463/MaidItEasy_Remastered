-- MaidItEasy — GCash reference-number integrity (KNOWN_ISSUES.md, Finance &
-- payouts #2, P1). payments.gcash_ref had no uniqueness constraint anywhere,
-- and createBooking() inserted it straight from the client with zero
-- server-side re-check -- unlike duration_hours/total, which already have
-- trigger-enforced backstops. The admin's /gcash page had nothing but the
-- typed reference number to verify against -- no screenshot proof.
--
-- Decisions (final, do not re-ask): hard-block booking creation when a
-- reference is already in use; require a payment screenshot for every
-- GCash booking.
--
-- Idempotent: safe to run this whole file again.

alter table public.payments add column if not exists proof_path text;

-- Row-local invariant -- a CHECK constraint, not a trigger, since it needs
-- no cross-table join. Cash rows (gcash_ref/proof_path both null) pass via
-- the "method <> 'gcash'" short-circuit. NOT VALID: pre-existing gcash rows
-- from before this migration have no proof_path (there was nowhere to
-- upload one yet) and would otherwise fail a full validation scan on apply.
-- NOT VALID still fully enforces the check on every new insert/update going
-- forward -- it only skips retroactively validating rows that already
-- existed. Deliberately never run VALIDATE CONSTRAINT on this one; that
-- would fail against that same pre-existing data.
alter table public.payments drop constraint if exists payments_gcash_requires_proof;
alter table public.payments add constraint payments_gcash_requires_proof
  check (method <> 'gcash' or (gcash_ref is not null and proof_path is not null))
  not valid;

-- Cross-table uniqueness -- must join to bookings.status to EXCLUDE
-- cancelled bookings. expire_stale_unpaid_bookings() (see
-- *_unpaid_booking_expiry.sql) only ever updates bookings.status/
-- cancel_reason and never payments.status, so an auto-cancelled booking's
-- payments row is stuck at 'awaiting_payment' with its original gcash_ref
-- forever. A plain unique index (or a check ignoring booking status) would
-- permanently lock out that reference from ever being reused, even though
-- nothing happened on the cancelled booking. Do not simplify this into a
-- plain unique constraint on gcash_ref alone.
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
      join public.bookings b on b.id = p.booking_id
      where p.method = 'gcash'
        and p.gcash_ref = new.gcash_ref
        and p.id <> new.id
        and b.status <> 'cancelled'
    ) then
      raise exception 'This GCash reference number has already been used for another booking.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_gcash_ref_uniqueness_guard on public.payments;
create trigger payments_gcash_ref_uniqueness_guard
before insert on public.payments
for each row execute function public.enforce_gcash_ref_uniqueness();

-- Friendly client pre-check -- same exclude-cancelled logic as the trigger
-- above, exposed as a boolean-only SECURITY DEFINER RPC (same pattern as
-- has_free_qualified_partner()/partner_serves_customer()) so a customer's
-- session can check before submitting without needing broad read access to
-- other customers' payments rows.
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
    join public.bookings b on b.id = p.booking_id
    where p.method = 'gcash'
      and p.gcash_ref = p_gcash_ref
      and b.status <> 'cancelled'
  );
$$;

revoke all on function public.gcash_ref_in_use(text) from public, anon;
grant execute on function public.gcash_ref_in_use(text) to authenticated;

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Path convention "<customerAuthUid>/<timestamp>.jpg" -- unlike job-photos
-- (keyed by booking id, unknown until after insert), the customer's own
-- auth.uid() is known at upload time, so ownership is a direct path check,
-- no join, no risk of the name-column-shadowing pitfall hit in Phase 2.6.
drop policy if exists "payment_proofs_bucket_owner_insert" on storage.objects;
create policy "payment_proofs_bucket_owner_insert" on storage.objects for insert with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
);

drop policy if exists "payment_proofs_bucket_owner_or_admin_read" on storage.objects;
create policy "payment_proofs_bucket_owner_or_admin_read" on storage.objects for select using (
  bucket_id = 'payment-proofs'
  and (
    (storage.foldername(storage.objects.name))[1] = auth.uid()::text
    or exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
  )
);
