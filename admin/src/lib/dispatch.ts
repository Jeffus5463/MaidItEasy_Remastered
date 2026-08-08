// Pure dispatch-candidate logic, extracted from AssignModal.tsx so it's
// unit-testable without React/react-query. This is the exact span+buffer/
// weekday conflict check — see CLAUDE.md -> Admin console -> "Board +
// daily summary" for the full availability rules.
import type { BookingRow, PartnerRow } from './types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Trailing buffer after every job, in minutes — must match buffer_minutes()
// in supabase/migrations/*_hourly_booking_capacity.sql (the real source of
// truth, enforced server-side); duplicated here the same way src/data.ts's
// BUFFER_MINUTES mirrors it for the Expo app, since this admin app shares
// no code with either.
const BUFFER_MINUTES = 30;

export interface AssignCandidate {
  partner: PartnerRow;
  ok: boolean;
  reason: string;
}

type CandidateBooking = Pick<BookingRow, 'id' | 'date' | 'start_hour' | 'duration_hours' | 'service_id'>;

export function getAssignCandidates(
  booking: CandidateBooking,
  partners: PartnerRow[],
  allBookings: BookingRow[]
): AssignCandidate[] {
  // Use the booking's own date, not today — appending "T00:00:00" (no "Z")
  // forces local-time parsing so this doesn't shift a day depending on the
  // server's timezone (see src/lib/bookings.ts#formatBookingWhen for the
  // same pattern).
  const bookingWeekday = WEEKDAYS[new Date(`${booking.date}T00:00:00`).getDay()];
  const newStartMin = booking.start_hour * 60;
  const newEndMin = (booking.start_hour + booking.duration_hours) * 60 + BUFFER_MINUTES;

  return partners
    .filter((p) => p.verified && p.active)
    .map((p) => {
      const qualified = (p.service_tags ?? []).includes(booking.service_id);
      const onShift = (p.available_days ?? []).includes(bookingWeekday);
      const withinHours = booking.start_hour >= p.available_start_hour && booking.start_hour + booking.duration_hours <= p.available_end_hour;
      // Span-based conflict (Phase 4): busy if [this booking's span+buffer]
      // overlaps ANY other non-terminal booking of this worker's that day —
      // across every service, not just this one, so a worker mid-cleaning
      // is correctly unavailable for an overlapping aircon job too.
      const busy = allBookings.some((b) => {
        if (b.partner_id !== p.id || b.id === booking.id || b.date !== booking.date) return false;
        if (['completed', 'cancelled'].includes(b.status)) return false;
        const existingStartMin = b.start_hour * 60;
        const existingEndMin = (b.start_hour + b.duration_hours) * 60 + BUFFER_MINUTES;
        return newStartMin < existingEndMin && existingStartMin < newEndMin;
      });
      const ok = qualified && onShift && withinHours && !busy;
      const reason = !qualified
        ? `Not tagged for ${booking.service_id === 'aircon' ? 'aircon' : 'cleaning'}`
        : !onShift
          ? `Off ${bookingWeekday}`
          : !withinHours
            ? 'Outside working hours'
            : busy
              ? 'Booked then'
              : '';
      return { partner: p, ok, reason };
    })
    .sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? -1 : 1));
}
