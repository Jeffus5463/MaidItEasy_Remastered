import { afterEach, describe, expect, it, vi } from 'vitest';
import { bookingTicketCode, computeCommission, formatHour12, formatHourRange, nextDates, peso, toLocalIso } from './data';

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

  it('handles a regular AM and PM hour', () => {
    expect(formatHour12(9)).toBe('9:00 AM');
    expect(formatHour12(13)).toBe('1:00 PM');
    expect(formatHour12(23)).toBe('11:00 PM');
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

describe('toLocalIso', () => {
  it('formats as YYYY-MM-DD in local time, zero-padded', () => {
    expect(toLocalIso(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toLocalIso(new Date(2026, 10, 22))).toBe('2026-11-22');
  });
});

describe('nextDates', () => {
  it('starts tomorrow (relative to now) and produces N sequential dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0));

    const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dates = nextDates(5);

    expect(dates).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      const expected = new Date(2026, 2, 11 + i); // "tomorrow" (Mar 11) + i
      expect(dates[i].iso).toBe(toLocalIso(expected));
      expect(dates[i].dow).toBe(dowNames[expected.getDay()]);
      expect(dates[i].day).toBe(String(expected.getDate()));
      expect(dates[i].mon).toBe(monNames[expected.getMonth()]);
    }
  });
});

describe('bookingTicketCode', () => {
  it('is the first 4 hex chars of the booking id, uppercased', () => {
    // Fixture shared with admin/src/lib/format.test.ts — the two apps
    // implement this independently (CLAUDE.md's "identical formula"
    // convention) and this pair of tests guards them from drifting apart.
    expect(bookingTicketCode('a1b2c3d4-e5f6-47a8-9abc-1234567890ab')).toBe('#A1B2');
  });
});

describe('computeCommission', () => {
  it('rounds job fee × rate to the nearest peso', () => {
    expect(computeCommission(1000, 0.2)).toBe(200);
    expect(computeCommission(999, 0.2)).toBe(200); // 199.8 rounds up
    expect(computeCommission(1002, 0.2)).toBe(200); // 200.4 rounds down
  });

  it('defaults to COMMISSION_RATE when no rate is given', () => {
    expect(computeCommission(1000)).toBe(200);
  });
});
