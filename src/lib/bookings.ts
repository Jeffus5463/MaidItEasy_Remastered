// Booking creation, listing, and tracking against the Supabase schema.
import { useQuery } from '@tanstack/react-query';
import { BookingStatus, ServiceId, formatHourRange } from '../data';
import { HourSlot } from './availability';
import { supabase } from './supabase';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-07-25", 10, 2 -> "Jul 25, 2026 · 10:00 AM–12:00 PM"
export function formatBookingWhen(date: string, startHour: number, durationHours: number) {
  const d = new Date(`${date}T00:00:00`);
  const dateStr = Number.isNaN(d.getTime()) ? date : `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  return `${dateStr} · ${formatHourRange(startHour, durationHours)}`;
}

// Customer display name for partner/admin screens — falls back to the
// contact number when no name is on file (see profiles.full_name).
export function customerLabel(booking: Pick<BookingRow, 'customer_name' | 'contact'>) {
  return booking.customer_name || booking.contact;
}

// What the job actually is, for partner-facing screens. `tier` only ever
// has a value on pre-Phase-4 bookings (the home-size step was dropped in
// favor of picking hours directly) — new cleaning bookings show their
// duration instead.
export function bookingScope(booking: Pick<BookingRow, 'service_id' | 'units' | 'tier' | 'duration_hours'>) {
  if (booking.service_id === 'aircon') {
    const n = booking.units ?? 1;
    return `Aircon servicing · ${n} unit${n > 1 ? 's' : ''}`;
  }
  if (booking.tier) return `General cleaning · ${booking.tier}`;
  const h = booking.duration_hours;
  return `General cleaning · ${h} hr${h === 1 ? '' : 's'}`;
}

export interface CreateBookingInput {
  serviceId: ServiceId;
  units: number;
  startHour: number;
  durationHours: number;
  date: string;
  barangay: string;
  landmark: string;
  contact: string;
  latitude: number;
  longitude: number;
  total: number;
  payment: 'gcash' | 'cash';
  gcashRef: string;
  proofPath: string | null;
}

// Friendly pre-check before even attempting the booking — the real backstop
// is the enforce_gcash_ref_uniqueness() trigger (supabase/migrations/
// *_gcash_payment_integrity.sql), which excludes cancelled bookings so a
// reference from an expired/cancelled booking can still be legitimately
// reused. gcash_ref_in_use() is a boolean-only SECURITY DEFINER RPC, so this
// works without the customer's session needing to read other customers'
// payments rows.
export async function gcashRefInUse(gcashRef: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('gcash_ref_in_use', { p_gcash_ref: gcashRef });
  if (error) throw error;
  return !!data;
}

// Uploads a picked GCash payment screenshot to the private payment-proofs
// bucket, keyed by the customer's own auth uid (known at upload time, unlike
// a booking id) — mirrors src/lib/partner.ts#uploadJobPhoto's shape. Returns
// the storage path, stored directly in payments.proof_path; the customer
// never needs to re-view it, so no signed-URL resolution here.
export async function uploadPaymentProof(localUri: string): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in.');

  const response = await fetch(localUri);
  const blob = await response.blob();
  const path = `${session.user.id}/${Date.now()}.jpg`;

  const { error } = await supabase.storage.from('payment-proofs').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;

  return path;
}

export async function createBooking(input: CreateBookingInput) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in.');

  // Re-check right before insert — the front-end greying in booking.tsx
  // can go stale between screens. This narrows the race but doesn't close
  // it; the bookings_capacity_guard trigger (see
  // supabase/migrations/*_hourly_booking_capacity.sql) is the real
  // backstop, atomically re-verifying and soft-holding a qualified free
  // worker for the whole span inside an advisory lock.
  const { data: hasFreeWorker, error: availabilityError } = await supabase.rpc('has_free_qualified_partner', {
    p_service_id: input.serviceId,
    p_date: input.date,
    p_start_hour: input.startHour,
    p_duration_hours: input.durationHours,
  });
  if (availabilityError) throw availabilityError;
  if (!hasFreeWorker) {
    throw new Error('That time just filled up — please pick another time.');
  }

  // Booking + payment insert in one RPC (supabase/migrations/
  // *_atomic_create_booking.sql#create_booking) so they commit or roll back
  // together — a payment-insert failure (e.g. a uniqueness/constraint
  // violation) can no longer leave an orphaned 'pending' booking with no
  // linked payment. The RPC snapshots the customer's name from `profiles`
  // itself; partner_id/duration_hours/total are still overridden server-side
  // by the bookings_capacity_guard trigger regardless of what's passed here.
  const { data: booking, error } = await supabase.rpc('create_booking', {
    p_service_id: input.serviceId,
    p_units: input.serviceId === 'aircon' ? input.units : null,
    p_start_hour: input.startHour,
    p_duration_hours: input.durationHours,
    p_date: input.date,
    p_barangay: input.barangay,
    p_landmark: input.landmark,
    p_contact: input.contact,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_total: input.total,
    p_payment_method: input.payment,
    p_gcash_ref: input.payment === 'gcash' ? input.gcashRef : null,
    p_proof_path: input.payment === 'gcash' ? input.proofPath : null,
  });
  if (error) throw error;

  return booking as BookingRow;
}

export interface BookingRow {
  id: string;
  customer_id: string;
  customer_name: string | null;
  partner_id: string | null;
  service_id: ServiceId;
  units: number | null;
  tier: string | null;
  start_hour: number;
  duration_hours: number;
  assignment_source: 'auto' | 'manual' | 'fcfs';
  date: string;
  barangay: string;
  landmark: string;
  contact: string;
  latitude: number | null;
  longitude: number | null;
  total: number;
  status: DbBookingStatus;
  accepted_at: string | null;
  decline_reason: string | null;
  decline_note: string | null;
  declined_at: string | null;
  refund_needed: boolean;
  refunded_at: string | null;
  cancel_reason: string | null;
  created_at: string;
}

export type DbBookingStatus = 'pending' | 'assigned' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';

const STATUS_LABELS: Record<DbBookingStatus, BookingStatus> = {
  pending: 'Pending',
  assigned: 'Assigned',
  en_route: 'En route',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function statusLabel(status: DbBookingStatus): BookingStatus {
  return STATUS_LABELS[status];
}

// payments joined so the list can show a "Verifying payment"/"Payment
// issue" chip (Phase 14, derived from the linked GCash payment's status —
// see app/bookings.tsx) without a second round trip per booking.
export interface BookingListRow extends BookingRow {
  payments: Pick<PaymentInfo, 'method' | 'status'>[];
}

export function useMyBookings() {
  return useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select('*, payments(method, status)')
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as BookingListRow[];
    },
  });
}

export interface AssignedPartner {
  name: string;
  initials: string;
  rating: number;
  jobs_count: number;
}

export interface PaymentInfo {
  method: 'gcash' | 'cash';
  status: 'awaiting_payment' | 'verified' | 'rejected';
  reject_reason: string | null;
}

export interface BookingWithPartner extends BookingRow {
  partners: AssignedPartner | null;
  payments: PaymentInfo[];
}

export function useBookingTracking(bookingId: string | null) {
  return useQuery({
    queryKey: ['bookings', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, partners(name, initials, rating, jobs_count), payments(method, status, reject_reason)')
        .eq('id', bookingId)
        .single();
      if (error) throw error;
      return data as unknown as BookingWithPartner;
    },
    enabled: !!bookingId,
  });
}

// The only path a customer cancels their own booking through — recomputes
// refund eligibility server-side from the linked payment row rather than
// trusting a client-side window calculation (supabase/migrations/
// *_customer_cancellation.sql#cancel_booking_customer). Returns whether a
// refund is now owed, for the confirmation copy.
export async function cancelBookingCustomer(bookingId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('cancel_booking_customer', { p_booking_id: bookingId });
  if (error) throw error;
  return !!data;
}

// The sole path a customer moves their own booking to a different
// date/start_hour — service_id/units/duration_hours/total never change
// (supabase/migrations/*_customer_reschedule.sql#reschedule_booking_customer).
export async function rescheduleBookingCustomer(bookingId: string, dateIso: string, startHour: number): Promise<void> {
  const { error } = await supabase.rpc('reschedule_booking_customer', {
    p_booking_id: bookingId,
    p_new_date: dateIso,
    p_new_start_hour: startHour,
  });
  if (error) throw error;
}

// Mirrors useAvailableStartHours (src/lib/availability.ts) but excludes the
// booking being rescheduled from its own busy-conflict check, so previewing
// the same day it's already on doesn't show its own current slot/worker as
// falsely unavailable.
export function useAvailableStartHoursForReschedule(
  bookingId: string | null,
  serviceId: ServiceId | null,
  dateIso: string,
  durationHours: number
) {
  return useQuery({
    queryKey: ['availability-reschedule', bookingId, serviceId, dateIso, durationHours],
    queryFn: async (): Promise<HourSlot[]> => {
      const { data, error } = await supabase.rpc('available_start_hours_for_reschedule', {
        p_service_id: serviceId,
        p_date: dateIso,
        p_duration_hours: durationHours,
        p_exclude_booking_id: bookingId,
      });
      if (error) throw error;
      return ((data as { start_hour: number; available: boolean }[] | null) ?? [])
        .map((r) => ({ startHour: r.start_hour, available: r.available }))
        .sort((a, b) => a.startHour - b.startHour);
    },
    enabled: !!bookingId && !!serviceId && !!dateIso && durationHours > 0,
  });
}
