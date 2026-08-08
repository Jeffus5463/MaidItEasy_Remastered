import { describe, expect, it } from 'vitest';
import {
  formatGcashRef,
  formatPhoneNoZero,
  formatPhoneWithZero,
  isValidGcashRef,
  isValidPhoneNoZero,
  isValidPhoneWithZero,
} from './format';

describe('isValidGcashRef', () => {
  it('accepts a well-formed 13-digit reference', () => {
    expect(isValidGcashRef('9171234567890')).toBe(true);
  });

  it('rejects the wrong length', () => {
    expect(isValidGcashRef('12345')).toBe(false);
    expect(isValidGcashRef('12345678901234')).toBe(false);
  });

  it('rejects non-digit characters', () => {
    expect(isValidGcashRef('917123456789a')).toBe(false);
  });

  it('rejects all 13 digits the same', () => {
    expect(isValidGcashRef('1111111111111')).toBe(false);
  });

  it('rejects an ascending run, including the 9->0 wrap', () => {
    expect(isValidGcashRef('1234567890123')).toBe(false);
  });

  it('rejects a descending run, including the 0->9 wrap', () => {
    expect(isValidGcashRef('9876543210987')).toBe(false);
  });

  it('rejects a 4-digit block repeated to fill the reference', () => {
    expect(isValidGcashRef('1234123412341')).toBe(false);
  });
});

describe('formatGcashRef', () => {
  it('groups digits into 4s separated by spaces', () => {
    expect(formatGcashRef('9171234567890')).toBe('9171 2345 6789 0');
  });
});

describe('phone (no leading zero)', () => {
  it('formats progressively as digits are typed', () => {
    expect(formatPhoneNoZero('917')).toBe('917');
    expect(formatPhoneNoZero('917123')).toBe('917 123');
    expect(formatPhoneNoZero('9171234567')).toBe('917 123 4567');
  });

  it('validates exactly 10 digits starting with 9', () => {
    expect(isValidPhoneNoZero('9171234567')).toBe(true);
    expect(isValidPhoneNoZero('8171234567')).toBe(false);
    expect(isValidPhoneNoZero('917123456')).toBe(false);
  });
});

describe('phone (with leading zero)', () => {
  it('formats progressively as digits are typed', () => {
    expect(formatPhoneWithZero('0917')).toBe('0917');
    expect(formatPhoneWithZero('0917123')).toBe('0917 123');
    expect(formatPhoneWithZero('09171234567')).toBe('0917 123 4567');
  });

  it('validates exactly 11 digits starting with 09', () => {
    expect(isValidPhoneWithZero('09171234567')).toBe(true);
    expect(isValidPhoneWithZero('19171234567')).toBe(false);
    expect(isValidPhoneWithZero('0917123456')).toBe(false);
  });
});
