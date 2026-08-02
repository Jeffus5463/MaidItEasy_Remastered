'use client';

import { useState } from 'react';
import { useBookings, usePartners, usePayments, useUnassignBooking } from '@/lib/data';
import { customerLabel, formatWhen, serviceLabel } from '@/lib/format';
import { colors } from '@/theme';
import { AssignModal } from '@/components/AssignModal';
import { CancelBookingModal } from '@/components/CancelBookingModal';
import { Avatar, TopBar, chip, svcIconWrap } from '@/components/shared';
import { AirconIcon, AlertIcon, BroomIcon, PlusIcon, ShieldIcon } from '@/components/icons';
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

export default function BoardPage() {
  const { data: bookings, isLoading } = useBookings();
  const { data: partners } = usePartners();
  const { data: payments } = usePayments();
  const unassign = useUnassignBooking();
  const [assigning, setAssigning] = useState<BookingRow | null>(null);
  const [cancelling, setCancelling] = useState<BookingRow | null>(null);

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

  return (
    <div style={{ animation: 'fadeUp .3s ease both' }}>
      <TopBar title="Booking board" subtitle="Assign verified partners to jobs" />

      {isLoading || !bookings ? (
        <div style={{ color: colors.muted, fontSize: 14 }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, alignItems: 'start' }}>
          {COLUMNS.map((col) => {
            const cards = bookings.filter((b) => b.status === col.key);
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
                  const pay = payLabelFor(b);
                  const partner = b.partner_id ? partnerById.get(b.partner_id) : null;
                  const cancellable = CANCELLABLE.includes(b.status);
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
                      {b.refund_needed && (
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
                              {UNASSIGNABLE.includes(b.status) && (
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

      {assigning ? <AssignModal booking={assigning} onClose={() => setAssigning(null)} /> : null}
      {cancelling ? (
        <CancelBookingModal booking={cancelling} payment={paymentByBooking.get(cancelling.id)} onClose={() => setCancelling(null)} />
      ) : null}
    </div>
  );
}
