-- MaidItEasy — initial schema (Phase 3)
-- Mirrors src/data.ts (SERVICES, TRACK_STEPS) and the booking/payment shapes
-- used by src/store.tsx and the partner app.
--
-- Idempotent: safe to run this whole file again if a previous run only
-- partially completed (e.g. pasted mid-file) — every statement either uses
-- IF NOT EXISTS/IF EXISTS or tolerates "already exists" errors.

create extension if not exists pgcrypto;

do $$ begin
  create type public.booking_status as enum ('pending', 'assigned', 'en_route', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_method as enum ('gcash', 'cash');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum ('awaiting_payment', 'verified');
exception when duplicate_object then null;
end $$;

-- Customer profile, keyed to the Supabase auth user.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text unique,
  created_at timestamptz not null default now()
);

-- Fixed-price service catalog (cleaning, aircon).
create table if not exists public.services (
  id text primary key,
  name text not null,
  price integer not null,
  suffix text not null default '',
  duration text not null,
  price_label text not null
);

-- Partners (workers). Created by the admin console — no seed data.
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  initials text not null,
  rating numeric(2, 1) not null default 5.0,
  jobs_count integer not null default 0,
  commission_rate numeric(3, 2) not null default 0.20,
  verified boolean not null default true,
  active boolean not null default true,
  service_tags text[] not null default '{}'
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  partner_id uuid references public.partners (id),
  service_id text not null references public.services (id),
  units integer,
  tier text,
  date date not null,
  time text not null,
  barangay text not null,
  landmark text not null,
  contact text not null,
  latitude double precision,
  longitude double precision,
  total integer not null,
  status public.booking_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  method public.payment_method not null,
  gcash_ref text,
  status public.payment_status not null default 'awaiting_payment',
  created_at timestamptz not null default now()
);

create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind text not null check (kind in ('before', 'after')),
  url text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.partners enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.job_photos enable row level security;

-- profiles: a user manages only their own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- services: public read-only catalog.
drop policy if exists "services_public_read" on public.services;
create policy "services_public_read" on public.services for select using (true);

-- partners: readable by any signed-in user (needed for customer tracking
-- and the partner app; there is no partner login yet).
drop policy if exists "partners_authenticated_read" on public.partners;
create policy "partners_authenticated_read" on public.partners for select using (auth.role() = 'authenticated');

-- bookings: customers manage their own bookings.
drop policy if exists "bookings_select_own" on public.bookings;
create policy "bookings_select_own" on public.bookings for select using (auth.uid() = customer_id);
drop policy if exists "bookings_insert_own" on public.bookings;
create policy "bookings_insert_own" on public.bookings for insert with check (auth.uid() = customer_id);
drop policy if exists "bookings_update_own" on public.bookings;
create policy "bookings_update_own" on public.bookings for update using (auth.uid() = customer_id);

-- bookings: partner app reads/updates assigned jobs. Permissive by design —
-- there is no partner auth yet, so this is scoped by "has a partner_id" only.
-- Tighten to auth.uid() = partner's own user id once partner login exists.
drop policy if exists "bookings_partner_assigned_read" on public.bookings;
create policy "bookings_partner_assigned_read" on public.bookings for select using (
  partner_id is not null and auth.role() = 'authenticated'
);
drop policy if exists "bookings_partner_assigned_update" on public.bookings;
create policy "bookings_partner_assigned_update" on public.bookings for update using (
  partner_id is not null and auth.role() = 'authenticated'
);

-- payments: tied to the owning booking.
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments for select using (
  exists (select 1 from public.bookings b where b.id = payments.booking_id and b.customer_id = auth.uid())
);
drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments for insert with check (
  exists (select 1 from public.bookings b where b.id = payments.booking_id and b.customer_id = auth.uid())
);

-- job_photos: partner-side inserts/reads. Same permissive caveat as bookings above.
drop policy if exists "job_photos_authenticated_all" on public.job_photos;
create policy "job_photos_authenticated_all" on public.job_photos for all using (
  auth.role() = 'authenticated'
) with check (
  auth.role() = 'authenticated'
);

-- Seed data
insert into public.services (id, name, price, suffix, duration, price_label) values
  ('cleaning', 'Home Cleaning', 399, '', '2–3 hrs', 'Starting at'),
  ('aircon', 'Aircon Cleaning & Servicing', 600, '/unit', '~45 min/unit', 'Fixed price')
on conflict (id) do nothing;

-- No seeded partner (Phase 2.7) — workers are admin-created now, so a
-- fresh database starts with none.
