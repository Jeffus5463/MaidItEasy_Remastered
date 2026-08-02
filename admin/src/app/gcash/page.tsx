'use client';

import { useState } from 'react';
import { useBookings, usePayments, useVerifyPayment } from '@/lib/data';
import { customerLabel, formatWhen, peso, serviceLabel } from '@/lib/format';
import { colors, fonts } from '@/theme';
import { TopBar, chip } from '@/components/shared';
import { GcashIcon, TickIcon } from '@/components/icons';
import { RejectPaymentModal } from '@/components/RejectPaymentModal';
import { PaymentRow } from '@/lib/types';

export default function GcashPage() {
  const { data: payments, isLoading } = usePayments();
  const { data: bookings } = useBookings();
  const verify = useVerifyPayment();
  const [rejecting, setRejecting] = useState<PaymentRow | null>(null);

  const bookingById = new Map((bookings ?? []).map((b) => [b.id, b]));
  const gcashPayments = (payments ?? []).filter((p) => p.method === 'gcash');

  return (
    <div style={{ animation: 'fadeUp .3s ease both', maxWidth: 820 }}>
      <TopBar title="GCash verification" subtitle="Verify customer payments against reference numbers" />

      <div style={{ background: colors.blueBg, border: `1px solid ${colors.blueBorder}`, borderRadius: 14, padding: '13px 16px', display: 'flex', gap: 11, alignItems: 'center', marginBottom: 16 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: colors.gcashBrand, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <GcashIcon color="#fff" size={16} />
        </span>
        <div style={{ fontSize: '12.5px', color: colors.blueText, lineHeight: 1.45 }}>
          Match each payment against its GCash reference number before assigning a partner. Verified payments unlock booking assignment.
        </div>
      </div>

      {isLoading ? (
        <div style={{ color: colors.muted, fontSize: 14 }}>Loading…</div>
      ) : gcashPayments.length === 0 ? (
        <div style={{ color: colors.muted, fontSize: 13 }}>No GCash payments yet.</div>
      ) : (
        gcashPayments.map((p) => {
          const booking = bookingById.get(p.booking_id);
          const pending = p.status === 'awaiting_payment';
          const verified = p.status === 'verified';
          const rejected = p.status === 'rejected';
          const borderColor = pending ? colors.goldBorder : rejected ? colors.dangerBorder : colors.cardBorder;
          return (
            <div key={p.id} style={{ background: '#fff', border: `1px solid ${borderColor}`, borderRadius: 16, padding: '17px 18px', marginBottom: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: colors.mutedSoft }}>#{p.booking_id.slice(0, 4).toUpperCase()}</span>
                    <span
                      style={chip(
                        pending ? colors.goldTint : rejected ? colors.dangerTint : colors.primaryTint,
                        pending ? colors.goldText : rejected ? colors.danger : colors.primaryTintText
                      )}
                    >
                      {pending ? 'Awaiting verification' : rejected ? 'Rejected' : 'Verified'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>{booking ? customerLabel(booking) : '—'}</div>
                  <div style={{ fontSize: '12.5px', color: colors.muted }}>
                    {booking ? serviceLabel(booking.service_id, booking.units, booking.tier, booking.duration_hours) : '—'} · {booking ? formatWhen(booking.date, booking.start_hour, booking.duration_hours) : '—'}
                  </div>
                  {rejected && p.reject_reason ? (
                    <div style={{ marginTop: 6, fontSize: '11.5px', color: colors.danger }}>
                      <b>Reason:</b> {p.reject_reason}
                    </div>
                  ) : null}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, color: colors.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>GCash reference</div>
                  <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 17, letterSpacing: '.02em', color: colors.blueText, marginTop: 2 }}>
                    {p.gcash_ref ?? '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: colors.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Amount</div>
                  <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 22, color: colors.primary, marginTop: 1 }}>
                    {peso(booking?.total ?? 0)}
                  </div>
                </div>
                <div>
                  {verified ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: colors.primaryTintText, fontWeight: 800, fontSize: '13.5px', background: colors.primaryTint, padding: '11px 15px', borderRadius: 11 }}>
                      <TickIcon size={16} />
                      Verified
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setRejecting(p)}
                        style={{ border: `1px solid ${colors.dangerBorder}`, cursor: 'pointer', background: '#fff', color: colors.danger, fontWeight: 700, fontSize: 13, padding: '11px 14px', borderRadius: 11 }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => verify.mutate(p.id)}
                        disabled={verify.isPending}
                        style={{ border: 'none', cursor: 'pointer', background: colors.primary, color: '#fff', fontWeight: 800, fontSize: 13, padding: '11px 16px', borderRadius: 11, display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <TickIcon size={15} color="#fff" />
                        Mark verified
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {rejecting ? <RejectPaymentModal payment={rejecting} onClose={() => setRejecting(null)} /> : null}
    </div>
  );
}
