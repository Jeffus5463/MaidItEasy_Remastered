// Partner-side job queries and status mutations.
//
// Partners are real Supabase Auth users (see src/lib/partnerAuth.ts) — every
// query/mutation below takes the signed-in partner's own row id, derived
// from usePartnerSession()/useRequirePartner(), not a hardcoded constant.
//
// No self-claim pool: a booking only ever gets a partner_id from the admin
// dispatcher (see admin/src/components/AssignModal.tsx). Partners see only
// jobs already assigned to them — see BUILD_PLAN.md Phase 2.5.
import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { BookingRow } from './bookings';

export function useMyJobs(partnerId: string | null) {
  return useQuery({
    queryKey: ['partner-jobs', 'mine', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BookingRow[];
    },
    enabled: !!partnerId,
  });
}

export function useJob(id: string | null) {
  return useQuery({
    queryKey: ['partner-job', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
      if (error) throw error;
      return data as BookingRow;
    },
    enabled: !!id,
    refetchInterval: 4000,
  });
}

// Marks a job as accepted (see the job-detail screen's Accept button).
// Before this existed, status stayed 'assigned' whether or not the partner
// had actually accepted, so the dashboard/active screens couldn't tell an
// accepted job apart from one still awaiting a response.
export async function acceptJob(id: string) {
  const { error } = await supabase.from('bookings').update({ accepted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function enRouteJob(id: string) {
  const { error } = await supabase.from('bookings').update({ status: 'en_route' }).eq('id', id);
  if (error) throw error;
}

// Returns the booking to the dispatcher — releases this partner's hold and
// re-runs the soft-hold against the next qualified free worker (Phase 4,
// supabase/migrations/*_hourly_booking_capacity.sql#release_and_rehold),
// which also puts status back to 'pending' (a re-hold is not a dispatch —
// the admin still confirms). Records the decline reason so the admin board
// shows why, instead of the job silently reappearing unassigned.
export async function declineJob(id: string, reason: string, note: string) {
  const { error: rpcError } = await supabase.rpc('release_and_rehold', { p_booking_id: id });
  if (rpcError) throw rpcError;

  const { error } = await supabase
    .from('bookings')
    .update({ decline_reason: reason, decline_note: note.trim() || null })
    .eq('id', id);
  if (error) throw error;
}

export async function startJob(id: string) {
  const { error } = await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', id);
  if (error) throw error;
}

// Marking a job completed also records the partner's earnings for it — but
// not from here. A DB trigger (record_job_earnings(), see
// supabase/migrations/*_earnings_ledger.sql) inserts the earnings row the
// instant status flips to 'completed', so it can't be missed by a client
// that updates the status but then fails before a second insert would run.
export async function completeJob(id: string) {
  const { error } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', id);
  if (error) throw error;
}

export interface EarningRow {
  id: string;
  booking_id: string;
  job_fee: number;
  commission_rate: number;
  commission_amount: number;
  earned_at: string;
  paid_at: string | null;
  bookings: {
    service_id: 'cleaning' | 'aircon';
    units: number | null;
    tier: string | null;
    date: string;
    start_hour: number;
    duration_hours: number;
  } | null;
}

export function useMyEarnings(partnerId: string | null) {
  return useQuery({
    queryKey: ['partner-earnings', 'mine', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('earnings')
        .select(
          'id, booking_id, job_fee, commission_rate, commission_amount, earned_at, paid_at, bookings(service_id, units, tier, date, start_hour, duration_hours)'
        )
        .eq('partner_id', partnerId)
        .order('earned_at', { ascending: false });
      if (error) throw error;
      return data as unknown as EarningRow[];
    },
    enabled: !!partnerId,
  });
}

const SIGNED_URL_TTL = 60 * 60 * 6; // 6 hours — plenty for one work session.

// job_photos.url stores the bucket PATH, not a resolved URL (the bucket is
// private — see *_job_photos_private.sql — so a public URL wouldn't
// resolve anyway, and a signed URL would expire before anyone reads the
// row back). Older rows from before that migration stored a full public
// URL instead; this resolves either shape to a fresh signed URL.
export async function getJobPhotoUrl(pathOrUrl: string): Promise<string> {
  const path = pathOrUrl.includes('/job-photos/') ? pathOrUrl.split('/job-photos/')[1] : pathOrUrl;
  const { data, error } = await supabase.storage.from('job-photos').createSignedUrl(path, SIGNED_URL_TTL);
  if (error) throw error;
  return data.signedUrl;
}

// Resolves a completed job's stored before/after photos to fresh signed
// URLs. Needed because completed.tsx can now be reached from the
// dashboard's "Completed" list for a job finished in an earlier session,
// not just right after uploadJobPhoto() in the current one — so it can't
// rely on partnerStore's local (session-only) photo URIs.
export function useJobPhotos(bookingId: string | null) {
  return useQuery({
    queryKey: ['partner-job-photos', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase.from('job_photos').select('kind, url').eq('booking_id', bookingId);
      if (error) throw error;
      const before = data.find((p) => p.kind === 'before');
      const after = data.find((p) => p.kind === 'after');
      return {
        before: before ? await getJobPhotoUrl(before.url) : null,
        after: after ? await getJobPhotoUrl(after.url) : null,
      };
    },
    enabled: !!bookingId,
  });
}

// Uploads a picked photo (local file:// / blob: URI from expo-image-picker) to
// the job-photos bucket, records the storage path in job_photos, and returns
// a signed URL for immediate display in the current session.
export async function uploadJobPhoto(bookingId: string, kind: 'before' | 'after', localUri: string) {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const path = `${bookingId}/${kind}-${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage.from('job-photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { error: dbError } = await supabase.from('job_photos').insert({ booking_id: bookingId, kind, url: path });
  if (dbError) throw dbError;

  return getJobPhotoUrl(path);
}
