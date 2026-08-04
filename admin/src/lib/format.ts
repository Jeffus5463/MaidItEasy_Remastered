const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function peso(amount: number) {
  return `₱${amount.toLocaleString('en-PH')}`;
}

// "9:00 AM" for a 24h hour (0-23) — mirrors src/data.ts#formatHour12 (the
// Expo app); duplicated here since the admin console shares no code with
// it, same convention as peso()/formatWhen() already being separate copies.
export function formatHour12(hour: number) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00 ${period}`;
}

// (9, 2) -> "9:00–11:00 AM" · (11, 2) -> "11:00 AM–1:00 PM"
export function formatHourRange(startHour: number, durationHours: number) {
  const endHour = startHour + durationHours;
  const startPeriod = startHour >= 12 ? 'PM' : 'AM';
  const endPeriod = endHour >= 12 ? 'PM' : 'AM';
  const startLabel = formatHour12(startHour);
  const endLabel = formatHour12(endHour % 24);
  if (startPeriod === endPeriod) return `${startLabel.replace(` ${startPeriod}`, '')}–${endLabel}`;
  return `${startLabel}–${endLabel}`;
}

// "2026-07-25", 10, 2 -> "Jul 25 · 10:00–12:00 PM"
export function formatWhen(date: string, startHour: number, durationHours: number) {
  const d = new Date(`${date}T00:00:00`);
  const dateStr = Number.isNaN(d.getTime()) ? date : `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return `${dateStr} · ${formatHourRange(startHour, durationHours)}`;
}

export function isToday(date: string) {
  const today = new Date();
  const d = new Date(`${date}T00:00:00`);
  return (
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  );
}

// `tier` only ever has a value on pre-Phase-4 bookings (the home-size step
// was dropped in favor of picking hours directly) — new cleaning bookings
// show their duration instead.
export function serviceLabel(serviceId: string, units: number | null, tier: string | null, durationHours?: number) {
  if (serviceId === 'aircon') {
    const n = units ?? 1;
    return `Aircon Cleaning & Servicing · ${n} unit${n > 1 ? 's' : ''}`;
  }
  if (tier) return `Home Cleaning · ${tier}`;
  if (durationHours) return `Home Cleaning · ${durationHours} hr${durationHours === 1 ? '' : 's'}`;
  return 'Home Cleaning';
}

// Falls back to the contact number when no name is on file (see
// profiles.full_name / bookings.customer_name — captured at booking time).
export function customerLabel(booking: { customer_name: string | null; contact: string }) {
  return booking.customer_name || booking.contact;
}

// isoTimestamp -> "2m ago" / "3h ago" / "5d ago" — coarse, dispatcher-facing
// recency (see bookings.declined_at), not a precision clock.
export function timeAgo(isoTimestamp: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(isoTimestamp).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
