-- MaidItEasy — real partner accounts (Phase 2.5)
-- Links each partner row to a real Supabase Auth user (email + password,
-- created by the admin console via the service-role key — see
-- admin/src/app/api/partners/route.ts). Existing seeded partners keep
-- auth_user_id/email null until an account is created for them; that's
-- expected, not a migration bug — they just can't log in yet.
--
-- Idempotent: safe to run this whole file again.

alter table public.partners add column if not exists auth_user_id uuid references auth.users (id);
alter table public.partners add column if not exists email text unique;
alter table public.partners add column if not exists must_change_password boolean not null default true;
