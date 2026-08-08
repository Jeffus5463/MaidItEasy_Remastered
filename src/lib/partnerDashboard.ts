// Pure job-bucketing logic for the partner dashboard — kept import-light
// (type-only reference to BookingRow, no './supabase') so it's unit-testable
// under plain Vitest without an RN/Supabase runtime. See app/(partner)/dashboard.tsx.
import type { BookingRow } from './bookings';

export interface PartnerJobBuckets {
  awaitingJobs: BookingRow[];
  upcomingJobs: BookingRow[];
  completedJobs: BookingRow[];
  todayCount: number;
}

const byWhenAsc = (a: BookingRow, b: BookingRow) =>
  a.date === b.date ? a.start_hour - b.start_hour : a.date < b.date ? -1 : 1;

// Three buckets, each sorted by the job's own scheduled date/time (not
// created_at, which is useMyJobs' own order and reflects booking-creation
// order, not schedule order). 'pending' is excluded from every bucket: a
// Phase 4 soft-hold can set partner_id while status stays 'pending', and
// per CLAUDE.md a partner isn't meant to see a booking until it actually
// leaves 'pending' — filtering only by partner_id here isn't enough.
// 'cancelled' is excluded too.
export function bucketPartnerJobs(jobs: BookingRow[], todayIso: string): PartnerJobBuckets {
  const visibleJobs = jobs.filter((j) => j.status !== 'pending' && j.status !== 'cancelled');

  // Awaiting: dispatched but not yet accepted/declined. All of them, not
  // just the newest — Phase 2.8 fix (was `mine?.find(...)`, hiding every
  // assignment but the single latest).
  const awaitingJobs = visibleJobs.filter((j) => j.status === 'assigned' && !j.accepted_at).sort(byWhenAsc);
  // Upcoming: accepted and not yet completed (assigned-and-accepted,
  // en_route, or in_progress).
  const upcomingJobs = visibleJobs.filter((j) => !!j.accepted_at && j.status !== 'completed').sort(byWhenAsc);
  // Completed: most-recent-first. There's no completed_at column, so the
  // job's own scheduled date/time is the best available proxy.
  const completedJobs = visibleJobs.filter((j) => j.status === 'completed').sort((a, b) => byWhenAsc(b, a));

  const todayCount = visibleJobs.filter((j) => j.date === todayIso).length;

  return { awaitingJobs, upcomingJobs, completedJobs, todayCount };
}
