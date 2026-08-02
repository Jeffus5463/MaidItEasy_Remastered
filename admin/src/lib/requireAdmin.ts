import 'server-only';
import { NextRequest } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';

// Shared by every Route Handler that uses the service-role client: RLS
// tightening alone can't protect a route that bypasses RLS, so each one
// verifies the caller's bearer token against auth.users, then checks
// admins-table membership explicitly before doing anything else.
export async function requireAdmin(
  request: NextRequest,
  supabaseAdmin: SupabaseClient
): Promise<{ userId: string } | { error: string; status: number }> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return { error: 'Not signed in.', status: 401 };

  const { data: caller, error: callerError } = await supabaseAdmin.auth.getUser(token);
  if (callerError || !caller.user) return { error: 'Invalid session.', status: 401 };

  const { data: admin } = await supabaseAdmin
    .from('admins')
    .select('auth_user_id')
    .eq('auth_user_id', caller.user.id)
    .maybeSingle();
  if (!admin) return { error: 'This account is not an admin.', status: 403 };

  return { userId: caller.user.id };
}
