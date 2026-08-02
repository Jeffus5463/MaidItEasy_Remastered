// Booking creation, listing, and tracking against the Supabase schema.
import { useQuery } from '@tanstack/react-query';
import { BookingStatus, ServiceId, formatHourRange } from '../data';
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

  // Snapshot the customer's name onto the booking at creation time — same
  // pattern as `contact` — so partner/admin surfaces can show it without
  // needing broader read access to other customers' `profiles` rows.
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();

  // partner_id/duration_hours are intentionally omitted (or overridden) by
  // the bookings_capacity_guard trigger — it soft-holds the actual worker
  // and, for per_unit services, recomputes duration_hours server-side
  // rather than trusting this client-computed value.
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      customer_id: session.user.id,
      customer_name: profile?.full_name ?? null,
      service_id: input.serviceId,
      units: input.serviceId === 'aircon' ? input.units : null,
      start_hour: input.startHour,
      duration_hours: input.durationHours,
      date: input.date,
      barangay: input.barangay,
      landmark: input.landmark,
      contact: input.contact,
      latitude: input.latitude,
      longitude: input.longitude,
      total: input.total,
    })
    .select()
    .single();
  if (error) throw error;

  // Cash is paid to the partner in person (decisions-log.md), so there's
  // nothing for an admin to verify remotely the way there is for a GCash
  // reference — auto-verify at booking time. GCash still starts
  // 'awaiting_payment' (the column default) until the admin checks it
  // against the reference number on /gcash.
  const { error: paymentError } = await supabase.from('payments').insert({
    booking_id: booking.id,
    method: input.payment,
    gcash_ref: input.payment === 'gcash' ? input.gcashRef : null,
    status: input.payment === 'cash' ? 'verified' : 'awaiting_payment',
  });
  if (paymentError) throw paymentError;

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
  refund_needed: boolean;
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
        .select('*')
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BookingRow[];
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
        .select('*, partners(name, initials, rating, jobs_count), payments(status, reject_reason)')
        .eq('id', bookingId)
        .single();
      if (error) throw error;
      return data as unknown as BookingWithPartner;
    },
    enabled: !!bookingId,
    refetchInterval: 4000,
  });
}
