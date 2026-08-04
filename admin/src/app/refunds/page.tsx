'use client';

import { useState } from 'react';
import { useBookings } from '@/lib/data';
import { customerLabel, formatWhen, peso, serviceLabel } from '@/lib/format';
import { colors, fonts } from '@/theme';
import { TopBar, chip } from '@/components/shared';
import { CloseIcon, RefundIcon, SearchIcon, TickIcon } from '@/components/icons';
import { MarkRefundedModal } from '@/components/MarkRefundedModal';
import { BookingRow } from '@/lib/types';

// Both the customer self-cancel path (cancel_booking_customer(), within the
// free-cancellation window) and an admin's own CancelBookingModal set
// refund_needed the same way, so this queue picks up both — one ledger,
// one place to clear it (see CLAUDE.md -> Admin console).
export default function RefundsPage() {
  const { data: bookings, isLoading } = useBookings();
  const [refunding, setRefunding] = useState<BookingRow | null>(null);
  const [query, setQuery] = useState('');

  const owedAll = (bookings ?? []).filter((b) => b.refund_needed);
  const owed = owedAll.filter((b) => !b.refunded_at);
  const processed = owedAll
    .filter((b) => b.refunded_at)
    .sort((a, b) => new Date(b.refunded_at!).getTime() - new Date(a.refunded_at!).getTime())
    .slice(0, 10);

  const searchTerms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matchesSearch = (b: BookingRow) => {
    if (searchTerms.length === 0) return true;
    const ref = b.id.slice(0, 4).toUpperCase();
    const haystack = [customerLabel(b), b.contact, b.barangay, b.landmark, ref].join(' ').toLowerCase();
    return searchTerms.every((t) => haystack.includes(t));
  };
  const filtered = owed.filter(matchesSearch);

  return (
    <div style={{ animation: 'fadeUp .3s ease both', maxWidth: 820 }}>
      <TopBar title="Refunds" subtitle="Cancelled bookings whose GCash payment was already verified" />

      <div style={{ background: colors.dangerTint, border: `1px solid ${colors.dangerBorder}`, borderRadius: 14, padding: '13px 16px', display: 'flex', gap: 11, alignItems: 'center', marginBottom: 16 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: colors.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <RefundIcon color="#fff" size={16} />
        </span>
        <div style={{ fontSize: '12.5px', color: colors.danger, lineHeight: 1.45 }}>
          Send each refund via GCash yourself, then mark it here. No money moves automatically — this is a
          reconciliation record only.
        </div>
      </div>

      {owed.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: colors.muted, fontWeight: 600 }}>
            {searchTerms.length > 0
              ? `${filtered.length} of ${owed.length} refunds match “${query.trim()}”`
              : `${owed.length} refund${owed.length === 1 ? '' : 's'} owed`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${colors.borderSoft}`, borderRadius: 11, padding: '9px 13px', minWidth: 220 }}>
            <SearchIcon size={15} color={colors.muted} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search refunds…"
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: colors.ink, flex: 1, minWidth: 0, fontFamily: fonts.body }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', flex: 'none' }}
              >
                <CloseIcon size={13} color={colors.muted} />
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ color: colors.muted, fontSize: 14 }}>Loading…</div>
      ) : owed.length === 0 ? (
        <div style={{ color: colors.muted, fontSize: 13 }}>No refunds owed — all caught up.</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '32px 20px', textAlign: 'center', color: colors.muted, fontSize: 13.5 }}>
          No refunds match “{query.trim()}”.{' '}
          <button type="button" onClick={() => setQuery('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: colors.primary, fontWeight: 700, padding: 0, fontSize: 13.5 }}>
            Clear search
          </button>
        </div>
      ) : (
        filtered.map((b) => (
          <div key={b.id} style={{ background: '#fff', border: `1px solid ${colors.dangerBorder}`, borderRadius: 16, padding: '17px 18px', marginBottom: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: colors.mutedSoft }}>#{b.id.slice(0, 4).toUpperCase()}</span>
                  <span style={chip(colors.dangerTint, colors.danger)}>
                    {b.cancel_reason === 'customer-cancelled' ? 'Cancelled by customer' : b.cancel_reason === 'customer-cancelled-late' ? 'Cancelled by customer (late)' : 'Cancelled'}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>{customerLabel(b)}</div>
                <div style={{ fontSize: '12.5px', color: colors.muted }}>
                  {serviceLabel(b.service_id, b.units, b.tier, b.duration_hours)} · {formatWhen(b.date, b.start_hour, b.duration_hours)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: colors.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Amount</div>
                <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 22, color: colors.danger, marginTop: 1 }}>{peso(b.total)}</div>
              </div>
              <div>
                <button
                  onClick={() => setRefunding(b)}
                  style={{ border: 'none', cursor: 'pointer', background: colors.primary, color: '#fff', fontWeight: 800, fontSize: 13, padding: '11px 16px', borderRadius: 11, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <TickIcon size={15} color="#fff" />
                  Mark refund sent
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 17, margin: '24px 0 12px' }}>Recently processed</div>
      {processed.length === 0 ? (
        <div style={{ color: colors.muted, fontSize: 14 }}>No refunds processed yet.</div>
      ) : (
        processed.map((b) => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 4px', borderBottom: '1px solid #f2ece0' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{customerLabel(b)}</div>
              <div style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>
                Refunded {new Date(b.refunded_at!).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <div style={chip(colors.primaryTint, colors.primaryTintText)}>{peso(b.total)}</div>
          </div>
        ))
      )}

      {refunding ? <MarkRefundedModal booking={refunding} onClose={() => setRefunding(null)} /> : null}
    </div>
  );
}
