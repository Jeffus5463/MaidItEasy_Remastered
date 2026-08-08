// Pure nav-badge counting logic, extracted from useNavBadgeCounts()
// (Sidebar.tsx) so it's unit-testable without the react-query hooks. See
// CLAUDE.md -> Admin console -> "Declined/needs-attention surfacing".
import type { BookingRow, PaymentRow } from './types';

export interface NavBadgeCounts {
  attention: number;
  gcash: number;
  needsAttention: number;
  declined: number;
  mostRecentDeclineAt: string | null;
  refunds: number;
}

// Two distinct "attention" cases, surfaced separately: `needsAttention` is
// a genuinely blocked booking (release_and_rehold() found nobody free —
// `qualified_free_partners()` excludes the just-declined/unassigned
// partner, see supabase/migrations/*_hourly_booking_capacity.sql);
// `declined` is broader — any booking still carrying a decline flag,
// including ones release_and_rehold() *did* successfully re-hold, since an
// admin still needs to notice and confirm it (decline_reason/declined_at
// only clear on the next useAssignPartner() call). `attention` is their
// union (deduped by booking id) for the single nav pill.
export function countBadges(bookings: BookingRow[] | undefined, payments: PaymentRow[] | undefined): NavBadgeCounts {
  const pending = bookings?.filter((b) => b.status === 'pending') ?? [];
  const needsAttention = pending.filter((b) => !b.partner_id);
  const declined = (bookings ?? []).filter((b) => !!b.decline_reason);
  const attentionIds = new Set([...needsAttention, ...declined].map((b) => b.id));
  const mostRecentDeclineAt = declined.reduce<string | null>(
    (latest, b) => (b.declined_at && (!latest || b.declined_at > latest) ? b.declined_at : latest),
    null
  );
  const refundsOwed = (bookings ?? []).filter((b) => b.refund_needed && !b.refunded_at);

  return {
    attention: attentionIds.size,
    gcash: payments?.filter((p) => p.status === 'awaiting_payment').length ?? 0,
    needsAttention: needsAttention.length,
    declined: declined.length,
    mostRecentDeclineAt,
    refunds: refundsOwed.length,
  };
}
