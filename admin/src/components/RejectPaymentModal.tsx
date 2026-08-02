'use client';

import { useState } from 'react';
import { useRejectPayment } from '@/lib/data';
import { colors, fonts } from '@/theme';
import { useToast } from './Toast';
import { Modal } from './shared';
import { CloseIcon } from './icons';
import { PaymentRow } from '@/lib/types';

export function RejectPaymentModal({ payment, onClose }: { payment: PaymentRow; onClose: () => void }) {
  const reject = useRejectPayment();
  const showToast = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const canSubmit = reason.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    setError('');
    reject.mutate(
      { paymentId: payment.id, reason: reason.trim() },
      {
        onSuccess: () => {
          showToast(`Payment #${payment.booking_id.slice(0, 4).toUpperCase()} rejected — customer will be notified`);
          onClose();
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not reject this payment.'),
      }
    );
  };

  return (
    <Modal onClose={onClose} width={440}>
      <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${colors.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 19 }}>Reject payment</div>
        <div onClick={onClose} style={{ cursor: 'pointer', width: 32, height: 32, borderRadius: 9, background: '#fff', border: `1px solid ${colors.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CloseIcon />
        </div>
      </div>
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: '13.5px', color: colors.inkSoft, lineHeight: 1.5 }}>
          The customer will see this reason and be asked to re-send payment or call in. This stays
          visible on the booking until resolved.
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Reference number doesn't match any GCash transaction"
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${colors.border}`, borderRadius: 11, padding: '11px 13px', marginTop: 6, fontSize: 14, fontWeight: 500, background: '#fff', color: colors.ink, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>
        {error ? (
          <div style={{ background: colors.dangerTint, border: `1px solid ${colors.dangerBorder}`, borderRadius: 11, padding: '10px 13px', fontSize: '12.5px', color: colors.danger }}>
            {error}
          </div>
        ) : null}
      </div>
      <div style={{ padding: '16px 22px', borderTop: `1px solid ${colors.cardBorder}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={{ border: `1px solid ${colors.border}`, cursor: 'pointer', background: '#fff', color: colors.inkSoft, fontWeight: 700, fontSize: 14, padding: '12px 18px', borderRadius: 12 }}>
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!canSubmit || reject.isPending}
          style={{ border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', background: canSubmit ? colors.danger : colors.disabled, color: '#fff', fontWeight: 800, fontSize: 14, padding: '12px 20px', borderRadius: 12 }}
        >
          {reject.isPending ? 'Rejecting…' : 'Reject payment'}
        </button>
      </div>
    </Modal>
  );
}
