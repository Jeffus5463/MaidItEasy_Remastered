-- MaidItEasy — Phase 14 ticket 4: atomic booking + payment insert
--
-- createBooking() (src/lib/bookings.ts) has always inserted the booking then
-- the payment as two separate client-side statements. If the payment insert
-- fails (e.g. enforce_gcash_ref_uniqueness()/payments_gcash_requires_proof
-- reject it, or the network drops between the two calls), the booking row
-- is already committed — a bare 'pending' soft-hold with no linked payment
-- at all, invisible to /gcash, and still occupying a worker's timeline.
--
-- Fix: do both inserts inside one plpgsql function call. Postgres rolls
-- back everything a function invocation did if an exception propagates out
-- of it, so a payment-insert failure now takes the booking insert down with
-- it — no more orphaned bookings.
--
-- SECURITY INVOKER (the default — unlike every other RPC in this project,
-- which is SECURITY DEFINER because it needs to read/aggregate across other
-- customers' rows). This function only ever does exactly what the existing
-- bookings_insert_own/payments_insert_own RLS policies already allow a
-- signed-in customer to do directly, so there's no need for elevated
-- privilege or a manual auth check — RLS is still the enforcement boundary
-- on each statement inside it, same as before this migration.
--
-- Idempotent: safe to run this whole file again.

create or replace function public.create_booking(
  p_service_id text,
  p_units integer,
  p_start_hour integer,
  p_duration_hours integer,
  p_date date,
  p_barangay text,
  p_landmark text,
  p_contact text,
  p_latitude double precision,
  p_longitude double precision,
  p_total numeric,
  p_payment_method text,
  p_gcash_ref text,
  p_proof_path text
)
returns public.bookings
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_customer_name text;
  v_booking public.bookings;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;

  -- Snapshot the customer's name onto the booking at creation time — same
  -- pattern as `contact` (see src/lib/bookings.ts#createBooking) — so
  -- partner/admin surfaces can show it without needing broader read access
  -- to other customers' `profiles` rows. profiles_select_own already lets
  -- this invoker-rights query read the caller's own row.
  select full_name into v_customer_name from public.profiles where id = auth.uid();

  -- partner_id/duration_hours/total are intentionally omitted (or
  -- overridden) by the bookings_capacity_guard trigger — it soft-holds the
  -- actual worker and recomputes duration_hours/total server-side rather
  -- than trusting the client-computed values passed in here.
  insert into public.bookings (
    customer_id, customer_name, service_id, units, start_hour, duration_hours,
    date, barangay, landmark, contact, latitude, longitude, total
  ) values (
    auth.uid(), v_customer_name, p_service_id, p_units, p_start_hour, p_duration_hours,
    p_date, p_barangay, p_landmark, p_contact, p_latitude, p_longitude, p_total
  )
  returning * into v_booking;

  -- Cash is paid to the partner in person, so there's nothing for an admin
  -- to verify remotely the way there is for a GCash reference — auto-verify
  -- at booking time. GCash starts 'awaiting_payment' until the admin checks
  -- it against the reference number on /gcash.
  -- payments.method/status are enum columns (payment_method/payment_status)
  -- — unlike a PostgREST insert (which auto-casts a JSON string to the
  -- column's enum type), a plpgsql `insert ... values` needs an explicit
  -- cast for a typed `text` variable/expression, or it fails with "column
  -- is of type X but expression is of type text".
  insert into public.payments (booking_id, method, gcash_ref, proof_path, status)
  values (
    v_booking.id,
    p_payment_method::payment_method,
    case when p_payment_method = 'gcash' then p_gcash_ref else null end,
    case when p_payment_method = 'gcash' then p_proof_path else null end,
    (case when p_payment_method = 'cash' then 'verified' else 'awaiting_payment' end)::payment_status
  );

  return v_booking;
end;
$$;

revoke all on function public.create_booking(text, integer, integer, integer, date, text, text, text, double precision, double precision, numeric, text, text, text) from public, anon;
grant execute on function public.create_booking(text, integer, integer, integer, date, text, text, text, double precision, double precision, numeric, text, text, text) to authenticated;
