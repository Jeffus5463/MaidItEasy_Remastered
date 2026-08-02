-- MaidItEasy — real admin login (Phase 2.5 quick win)
-- Replaces the admin console's anonymous auto-session with real
-- email+password auth, gated by membership in this `admins` table. See
-- README.md for how to bootstrap the first admin (there's no self-service
-- signup — this table is empty until someone inserts a row).
--
-- Idempotent: safe to run this whole file again.

create table if not exists public.admins (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- An admin can see their own membership row (that's all the login gate
-- needs to check). Nobody else can read this table via the anon/browser
-- client.
drop policy if exists "admins_select_own" on public.admins;
create policy "admins_select_own" on public.admins for select using (
  auth.uid() = auth_user_id
);

-- Partners can update their own row (needed for the must_change_password
-- flow) without needing admin membership — split out from
-- partners_admin_write below, which now requires being a real admin.
drop policy if exists "partners_self_update" on public.partners;
create policy "partners_self_update" on public.partners for update using (
  auth_user_id = auth.uid()
) with check (
  auth_user_id = auth.uid()
);

-- Tighten the admin-only policies from blanket "authenticated" (which a
-- partner's login also satisfies) to real admins-table membership.
-- partners_authenticated_read (public partner directory info, read by
-- customers/partners/admin) is intentionally left alone.
drop policy if exists "bookings_admin_all" on public.bookings;
create policy "bookings_admin_all" on public.bookings for all using (
  exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
);

drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all" on public.payments for all using (
  exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
);

drop policy if exists "services_admin_write" on public.services;
create policy "services_admin_write" on public.services for all using (
  exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
);

drop policy if exists "partners_admin_write" on public.partners;
create policy "partners_admin_write" on public.partners for all using (
  exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
);
