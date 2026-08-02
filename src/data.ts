// MaidItEasy catalog + booking data — mirrors the design prototype exactly.
import { colors } from './theme';

export const peso = (n: number) => '₱' + n.toLocaleString('en-US');

export type ServiceId = 'cleaning' | 'aircon';
export type PricingModel = 'per_hour' | 'per_unit';

export interface Service {
  id: ServiceId;
  name: string;
  desc: string;
  price: number;
  suffix: string;
  duration: string;
  accent: string;
  tint: string;
  includes: string[];
  priceLabel: string; // "Starting at" | "Fixed price"
  pricingModel: PricingModel;
  // per_hour only — placeholder, not a final price (Phase 4, flagged for
  // the operator to confirm before launch). Mirrors services.hourly_rate.
  hourlyRate: number | null;
  // per_unit only — mirrors services.estimated_minutes_per_unit, used to
  // derive duration_hours = ceil(units * estimatedMinutesPerUnit / 60).
  estimatedMinutesPerUnit: number | null;
}

export const SERVICES: Record<ServiceId, Service> = {
  cleaning: {
    id: 'cleaning',
    name: 'Home Cleaning',
    desc: 'A thorough general cleaning of your home by a vetted partner who brings their own supplies.',
    price: 399,
    suffix: '/hr',
    duration: '2–3 hrs',
    accent: colors.primary,
    tint: colors.primaryTintBg,
    priceLabel: 'Per hour',
    pricingModel: 'per_hour',
    hourlyRate: 399,
    estimatedMinutesPerUnit: null,
    includes: [
      'Sweeping & mopping of all rooms',
      'Dusting of surfaces, fixtures & furniture',
      'Bathroom & kitchen deep clean',
      'Trash collection & disposal',
      'Cleaning supplies & equipment provided',
    ],
  },
  aircon: {
    id: 'aircon',
    name: 'Aircon Cleaning & Servicing',
    desc: 'Deep cleaning and servicing of your aircon units for cooler, cleaner, more efficient air.',
    price: 600,
    suffix: '/unit',
    duration: '~45 min/unit',
    accent: colors.blue,
    tint: colors.blueTint,
    priceLabel: 'Fixed price',
    pricingModel: 'per_unit',
    hourlyRate: null,
    estimatedMinutesPerUnit: 45,
    includes: [
      'Filter & front cover deep cleaning',
      'Evaporator coil & fan blower cleaning',
      'Drainage flush & leak inspection',
      'Refrigerant level check',
      'Post-service cooling performance test',
    ],
  },
};

export const SERVICE_LIST = Object.values(SERVICES);

// Business hours + booking-length rules (Phase 4) — must match the SQL
// constant functions business_open_hour()/business_close_hour()/
// buffer_minutes()/min_booking_hours() in
// supabase/migrations/*_hourly_booking_schema.sql, which are the real
// source of truth enforced server-side; these mirror them for the UI so
// the grid/stepper don't need a round trip just to know their own bounds.
export const BUSINESS_OPEN_HOUR = 9;
export const BUSINESS_CLOSE_HOUR = 21;
export const BUFFER_MINUTES = 30;
export const MIN_BOOKING_HOURS = 2;

// "9:00 AM" for a 24h hour (0-23).
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
  if (startPeriod === endPeriod) {
    return `${startLabel.replace(` ${startPeriod}`, '')}–${endLabel}`;
  }
  return `${startLabel}–${endLabel}`;
}

export const BARANGAYS = ['Daro', 'Piapi', 'Bantayan', 'Taclobo', 'Bajumpandan', 'Calindagan', 'Looc'];

export interface TrackStep {
  title: string;
  d: string;
}

export const TRACK_STEPS: TrackStep[] = [
  { title: 'Pending', d: 'Finding a verified partner for you' },
  { title: 'Assigned', d: 'A verified partner is confirmed for your booking' },
  { title: 'En route', d: 'Your partner is on the way to you' },
  { title: 'In progress', d: 'Your service is being performed' },
  { title: 'Completed', d: 'Job done — see the before & after' },
];

export type BookingStatus = 'Pending' | 'Assigned' | 'En route' | 'In progress' | 'Completed' | 'Cancelled';

// Next 7 bookable dates, starting "tomorrow" relative to now.
export interface DateOpt {
  dow: string;
  day: string;
  mon: string;
  full: string;
  iso: string;
}

// Local-calendar "YYYY-MM-DD" -- NOT `Date#toISOString().slice(0, 10)`,
// which is UTC and disagrees with the local calendar day near midnight in
// any timezone ahead of UTC (e.g. at 2am in UTC+4, the UTC date is still
// "yesterday"). Every date sent to the server must agree with what's shown
// on screen, so this is the one place either gets computed.
export function toLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function nextDates(count = 7): DateOpt[] {
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const base = new Date();
  base.setDate(base.getDate() + 1);
  const out: DateOpt[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push({
      dow: dow[d.getDay()],
      day: String(d.getDate()),
      mon: mon[d.getMonth()],
      full: `${dow[d.getDay()]}, ${mon[d.getMonth()]} ${d.getDate()}`,
      iso: toLocalIso(d),
    });
  }
  return out;
}

export const GCASH_NUMBER = '0917 555 0123';
export const OFFICE = 'MaidItEasy office along Perdices St., Dumaguete';

// There is intentionally no customer self-cancel — changes/cancellations
// go through a phone call, so this is the one place that number lives.
export const SUPPORT_PHONE = '0917 555 0100';

export const DUMAGUETE_CENTER = { latitude: 9.3068, longitude: 123.3054 };

/* ---------- Partner app ---------- */

// Pure commission for the prototype (decisions-log #8): earn = job fee × rate.
export const COMMISSION_RATE = 0.2;

export const DECLINE_REASONS = [
  'Schedule conflict',
  'Location too far',
  'Not equipped for this job',
  'Personal emergency',
];
