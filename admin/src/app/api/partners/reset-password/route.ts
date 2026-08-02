import { NextRequest, NextResponse } from 'next/server';
import { generatePassword } from '@/lib/generatePassword';
import { requireAdmin } from '@/lib/requireAdmin';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// Sets a new single-use temporary password for a worker's existing Auth
// account and forces a change on next login — same service-role,
// admin-verified pattern as creating the account in the first place
// (see ../route.ts). There's no email involved: the admin hands the new
// password to the worker directly, same as at account creation.
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const check = await requireAdmin(request, supabaseAdmin);
    if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

    const { partnerId } = (await request.json()) as { partnerId?: string };
    if (!partnerId) return NextResponse.json({ error: 'partnerId is required.' }, { status: 400 });

    const { data: partner, error: partnerError } = await supabaseAdmin
      .from('partners')
      .select('auth_user_id')
      .eq('id', partnerId)
      .single();
    if (partnerError || !partner?.auth_user_id) {
      return NextResponse.json({ error: 'This worker has no linked login to reset.' }, { status: 400 });
    }

    const temporaryPassword = generatePassword();

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(partner.auth_user_id, {
      password: temporaryPassword,
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    const { error: updateError } = await supabaseAdmin
      .from('partners')
      .update({ must_change_password: true })
      .eq('id', partnerId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

    return NextResponse.json({ temporaryPassword });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unexpected server error.' }, { status: 500 });
  }
}
