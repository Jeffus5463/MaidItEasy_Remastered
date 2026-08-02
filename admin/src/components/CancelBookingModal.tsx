'use client';

import { useCancelBooking } from '@/lib/data';
import { formatWhen, serviceLabel } from '@/lib/format';
import { colors, fonts } from '@/theme';
import { useToast } from './Toast';
import { Modal } from './shared';
import { AlertIcon, CloseIcon } from './icons';
import { BookingRow, PaymentRow } from '@/lib/types';

export function CancelBookingModal({
  booking,
  payment,
  onClose,
}: {
  booking: BookingRow;
  payment: PaymentRow | undefined;
  onClose: () => void;
}) {
  const cancel = useCancelBooking();
  const showToast = useToast();
  const paid = payment?.status === 'verified';

  const confirm = () => {
    cancel.mutate(
      { bookingId: booking.id, refundNeeded: paid },
      {
        onSuccess: () => {
          showToast(paid ? 'Booking cancelled · flagged for manual refund' : 'Booking cancelled');
          onClose();
        },
      }
    );
  };

  return (
    <Modal onClose={onClose} width={440}>
      <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${colors.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 19 }}>Cancel booking?</div>
        <div onClick={onClose} style={{ cursor: 'pointer', width: 32, height: 32, borderRadius: 9, background: '#fff', border: `1px solid ${colors.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CloseIcon />
        </div>
      </div>
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: '13.5px', color: colors.inkSoft, lineHeight: 1.5 }}>
          <b>#{booking.id.slice(0, 4).toUpperCase()}</b> — {serviceLabel(booking.service_id, booking.units, booking.tier, booking.duration_hours)},{' '}
          {formatWhen(booking.date, booking.start_hour, booking.duration_hours)}. This can&apos;t be undone from here.
        </div>
        {paid ? (
          <div style={{ background: colors.goldTintAlt, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: 13, display: 'flex', gap: 10 }}>
            <AlertIcon size={18} color={colors.goldText} />
            <div style={{ fontSize: '12.5px', color: colors.goldTextDeep, lineHeight: 1.5 }}>
              This booking&apos;s payment is already <b>verified</b>. Cancelling will flag it as
              needing a manual refund — no refund is processed automatically.
            </div>
          </div>
        ) : null}
      </div>
      <div style={{ padding: '16px 22px', borderTop: `1px solid ${colors.cardBorder}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={{ border: `1px solid ${colors.border}`, cursor: 'pointer', background: '#fff', color: colors.inkSoft, fontWeight: 700, fontSize: 14, padding: '12px 18px', borderRadius: 12 }}>
          Keep booking
        </button>
        <button
          onClick={confirm}
          disabled={cancel.isPending}
          style={{ border: 'none', cursor: 'pointer', background: colors.danger, color: '#fff', fontWeight: 800, fontSize: 14, padding: '12px 20px', borderRadius: 12 }}
        >
          {cancel.isPending ? 'Cancelling…' : paid ? 'Cancel & flag for refund' : 'Cancel booking'}
        </button>
      </div>
    </Modal>
  );
}
