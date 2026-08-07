// Phone number and GCash reference formatting/validation shared across
// phone, location, and payment screens.

// PH mobile local subscriber number without the leading 0 (used where a
// separate "+63" prefix is already shown, e.g. the phone sign-in screen).
export function formatPhoneNoZero(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
}

export function isValidPhoneNoZero(digits: string): boolean {
  return digits.length === 10 && digits[0] === '9';
}

// PH mobile number with the leading 0 (used for standalone contact fields).
export function formatPhoneWithZero(digits: string): string {
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
}

export function isValidPhoneWithZero(digits: string): boolean {
  return digits.length === 11 && digits.slice(0, 2) === '09';
}

export function formatGcashRef(digits: string): string {
  return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
}

// Real GCash reference numbers are 13 digits. This is a format check only —
// the screenshot + admin review remain the real verification (Phase 10);
// this just stops obvious junk (e.g. "1234 1234 1234" used to pass at
// length 13... it no longer does) from reaching that human review at all.
export function isValidGcashRef(digits: string): boolean {
  if (!/^\d{13}$/.test(digits)) return false;

  // All 13 digits the same, e.g. "1111111111111".
  if (/^(\d)\1{12}$/.test(digits)) return false;

  // A simple ascending or descending run (wrapping 9->0 or 0->9), e.g.
  // "1234567890123" or "9876543210987".
  const isRun = (step: number) =>
    digits.split('').every((d, i) => i === 0 || Number(d) === (Number(digits[i - 1]) + step + 10) % 10);
  if (isRun(1) || isRun(-1)) return false;

  // A 4-digit block repeated to fill the reference, e.g. "1234123412341".
  const block = digits.slice(0, 4);
  if (block.repeat(4).slice(0, 13) === digits) return false;

  return true;
}
