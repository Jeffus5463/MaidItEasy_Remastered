'use client';

import { useState } from 'react';
import { useBookings, usePartners, usePayments, useUnassignBooking } from '@/lib/data';
import { customerLabel, formatWhen, serviceLabel } from '@/lib/format';
import { colors, fonts } from '@/theme';
import { AssignModal } from '@/components/AssignModal';
import { CancelBookingModal } from '@/components/CancelBookingModal';
import { Avatar, TopBar, chip, svcIconWrap } from '@/components/shared';
import { AirconIcon, AlertIcon, BoardIcon, BroomIcon, CloseIcon, ListIcon, PlusIcon, SearchIcon, ShieldIcon } from '@/components/icons';
import { BookingRow, BookingStatus } from '@/lib/types';

const COLUMNS: { key: BookingStatus; title: string; bg: string; border: string; ink: string; dot: string; countBg: string }[] = [
  { key: 'pending', title: 'Unassigned', bg: '#fff8ee', border: '#f0d9b3', ink: '#a56a1c', dot: colors.gold, countBg: '#fdeccd' },
  { key: 'assigned', title: 'Assigned', bg: '#fff', border: colors.cardBorder, ink: colors.primaryTintText, dot: colors.primary, countBg: colors.primaryTint },
  { key: 'en_route', title: 'En route', bg: '#fff', border: colors.cardBorder, ink: colors.blue, dot: colors.blue, countBg: colors.blueTint },
  { key: 'in_progress', title: 'In progress', bg: '#fff', border: colors.cardBorder, ink: colors.oliveText, dot: colors.olive, countBg: colors.oliveTint },
  { key: 'completed', title: 'Completed', bg: '#fff', border: colors.cardBorder, ink: colors.primaryTintText, dot: colors.primary, countBg: colors.primaryTint },
  { key: 'cancelled', title: 'Cancelled', bg: '#fff', border: colors.cardBorder, ink: colors.danger, dot: colors.danger, countBg: colors.dangerTint },
];

// Cancelling is still allowed right up through in_progress — a job can be
// called off mid-service. Completed/cancelled bookings can't be re-cancelled.
const CANCELLABLE: BookingStatus[] = ['pending', 'assigned', 'en_route', 'in_progress'];

// Unassigning is only offered before the job actually starts — once a
// partner is in_progress, pulling them off mid-job is a cancel, not an
// unassign.
const UNASSIGNABLE: BookingStatus[] = ['pending', 'assigned', 'en_route'];

// Table view's rows are dense (one line per booking), so the various
// full-height banners the pipeline cards use (decline reason, needs
// attention, refund needed, auto-cancelled) collapse to a single flagged
// icon with a native title tooltip instead of taking their own row.
function flagFor(b: BookingRow): string | null {
  if (b.decline_reason) return `Declined: ${b.decline_reason}${b.decline_note ? ` — ${b.decline_note}` : ''}`;
  if (b.status === 'pending' && !b.partner_id && !b.decline_reason) return 'Needs attention — no worker is free for this slot';
  if (b.status === 'cancelled' && b.cancel_reason === 'expired-unpaid') return 'Auto-cancelled: unpaid GCash booking expired';
  if (b.refund_needed && !b.refunded_at) return 'Refund needed — payment was already verified';
  return null;
}

const TABLE_GRID = 'minmax(0,1.4fr) minmax(0,.8fr) minmax(0,1.6fr) minmax(0,1fr) minmax(0,.9fr) minmax(0,1.3fr) minmax(0,.9fr)';

