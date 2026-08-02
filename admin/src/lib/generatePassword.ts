// Single-use default password for a newly created worker account — the
// admin hands it off once, and must_change_password forces a real one on
// first login. Not meant to be memorable or long-lived.
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function generatePassword(length = 12): string {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return password;
}
