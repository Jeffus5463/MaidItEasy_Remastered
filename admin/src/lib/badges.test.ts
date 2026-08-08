import { describe, expect, it } from 'vitest';
import type { BookingRow, PaymentRow } from './types';
import { countBadges } from './badges';

let bookingSeq = 0;
function makeBooking(overrides: Partial<BookingRow>): BookingRow {
  bookingSeq += 1;
  return {
    id: `booking-${bookingSeq}`,
    customer_id: 'customer-1',
    customer_name: 'Ana Reyes',
    partner_id: 'partner-1',
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

let paymentSeq = 0;
function makePayment(overrides: Partial<PaymentRow>): PaymentRow {
  paymentSeq += 1;
  return {
    id: `payment-${paymentSeq}`,
    booking_id: 'booking-1',
    method: 'gcash',
    gcash_ref: '9171234567890',
    proof_path: 'customer-1/1.jpg',
    status: 'awaiting_payment',
    reject_reason: null,
    created_at: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

describe('countBadges', () => {
  it('returns all zeros when bookings/payments are still loading (undefined)', () => {
    const counts = countBadges(undefined, undefined);
    expect(counts).toEqual({
      attention: 0,
      gcash: 0,
      needsAttention: 0,
      declined: 0,
      mostRecentDeclineAt: null,
      refunds: 0,
    });
  });

  it('counts needsAttention only for pending bookings with no held partner', () => {
    const bookings = [
      makeBooking({ status: 'pending', partner_id: null }),
      makeBooking({ status: 'pending', partner_id: 'partner-1' }), // soft-held, not stuck
      makeBooking({ status: 'assigned', partner_id: null }), // not pending, doesn't count
    ];
    expect(countBadges(bookings, []).needsAttention).toBe(1);
  });

  it('counts declined as any booking still carrying a decline_reason, even if re-held', () => {
    const bookings = [
      makeBooking({ status: 'pending', partner_id: 'partner-2', decline_reason: 'Schedule conflict' }), // re-held
      makeBooking({ status: 'pending', partner_id: null, decline_reason: 'Location too far' }), // stuck + declined
    ];
    const counts = countBadges(bookings, []);
    expect(counts.declined).toBe(2);
    expect(counts.needsAttention).toBe(1); // only the second one (no partner_id)
  });

  it('dedupes needsAttention and declined into a single attention count', () => {
    const bookings = [
      makeBooking({ status: 'pending', partner_id: null }), // needsAttention only
      makeBooking({ status: 'assigned', partner_id: 'partner-1', decline_reason: 'Schedule conflict' }), // declined only
      makeBooking({ status: 'pending', partner_id: null, decline_reason: 'Personal emergency' }), // both at once
    ];
    // 3 distinct bookings feed the union, even though the third matches both filters.
    expect(countBadges(bookings, []).attention).toBe(3);
  });

  it('picks the most recent declined_at', () => {
    const bookings = [
      makeBooking({ decline_reason: 'Schedule conflict', declined_at: '2026-03-01T00:00:00Z' }),
      makeBooking({ decline_reason: 'Location too far', declined_at: '2026-03-05T00:00:00Z' }),
      makeBooking({ decline_reason: 'Personal emergency', declined_at: '2026-03-03T00:00:00Z' }),
    ];
    expect(countBadges(bookings, []).mostRecentDeclineAt).toBe('2026-03-05T00:00:00Z');
  });

  it('counts refunds owed as refund_needed && !refunded_at', () => {
    const bookings = [
      makeBooking({ refund_needed: true, refunded_at: null }),
      makeBooking({ refund_needed: true, refunded_at: '2026-03-02T00:00:00Z' }), // already refunded
      makeBooking({ refund_needed: false, refunded_at: null }),
    ];
    expect(countBadges(bookings, []).refunds).toBe(1);
  });

  it('counts gcash as payments still awaiting verification', () => {
    const payments = [
      makePayment({ status: 'awaiting_payment' }),
      makePayment({ status: 'verified' }),
      makePayment({ status: 'rejected' }),
    ];
    expect(countBadges([], payments).gcash).toBe(1);
  });
});
