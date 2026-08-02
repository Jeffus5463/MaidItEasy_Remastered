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

export function isValidGcashRef(digits: string): boolean {
  return digits.length >= 10 && digits.length <= 13;
}
