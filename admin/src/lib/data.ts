// Admin data layer — every table is readable/writable by a real signed-in
// admin (see supabase/migrations/*_admin_login.sql for the RLS policies).
//
// The board/roster below operate on ALL non-terminal bookings, not strictly
// bookings dated "today" — with a handful of real bookings in this phase, a
// strict same-day filter would hide jobs a dispatcher still needs to act on.
// Only the "Bookings today" KPI on the summary page filters by calendar date.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { BookingRow, EarningRow, PartnerRow, PaymentRow, ServiceRow } from './types';

// All 6 statuses, including 'cancelled' (Phase 2.6) — the board needs to
// show cancelled/refund-needed bookings, not just active ones.
const ALL_STATUSES = ['pending', 'assigned', 'en_route', 'in_progress', 'completed', 'cancelled'] as const;

export function useBookings() {
  return useQuery({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ALL_STATUSES)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BookingRow[];
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PaymentRow[];
    },
  });
}

export function useServices() {
  return useQuery({
    queryKey: ['admin-services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('*').order('name');
      if (error) throw error;
      return data as ServiceRow[];
    },
  });
}

export function usePartners() {
  return useQuery({
    queryKey: ['admin-partners'],
    queryFn: async () => {
      const { data, error } = await supabase.from('partners').select('*').order('name');
      if (error) throw error;
      return data as PartnerRow[];
    },
  });
}

// Confirming or overriding a soft-hold (Phase 4) is the real dispatch —
// this is the only place a booking leaves 'pending' with a partner
// attached. assignment_source: 'manual' regardless of whether the admin
// kept the pre-selected hold or picked someone else, since either way a
// human just committed to it (see AssignModal's `isHeld` for the "kept the
// suggestion" distinction shown in the UI).
export function useAssignPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, partnerId }: { bookingId: string; partnerId: string }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ partner_id: partnerId, status: 'assigned', assignment_source: 'manual', decline_reason: null, decline_note: null })
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bookings'] }),
  });
}

// Not allowed once in_progress or later — enforce that at the call site
// (the button just isn't shown), same as the board's CANCELLABLE list.
// Releases the current worker's hold and re-runs the soft-hold against the
// next qualified free worker (Phase 4,
// supabase/migrations/*_hourly_booking_capacity.sql#release_and_rehold) —
// excluding the one just unassigned — rather than leaving the booking
// bare; if nobody else is free it lands back on 'pending' with no
// partner, same needs-attention case as a fully unassigned booking.
export function useUnassignBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.rpc('release_and_rehold', { p_booking_id: bookingId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bookings'] }),
  });
}

// refundNeeded is decided by the caller (true when the linked payment was
// already 'verified' at cancel time) — no automatic refund is attempted.
export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, refundNeeded }: { bookingId: string; refundNeeded: boolean }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', refund_needed: refundNeeded })
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bookings'] }),
  });
}

export function useEarnings() {
  return useQuery({
    queryKey: ['admin-earnings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('earnings').select('*').order('earned_at', { ascending: false });
      if (error) throw error;
      return data as EarningRow[];
    },
  });
}

// Stamps every unpaid earnings row for one worker with the same paid_at +
// payout_id — a reconciliation record, not a real money transfer. Batching
// is deliberately simple: one payout covers everything unpaid for that
// worker at the moment the admin clicks the button.
export function useRecordPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (partnerId: string) => {
      const payoutId = crypto.randomUUID();
      const { error } = await supabase
        .from('earnings')
        .update({ paid_at: new Date().toISOString(), payout_id: payoutId })
        .eq('partner_id', partnerId)
        .is('paid_at', null);
      if (error) throw error;
      return payoutId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-earnings'] }),
  });
}

export function useVerifyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'verified', reject_reason: null })
        .eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payments'] }),
  });
}

export function useRejectPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'rejected', reject_reason: reason })
        .eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payments'] }),
  });
}

export function useToggleServiceActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('services').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-services'] }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      price,
      duration,
      hourlyRate,
      estimatedMinutesPerUnit,
    }: {
      id: string;
      price?: number;
      duration?: string;
      hourlyRate?: number;
      estimatedMinutesPerUnit?: number;
    }) => {
      const patch: Partial<ServiceRow> = {};
      if (price !== undefined) patch.price = price;
      if (duration !== undefined) patch.duration = duration;
      if (hourlyRate !== undefined) patch.hourly_rate = hourlyRate;
      if (estimatedMinutesPerUnit !== undefined) patch.estimated_minutes_per_unit = estimatedMinutesPerUnit;
      const { error } = await supabase.from('services').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-services'] }),
  });
}

export function useToggleWorkerActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('partners').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-partners'] }),
  });
}

// `verified` is the single source of truth the availability engine gates
// dispatch on (qualified_free_partners(), supabase/migrations/
// *_hourly_booking_capacity.sql) — this is the only roster control that
// writes it (Phase 4.1; previously there was none, so a worker created
// unverified had no way to become dispatch-eligible without a direct DB
// edit).
export function useToggleWorkerVerified() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from('partners').update({ verified }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-partners'] }),
  });
}

export function useToggleWorkerDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, days }: { id: string; days: string[] }) => {
      const { error } = await supabase.from('partners').update({ available_days: days }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-partners'] }),
  });
}

// Working-hours window (Phase 4) — the soft-hold engine only offers a
// worker a span that fits within their own available_start_hour/
// available_end_hour, in addition to business hours overall.
export function useUpdateWorkerHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, startHour, endHour }: { id: string; startHour: number; endHour: number }) => {
      const { error } = await supabase.from('partners').update({ available_start_hour: startHour, available_end_hour: endHour }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-partners'] }),
  });
}

export interface NewWorkerInput {
  name: string;
  email: string;
  contact: string;
  serviceTags: string[];
  commissionRate: number;
  verified: boolean;
  availableDays: string[];
  availableStartHour: number;
  availableEndHour: number;
}

export interface NewWorkerResult {
  partner: PartnerRow;
  temporaryPassword: string;
}

// Shared by every mutation that calls a service-role Route Handler: attach
// the current session as a bearer token, and parse the response
// defensively — a thrown error before the route returns JSON (e.g. a
// missing env var) surfaces as Next's HTML error page, not JSON.
async function postToApi<T>(path: string, body: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in.');

  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status}).`);
  return json as T;
}

// Goes through /api/partners (server-side, service-role key) instead of a
// direct client insert — creating a worker also creates their Supabase
// Auth login, which the anon-key browser client can't do. The route
// handler verifies the bearer token belongs to a real admin before using
// its elevated service-role client.
export function useAddWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewWorkerInput) => postToApi<NewWorkerResult>('/api/partners', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-partners'] }),
  });
}

export interface ResetPasswordResult {
  temporaryPassword: string;
}

export function useResetPartnerPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (partnerId: string) => postToApi<ResetPasswordResult>('/api/partners/reset-password', { partnerId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-partners'] }),
  });
}
