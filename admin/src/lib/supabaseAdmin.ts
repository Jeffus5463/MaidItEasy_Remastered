import 'server-only';

// Service-role Supabase client — bypasses RLS entirely. Only ever import
// this from a Route Handler (admin/src/app/api/**/route.ts). The
// `server-only` import above makes any accidental client-component import
// a build error, not just a review miss.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Built lazily (not at module load) so a missing env var surfaces as a
// catchable error inside a route handler's try/catch — a clean JSON 500 —
// instead of an unhandled throw during module evaluation (Next's HTML
// error page, which broke the admin UI's fetch().json() parsing).
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Add SUPABASE_SERVICE_ROLE_KEY ' +
        '(Settings → API → service_role secret) to admin/.env.local — never NEXT_PUBLIC_, never committed.'
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
