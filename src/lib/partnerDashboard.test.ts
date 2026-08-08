import { describe, expect, it } from 'vitest';
import type { BookingRow } from './bookings';
import { bucketPartnerJobs } from './partnerDashboard';

let seq = 0;
function makeBooking(overrides: Partial<BookingRow>): BookingRow {
  seq += 1;
  return {
    id: `booking-${seq}`,
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
    latitude: null,
    longitude: null,
    total: 800,
    status: 'assigned',
    accepted_at: null,
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

describe('bucketPartnerJobs', () => {
  it('excludes pending jobs even when a partner is soft-held', () => {
    const jobs = [makeBooking({ status: 'pending', partner_id: 'partner-1' })];
    const { awaitingJobs, upcomingJobs, completedJobs } = bucketPartnerJobs(jobs, '2026-03-10');
    expect(awaitingJobs).toHaveLength(0);
    expect(upcomingJobs).toHaveLength(0);
    expect(completedJobs).toHaveLength(0);
  });

  it('excludes cancelled jobs', () => {
    const jobs = [makeBooking({ status: 'cancelled' })];
    const { awaitingJobs, upcomingJobs, completedJobs } = bucketPartnerJobs(jobs, '2026-03-10');
    expect(awaitingJobs).toHaveLength(0);
    expect(upcomingJobs).toHaveLength(0);
    expect(completedJobs).toHaveLength(0);
  });

  it('buckets assigned-not-yet-accepted jobs as awaiting', () => {
    const jobs = [makeBooking({ status: 'assigned', accepted_at: null })];
    const { awaitingJobs, upcomingJobs } = bucketPartnerJobs(jobs, '2026-03-10');
    expect(awaitingJobs).toHaveLength(1);
    expect(upcomingJobs).toHaveLength(0);
  });

  it('buckets accepted assigned/en_route/in_progress jobs as upcoming', () => {
    const jobs = [
      makeBooking({ status: 'assigned', accepted_at: '2026-03-05T00:00:00Z' }),
      makeBooking({ status: 'en_route', accepted_at: '2026-03-05T00:00:00Z' }),
      makeBooking({ status: 'in_progress', accepted_at: '2026-03-05T00:00:00Z' }),
    ];
    const { awaitingJobs, upcomingJobs } = bucketPartnerJobs(jobs, '2026-03-10');
    expect(awaitingJobs).toHaveLength(0);
    expect(upcomingJobs).toHaveLength(3);
  });

  it('buckets completed jobs as completed, most-recent-scheduled-first', () => {
    const jobs = [
      makeBooking({ status: 'completed', date: '2026-03-01', start_hour: 9 }),
      makeBooking({ status: 'completed', date: '2026-03-05', start_hour: 14 }),
    ];
    const { completedJobs } = bucketPartnerJobs(jobs, '2026-03-10');
    expect(completedJobs.map((j) => j.date)).toEqual(['2026-03-05', '2026-03-01']);
  });

  it('sorts awaiting/upcoming ascending by date then start_hour', () => {
    const jobs = [
      makeBooking({ status: 'assigned', accepted_at: null, date: '2026-03-12', start_hour: 9 }),
      makeBooking({ status: 'assigned', accepted_at: null, date: '2026-03-11', start_hour: 15 }),
      makeBooking({ status: 'assigned', accepted_at: null, date: '2026-03-11', start_hour: 9 }),
    ];
    const { awaitingJobs } = bucketPartnerJobs(jobs, '2026-03-10');
    expect(awaitingJobs.map((j) => [j.date, j.start_hour])).toEqual([
      ['2026-03-11', 9],
      ['2026-03-11', 15],
      ['2026-03-12', 9],
    ]);
  });

  it('counts only visible jobs scheduled today', () => {
    const jobs = [
      makeBooking({ status: 'assigned', accepted_at: null, date: '2026-03-10' }),
      makeBooking({ status: 'completed', date: '2026-03-10' }),
      makeBooking({ status: 'pending', date: '2026-03-10' }), // excluded (pending)
      makeBooking({ status: 'assigned', accepted_at: null, date: '2026-03-11' }), // different day
    ];
    const { todayCount } = bucketPartnerJobs(jobs, '2026-03-10');
    expect(todayCount).toBe(2);
  });
});
