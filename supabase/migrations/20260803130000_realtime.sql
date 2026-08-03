-- MaidItEasy — enable Supabase Realtime on bookings/payments (Phase 6)
--
-- Realtime is used purely as a React Query invalidation signal (see
-- src/lib/realtime.ts / admin/src/lib/realtime.ts) — no new data path, no
-- new RLS policies needed, since Realtime enforces the existing RLS on
-- these tables (customer sees own bookings, partner sees assigned, admin
-- sees all).
--
-- Idempotent: safe to run this whole file again.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;
end $$;