export default function BoardPage() {
  const { data: bookings, isLoading } = useBookings();
  const { data: partners } = usePartners();
  const { data: payments } = usePayments();
  const unassign = useUnassignBooking();
  const [assigning, setAssigning] = useState<BookingRow | null>(null);
  const [cancelling, setCancelling] = useState<BookingRow | null>(null);
  const [view, setView] = useState<'pipeline' | 'table'>('pipeline');
  const [query, setQuery] = useState('');

  const partnerById = new Map((partners ?? []).map((p) => [p.id, p]));
  const paymentByBooking = new Map((payments ?? []).map((p) => [p.booking_id, p]));

  const payLabelFor = (b: BookingRow) => {
    const payment = paymentByBooking.get(b.id);
    if (!payment) return { label: '—', style: chip('#f0e9db', '#8a7c5f') };
    if (payment.method === 'gcash') {
      if (payment.status === 'verified') return { label: 'GCash ✓', style: chip(colors.primaryTint, colors.primaryTintText) };
      if (payment.status === 'rejected') return { label: 'GCash rejected', style: chip(colors.dangerTint, colors.danger) };
      return { label: 'GCash pending', style: chip(colors.goldTint, colors.goldText) };
    }
    return { label: 'Cash · in person', style: chip('#f0e9db', '#8a7c5f') };
  };

  // Shared per-booking derived state, used by both the pipeline cards and
  // the table rows so the two views can never drift out of sync.
  const metaFor = (b: BookingRow) => ({
    pay: payLabelFor(b),
    partner: b.partner_id ? partnerById.get(b.partner_id) : null,
    cancellable: CANCELLABLE.includes(b.status),
    unassignable: UNASSIGNABLE.includes(b.status),
  });

  // Free-text match across the fields a dispatcher would actually search
  // by: customer name/contact, barangay + landmark, the ref code shown on
  // every card/row, and the assigned partner's name. Multi-word queries
  // require every word to appear somewhere (not as one exact phrase), so
  // "jeff bajumpandan" narrows to Jeff's Bajumpandan job regardless of
  // field order.
  const searchTerms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matchesSearch = (b: BookingRow) => {
    if (searchTerms.length === 0) return true;
    const partner = b.partner_id ? partnerById.get(b.partner_id) : null;
    const ref = b.id.slice(0, 4).toUpperCase();
    const haystack = [customerLabel(b), b.contact, b.barangay, b.landmark, ref, partner?.name ?? '']
      .join(' ')
      .toLowerCase();
    return searchTerms.every((t) => haystack.includes(t));
  };
  const filtered = bookings ? bookings.filter(matchesSearch) : [];

  const segBase: React.CSSProperties = { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, padding: '8px 15px', borderRadius: 10, fontWeight: 700, fontSize: '13px', transition: 'all .15s', border: 'none', background: 'transparent' };
  const segStyle = (active: boolean): React.CSSProperties =>
    active
      ? { ...segBase, background: colors.primary, color: '#fff', boxShadow: '0 4px 10px -4px rgba(14,110,99,.5)' }
      : { ...segBase, color: colors.muted };

  return (
    <div style={{ animation: 'fadeUp .3s ease both' }}>
      <TopBar title="Booking board" subtitle="Assign verified partners to jobs" />

      {isLoading || !bookings ? (
        <div style={{ color: colors.muted, fontSize: 14 }}>Loading…</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 13, color: colors.muted, fontWeight: 600 }}>
              {searchTerms.length > 0
                ? `${filtered.length} of ${bookings.length} bookings match “${query.trim()}”`
                : `${bookings.length} bookings · grouped by status`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${colors.borderSoft}`, borderRadius: 11, padding: '9px 13px', minWidth: 220 }}>
                <SearchIcon size={15} color={colors.muted} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search bookings…"
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
              <div style={{ display: 'flex', gap: 4, background: '#fff', border: `1px solid ${colors.borderSoft}`, borderRadius: 13, padding: 4 }}>
                <button type="button" onClick={() => setView('pipeline')} style={segStyle(view === 'pipeline')}>
                  <BoardIcon size={15} color={view === 'pipeline' ? '#fff' : colors.muted} />
                  Pipeline
                </button>
                <button type="button" onClick={() => setView('table')} style={segStyle(view === 'table')}>
                  <ListIcon size={15} color={view === 'table' ? '#fff' : colors.muted} />
                  Table
                </button>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ background: '#fff', border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '32px 20px', textAlign: 'center', color: colors.muted, fontSize: 13.5 }}>
              {bookings.length === 0 ? (
                'No bookings yet.'
              ) : (
                <>
                  No bookings match “{query.trim()}”.{' '}
                  <button type="button" onClick={() => setQuery('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: colors.primary, fontWeight: 700, padding: 0, fontSize: 13.5 }}>
                    Clear search
                  </button>
                </>
              )}
            </div>
          ) : view === 'table' ? (
            <div style={{ overflowX: 'auto' }}>
              {/* Table view's rows aren't part of the design's own responsive pass (it predates
                  this feature) — a 7-column dense grid can't reasonably collapse to one column like
                  the Pipeline grid does, so it scrolls horizontally instead of squishing illegibly. */}
            <div style={{ background: '#fff', border: `1px solid ${colors.cardBorder}`, borderRadius: 18, overflow: 'hidden', minWidth: 720 }}>
              <div style={{ display: 'grid', gridTemplateColumns: TABLE_GRID, gap: 10, padding: '12px 14px', fontSize: 10, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase', background: colors.inputBg }}>
                <span>Service</span>
                <span>Time</span>
                <span>Location</span>
                <span>Customer</span>
                <span>Pay</span>
                <span>Partner</span>
                <span>Actions</span>
              </div>
              {COLUMNS.map((col) => {
                const rows = filtered.filter((b) => b.status === col.key);
                if (rows.length === 0) return null;
                return (
                  <div key={col.key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: col.bg, borderTop: `1px solid ${col.border}` }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot }} />
                      <span style={{ fontWeight: 800, fontSize: 12, color: col.ink }}>{col.title}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: col.ink, background: col.countBg, padding: '1px 8px', borderRadius: 20 }}>{rows.length}</span>
                    </div>
                    {rows.map((b) => {
                      const { pay, partner, cancellable, unassignable } = metaFor(b);
                      const flag = flagFor(b);
                      return (
                        <div key={b.id} style={{ display: 'grid', gridTemplateColumns: TABLE_GRID, gap: 10, alignItems: 'center', padding: '11px 14px', borderTop: '1px solid #f4efe4', fontSize: 12 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', flex: 'none', background: b.service_id === 'aircon' ? colors.blueDeep : colors.primary }} />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{serviceLabel(b.service_id, b.units, b.tier, b.duration_hours)}</span>
                              {flag && (
                                <span title={flag} style={{ flex: 'none', display: 'inline-flex' }}>
                                  <AlertIcon size={12} color={colors.danger} />
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '10.5px', fontWeight: 800, color: colors.mutedSoft, marginTop: 2, paddingLeft: 14 }}>#{b.id.slice(0, 4).toUpperCase()}</div>
                          </div>
                          <span style={{ color: colors.inkSoft, fontWeight: 600 }}>{formatWhen(b.date, b.start_hour, b.duration_hours)}</span>
                          <div style={{ minWidth: 0, color: colors.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <b style={{ color: colors.inkSoft }}>{b.barangay}</b> · {b.landmark}
                          </div>
                          <span style={{ color: colors.inkSoft, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{customerLabel(b)}</span>
                          <span><span style={pay.style}>{pay.label}</span></span>
                          <div style={{ minWidth: 0 }}>
                            {!b.partner_id ? (
                              col.key !== 'cancelled' ? (
                                <button
                                  onClick={() => setAssigning(b)}
                                  style={{ border: 'none', cursor: 'pointer', background: colors.primary, color: '#fff', fontWeight: 800, fontSize: '11.5px', padding: '7px 12px', borderRadius: 9, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                >
                                  <PlusIcon size={13} />
                                  Assign
                                </button>
                              ) : (
                                <span style={{ color: colors.mutedSoft }}>—</span>
                              )
                            ) : b.status === 'pending' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                                <div style={{ opacity: 0.6 }}>
                                  <Avatar initials={partner?.initials ?? '?'} size={24} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: '11.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{partner?.name ?? 'Unknown'}</div>
                                  <div style={{ fontSize: '9.5px', color: colors.goldText, fontWeight: 700 }}>Held</div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                                <Avatar initials={partner?.initials ?? '?'} size={24} />
                                <span style={{ fontWeight: 700, fontSize: '11.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{partner?.name ?? 'Unknown'}</span>
                                <span style={{ flex: 'none', display: 'inline-flex' }}><ShieldIcon size={11} /></span>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                            {b.partner_id && b.status === 'pending' && (
                              <button
                                onClick={() => setAssigning(b)}
                                style={{ border: 'none', cursor: 'pointer', background: colors.primary, color: '#fff', fontWeight: 800, fontSize: '10.5px', padding: '5px 9px', borderRadius: 7 }}
                              >
                                Confirm
                              </button>
                            )}
                            {b.partner_id && b.status !== 'pending' && unassignable && (
                              <button
                                onClick={() => unassign.mutate(b.id)}
                                disabled={unassign.isPending}
                                style={{ border: `1px solid ${colors.border}`, cursor: 'pointer', background: '#fff', color: colors.inkSoft, fontWeight: 700, fontSize: '10.5px', padding: '5px 9px', borderRadius: 7 }}
                              >
                                Unassign
                              </button>
                            )}
                            {cancellable && (
                              <button
                                onClick={() => setCancelling(b)}
                                style={{ border: 'none', cursor: 'pointer', background: 'transparent', color: colors.danger, fontWeight: 700, fontSize: '10.5px', padding: 0 }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            </div>
          ) : (
            <div className="grid-pipe" style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, alignItems: 'start' }}>
              {COLUMNS.map((col) => {
                const cards = filtered.filter((b) => b.status === col.key);
                return (
                  <div key={col.key} style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 16, padding: 12, minHeight: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 10px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 800, fontSize: 13, color: col.ink }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot }} />
                        {col.title}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: col.ink, background: col.countBg, padding: '1px 8px', borderRadius: 20 }}>
                        {cards.length}
                      </span>
                    </div>
                    {cards.map((b) => {
                      const { pay, partner, cancellable, unassignable } = metaFor(b);
                      return (
                        <div key={b.id} style={{ background: '#fff', border: `1px solid ${colors.cardBorder}`, borderRadius: 13, padding: 12, marginBottom: 10, boxShadow: '0 2px 6px -3px rgba(20,40,36,.15)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: colors.mutedSoft }}>#{b.id.slice(0, 4).toUpperCase()}</span>
                            <span style={pay.style}>{pay.label}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            <div style={svcIconWrap(b.service_id, 22)}>{b.service_id === 'aircon' ? <AirconIcon size={12} /> : <BroomIcon size={12} />}</div>
                            <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{serviceLabel(b.service_id, b.units, b.tier, b.duration_hours)}</div>
                          </div>
                          <div style={{ fontSize: '11.5px', color: colors.muted, marginTop: 3 }}>{formatWhen(b.date, b.start_hour, b.duration_hours)}</div>
                          <div style={{ fontSize: '11.5px', color: colors.muted, marginTop: 3 }}>
                            <b style={{ color: '#5c655f' }}>{b.barangay}</b> · {b.landmark}
                          </div>
                          <div style={{ fontSize: '11.5px', color: colors.muted, marginTop: 3 }}>{customerLabel(b)}</div>
                          {!!b.decline_reason && (
                            <div style={{ marginTop: 7, background: colors.dangerTint, border: `1px solid ${colors.dangerBorder}`, borderRadius: 9, padding: '6px 9px', fontSize: '11px', color: colors.danger }}>
                              <b>Declined:</b> {b.decline_reason}
                              {b.decline_note ? ` — ${b.decline_note}` : ''}
                            </div>
                          )}
                          {b.status === 'pending' && !b.partner_id && !b.decline_reason && (
                            <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 6, background: colors.dangerTint, border: `1px solid ${colors.dangerBorder}`, borderRadius: 9, padding: '6px 9px', fontSize: '11px', color: colors.danger }}>
                              <AlertIcon size={12} color={colors.danger} />
                              <b>Needs attention</b> — no worker is free for this slot
                            </div>
                          )}
                          {b.status === 'cancelled' && b.cancel_reason === 'expired-unpaid' && (
                            <div style={{ marginTop: 7, background: '#f0e9db', border: `1px solid ${colors.cardBorder}`, borderRadius: 9, padding: '6px 9px', fontSize: '11px', color: '#8a7c5f' }}>
                              <b>Auto-cancelled:</b> unpaid GCash booking expired
                            </div>
                          )}
                          {b.refund_needed && !b.refunded_at && (
                            <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 6, background: colors.goldTintAlt, border: `1px solid ${colors.goldBorder}`, borderRadius: 9, padding: '6px 9px', fontSize: '11px', color: colors.goldTextDeep }}>
                              <AlertIcon size={12} color={colors.goldText} />
                              <b>Refund needed</b> — payment was already verified
                            </div>
                          )}
                          {col.key !== 'cancelled' && (
                            <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid #f2ece0' }}>
                              {!b.partner_id ? (
                                <button
                                  onClick={() => setAssigning(b)}
                                  style={{ width: '100%', border: 'none', cursor: 'pointer', background: colors.primary, color: '#fff', fontWeight: 800, fontSize: '12.5px', padding: 9, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                >
                                  <PlusIcon size={14} />
                                  Assign partner
                                </button>
                              ) : b.status === 'pending' ? (
                                // Soft-held (Phase 4), not yet dispatched — the
                                // engine already reserved this worker's time,
                                // but "assignment stays manual" means the admin
                                // still has to confirm (or override) it here.
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ opacity: 0.6 }}>
                                    <Avatar initials={partner?.initials ?? '?'} size={30} />
                                  </div>
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '12.5px' }}>{partner?.name ?? 'Unknown'}</div>
                                    <div style={{ fontSize: '10.5px', color: colors.goldText, fontWeight: 700 }}>Held — awaiting confirm</div>
                                  </div>
                                  <button
                                    onClick={() => setAssigning(b)}
                                    style={{ border: 'none', cursor: 'pointer', background: colors.primary, color: '#fff', fontWeight: 800, fontSize: '10.5px', padding: '7px 10px', borderRadius: 8, flex: 'none' }}
                                  >
                                    Confirm
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Avatar initials={partner?.initials ?? '?'} size={30} />
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                      {partner?.name ?? 'Unknown'}
                                      <ShieldIcon />
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: colors.primaryTintText, fontWeight: 700 }}>
                                      {b.assignment_source === 'manual' ? 'Manually assigned' : 'Auto-assigned'}
                                    </div>
                                  </div>
                                  {unassignable && (
                                    <button
                                      onClick={() => unassign.mutate(b.id)}
                                      disabled={unassign.isPending}
                                      style={{ border: `1px solid ${colors.border}`, cursor: 'pointer', background: '#fff', color: colors.inkSoft, fontWeight: 700, fontSize: '10.5px', padding: '6px 9px', borderRadius: 8, flex: 'none' }}
                                    >
                                      Unassign
                                    </button>
                                  )}
                                </div>
                              )}
                              {cancellable && (
                                <button
                                  onClick={() => setCancelling(b)}
                                  style={{ width: '100%', marginTop: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: colors.danger, fontWeight: 700, fontSize: '11.5px', padding: 4 }}
                                >
                                  Cancel booking
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {assigning ? <AssignModal booking={assigning} onClose={() => setAssigning(null)} /> : null}
      {cancelling ? (
        <CancelBookingModal booking={cancelling} payment={paymentByBooking.get(cancelling.id)} onClose={() => setCancelling(null)} />
      ) : null}
    </div>
  );
}
