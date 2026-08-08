import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BookingRow, PartnerRow } from './types';
import { getAssignCandidates } from './dispatch';

afterEach(() => {
  vi.useRealTimers();
});

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let partnerSeq = 0;
function makePartner(overrides: Partial<PartnerRow>): PartnerRow {
  partnerSeq += 1;
  return {
    id: `partner-${partnerSeq}`,
    name: `Partner ${partnerSeq}`,
    initials: 'PP',
    rating: 4.8,
    jobs_count: 10,
    commission_rate: 0.2,
    verified: true,
    active: true,
    service_tags: ['cleaning', 'aircon'],
    barangay: 'Daro',
    contact: '0917 123 4567',
    id_verified: true,
    nbi_verified: true,
    agreement_verified: true,
    available_days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    available_start_hour: 9,
    available_end_hour: 21,
    auth_user_id: 'auth-1',
    email: 'partner@example.com',
    must_change_password: false,
    ...overrides,
  };
}

let bookingSeq = 0;
function makeBooking(overrides: Partial<BookingRow>): BookingRow {
  bookingSeq += 1;
  return {
    id: `booking-${bookingSeq}`,
    customer_id: 'customer-1',
    customer_name: 'Ana Reyes',
    partner_id: null,
    service_id: 'cleaning',
    units: null,
    tier: null,
    start_hour: 9,
    duration_hours: 2,
    assignment_source: 'manual',
    date: '2026-03-10',
    barangay: 'Daro',
    landmark: 'Near the church',
    contact: '0917 123 4567',
    total: 800,
    status: 'assigned',
    decline_reason: null,
    decline_note: null,
    declined_at: null,
    refund_needed: false,
    refunded_at: null,
    cancel_reason: null,
    created_at: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

describe('getAssignCandidates', () => {
  it("uses the booking's own date for the weekday check, not today's date", () => {
    // The historical bug this guards against: computing "on shift" from
    // `new Date()` (today) instead of the booking's own date.
    vi.setSystemTime(new Date(2026, 2, 1)); // an arbitrary "today"
    const todayWeekday = DOW[new Date().getDay()];
    const bookingDate = '2026-03-10'; // 9 days later — always a different weekday
    const bookingWeekday = DOW[new Date(`${bookingDate}T00:00:00`).getDay()];
    expect(bookingWeekday).not.toBe(todayWeekday);

    const booking = makeBooking({ date: bookingDate, start_hour: 9, duration_hours: 2 });
    const onTodayOnly = makePartner({ available_days: [todayWeekday] });
    const onBookingDay = makePartner({ available_days: [bookingWeekday] });

    const candidates = getAssignCandidates(booking, [onTodayOnly, onBookingDay], []);
    const byId = Object.fromEntries(candidates.map((c) => [c.partner.id, c]));

    expect(byId[onTodayOnly.id].ok).toBe(false);
    // The reason always names the booking's own weekday (the day the
    // partner needs to be free), not whichever day the partner actually
    // has off — this is what proves the check used bookingDate, not today.
    expect(byId[onTodayOnly.id].reason).toBe(`Off ${bookingWeekday}`);
    expect(byId[onBookingDay.id].ok).toBe(true);
  });

  it('excludes unverified and inactive partners entirely from candidates', () => {
    const booking = makeBooking({});
    const unverified = makePartner({ verified: false });
    const inactive = makePartner({ active: false });
    const ok = makePartner({});

    const candidates = getAssignCandidates(booking, [unverified, inactive, ok], []);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].partner.id).toBe(ok.id);
  });

  it('flags a partner not tagged for the service', () => {
    const booking = makeBooking({ service_id: 'aircon' });
    const partner = makePartner({ service_tags: ['cleaning'] });
    const [candidate] = getAssignCandidates(booking, [partner], []);
    expect(candidate.ok).toBe(false);
    expect(candidate.reason).toBe('Not tagged for aircon');
  });

  it('flags a booking outside the working-hours window', () => {
    const booking = makeBooking({ start_hour: 8, duration_hours: 2 }); // opens at 9
    const partner = makePartner({ available_start_hour: 9, available_end_hour: 21 });
    const [candidate] = getAssignCandidates(booking, [partner], []);
    expect(candidate.ok).toBe(false);
    expect(candidate.reason).toBe('Outside working hours');
  });

  it('blocks a span+30-min-buffer overlap with an existing non-terminal booking', () => {
    const booking = makeBooking({ id: 'new-booking', date: '2026-03-10', start_hour: 9, duration_hours: 2 }); // 9:00-11:00
    const partner = makePartner({});
    // Existing job 11:15-12:15 -> with a 30-min trailing buffer on the new
    // booking (ends 11:30), these overlap.
    const conflicting = makeBooking({
      partner_id: partner.id,
      date: '2026-03-10',
      start_hour: 11,
      duration_hours: 1,
      status: 'assigned',
    });
    const [candidate] = getAssignCandidates(booking, [partner], [conflicting]);
    expect(candidate.ok).toBe(false);
    expect(candidate.reason).toBe('Booked then');
  });

  it('allows a booking once the existing job + buffer has fully cleared', () => {
    const booking = makeBooking({ id: 'new-booking', date: '2026-03-10', start_hour: 12, duration_hours: 2 }); // 12:00-14:00
    const partner = makePartner({});
    // Existing job 9:00-11:00 + 30min buffer ends 11:30 -> clear of 12:00.
    const earlier = makeBooking({
      partner_id: partner.id,
      date: '2026-03-10',
      start_hour: 9,
      duration_hours: 2,
      status: 'assigned',
    });
    const [candidate] = getAssignCandidates(booking, [partner], [earlier]);
    expect(candidate.ok).toBe(true);
  });

  it('ignores completed/cancelled bookings and the booking being assigned itself', () => {
    const booking = makeBooking({ id: 'new-booking', date: '2026-03-10', start_hour: 9, duration_hours: 2 });
    const partner = makePartner({});
    const completed = makeBooking({ partner_id: partner.id, date: '2026-03-10', start_hour: 9, duration_hours: 2, status: 'completed' });
    const cancelled = makeBooking({ partner_id: partner.id, date: '2026-03-10', start_hour: 9, duration_hours: 2, status: 'cancelled' });
    const self = { ...booking, partner_id: partner.id }; // same id as `booking`
    const [candidate] = getAssignCandidates(booking, [partner], [completed, cancelled, self]);
    expect(candidate.ok).toBe(true);
  });

  it('sorts available candidates before unavailable ones', () => {
    const booking = makeBooking({ service_id: 'cleaning' });
    const unavailable = makePartner({ service_tags: ['aircon'] });
    const available = makePartner({ service_tags: ['cleaning'] });
    const candidates = getAssignCandidates(booking, [unavailable, available], []);
    expect(candidates.map((c) => c.ok)).toEqual([true, false]);
  });
});
