import { NextRequest, NextResponse } from 'next/server';
import { generatePassword } from '@/lib/generatePassword';
import { requireAdmin } from '@/lib/requireAdmin';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// Mirrors business_open_hour()/business_close_hour() (supabase/migrations/
// *_hourly_booking_schema.sql, 9-21) — this server route can't call the SQL
// constant functions directly, so the bound is duplicated here the same way
// the admin UI already mirrors it (e.g. AssignModal.tsx's BUFFER_MINUTES,
// roster/page.tsx's HOURS).
const BUSINESS_OPEN_HOUR = 9;
const BUSINESS_CLOSE_HOUR = 21;
const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Creates a real Supabase Auth user (email + a generated single-use
// password) and links it to a new `partners` row, using the service-role
// key so it can bypass RLS for this one trusted, server-side operation.
// The service-role key never leaves this file — see supabaseAdmin.ts.
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const check = await requireAdmin(request, supabaseAdmin);
    if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

    const body = await request.json();
    const { name, email, contact, serviceTags, commissionRate, verified, availableDays, availableStartHour, availableEndHour } = body as {
      name?: string;
      email?: string;
      contact?: string;
      serviceTags?: string[];
      commissionRate?: number;
      verified?: boolean;
      availableDays?: string[];
      availableStartHour?: number;
      availableEndHour?: number;
    };

    if (!name?.trim() || !email?.trim() || !serviceTags?.length) {
      return NextResponse.json({ error: 'name, email, and at least one service tag are required.' }, { status: 400 });
    }

    // available_days/hours (Phase 4.1) -- default to the previous hardcoded
    // Mon-Sat / 9-21 when the request omits them, so this stays backwards
    // compatible with any other caller, but validate whatever IS supplied
    // rather than trusting the client (same posture as duration_hours in
    // the bookings_capacity_guard trigger).
    const days = availableDays?.length ? availableDays : DEFAULT_DAYS;
    if (!days.every((d) => VALID_DAYS.includes(d))) {
      return NextResponse.json({ error: 'available_days contains an invalid weekday.' }, { status: 400 });
    }
    const startHour = availableStartHour ?? BUSINESS_OPEN_HOUR;
    const endHour = availableEndHour ?? BUSINESS_CLOSE_HOUR;
    if (
      !Number.isInteger(startHour) ||
      !Number.isInteger(endHour) ||
      startHour < BUSINESS_OPEN_HOUR ||
      endHour > BUSINESS_CLOSE_HOUR ||
      startHour >= endHour
    ) {
      return NextResponse.json(
        { error: `Working hours must fall within ${BUSINESS_OPEN_HOUR}:00-${BUSINESS_CLOSE_HOUR}:00 and start before they end.` },
        { status: 400 }
      );
    }

    const temporaryPassword = generatePassword();

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: temporaryPassword,
      email_confirm: true,
    });
    if (authError || !authUser.user) {
      return NextResponse.json({ error: authError?.message ?? 'Could not create the auth user.' }, { status: 400 });
    }

    const initials = name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const { data: partner, error: partnerError } = await supabaseAdmin
      .from('partners')
      .insert({
        name: name.trim(),
        initials,
        email: email.trim(),
        auth_user_id: authUser.user.id,
        must_change_password: true,
        contact: contact?.trim() || null,
        service_tags: serviceTags,
        commission_rate: (commissionRate ?? 20) / 100,
        verified: !!verified,
        // id_verified/nbi_verified/agreement_verified always start false --
        // a new worker claims no document-backed vetting until an admin
        // actually attaches one from the roster (partner_documents,
        // *_partner_verification_documents.sql). The "verified" toggle above
        // stays the real dispatch gate; it must not silently fake the other
        // two the way this insert used to.
        id_verified: false,
        nbi_verified: false,
        agreement_verified: false,
        active: true,
        available_days: days,
        available_start_hour: startHour,
        available_end_hour: endHour,
        rating: 5.0,
        jobs_count: 0,
      })
      .select()
      .single();

    if (partnerError) {
      // Don't leave an orphaned auth user if the partners insert failed.
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: partnerError.message }, { status: 400 });
    }

    return NextResponse.json({ partner, temporaryPassword });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unexpected server error.' }, { status: 500 });
  }
}
