import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bookingTicketCode,
  customerLabel,
  formatHour12,
  formatHourRange,
  formatWhen,
  isToday,
  peso,
  serviceLabel,
  timeAgo,
} from './format';

afterEach(() => {
  vi.useRealTimers();
});

describe('peso', () => {
  it('formats with the peso sign and thousands separators', () => {
    expect(peso(0)).toBe('₱0');
    expect(peso(1234567)).toBe('₱1,234,567');
  });
});

describe('formatHour12', () => {
  it('handles midnight and noon boundaries', () => {
    expect(formatHour12(0)).toBe('12:00 AM');
    expect(formatHour12(12)).toBe('12:00 PM');
  });
});

describe('formatHourRange', () => {
  it('collapses the period when start and end share one', () => {
    expect(formatHourRange(9, 2)).toBe('9:00–11:00 AM');
  });

  it('shows both periods when the range crosses noon', () => {
    expect(formatHourRange(11, 2)).toBe('11:00 AM–1:00 PM');
  });
});

describe('formatWhen', () => {
  it('combines the short date with the hour range', () => {
    expect(formatWhen('2026-07-25', 9, 2)).toBe('Jul 25 · 9:00–11:00 AM');
  });
});

describe('isToday', () => {
  it('compares only year/month/day, not time', () => {
    vi.setSystemTime(new Date(2026, 2, 10, 23, 59, 0));
    expect(isToday('2026-03-10')).toBe(true);
    expect(isToday('2026-03-11')).toBe(false);
  });
});

describe('serviceLabel', () => {
  it('labels aircon by unit count, singular vs plural', () => {
    expect(serviceLabel('aircon', 1, null)).toBe('Aircon Cleaning & Servicing · 1 unit');
    expect(serviceLabel('aircon', 3, null)).toBe('Aircon Cleaning & Servicing · 3 units');
  });

  it('prefers tier when set, then duration, then a bare label', () => {
    expect(serviceLabel('cleaning', null, 'Standard')).toBe('Home Cleaning · Standard');
    expect(serviceLabel('cleaning', null, null, 2)).toBe('Home Cleaning · 2 hrs');
    expect(serviceLabel('cleaning', null, null, 1)).toBe('Home Cleaning · 1 hr');
    expect(serviceLabel('cleaning', null, null)).toBe('Home Cleaning');
  });
});

describe('customerLabel', () => {
  it('falls back to the contact number when no name is on file', () => {
    expect(customerLabel({ customer_name: 'Ana Reyes', contact: '0917 123 4567' })).toBe('Ana Reyes');
    expect(customerLabel({ customer_name: null, contact: '0917 123 4567' })).toBe('0917 123 4567');
  });
});

describe('bookingTicketCode', () => {
  it('is the first 4 hex chars of the booking id, uppercased', () => {
    // Fixture shared with src/data.test.ts (Expo app) — the two apps
    // implement this independently (CLAUDE.md's "identical formula"
    // convention) and this pair of tests guards them from drifting apart.
    expect(bookingTicketCode('a1b2c3d4-e5f6-47a8-9abc-1234567890ab')).toBe('#A1B2');
  });
});

describe('timeAgo', () => {
  it('formats minutes, hours, and days ago', () => {
    const now = new Date('2026-03-10T12:00:00.000Z');
    vi.setSystemTime(now);
    const secondsAgo = (s: number) => new Date(now.getTime() - s * 1000).toISOString();

    expect(timeAgo(secondsAgo(10))).toBe('just now');
    expect(timeAgo(secondsAgo(5 * 60))).toBe('5m ago');
    expect(timeAgo(secondsAgo(3 * 3600))).toBe('3h ago');
    expect(timeAgo(secondsAgo(2 * 86400))).toBe('2d ago');
  });
});
