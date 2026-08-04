'use client';

import { useState } from 'react';
import { useMarkRefunded } from '@/lib/data';
import { customerLabel, peso } from '@/lib/format';
import { colors, fonts } from '@/theme';
import { Modal } from './shared';
import { CloseIcon, TickIcon } from './icons';
import { BookingRow } from '@/lib/types';

export function MarkRefundedModal({ booking, onClose }: { booking: BookingRow; onClose: () => void }) {
  const markRefunded = useMarkRefunded();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const confirm = () => {
    setError('');
    markRefunded.mutate(booking.id, {
      onSuccess: () => setDone(true),
      onError: (err) => setError(err instanceof Error ? err.message : 'Could not mark this refund as sent.'),
    });
  };

  if (done) {
    return (
      <Modal onClose={onClose} width={420}>
        <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${colors.cardBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: colors.primaryTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <TickIcon size={16} />
            </span>
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 19 }}>Refund marked sent</div>
          </div>
        </div>
        <div style={{ padding: '18px 22px', fontSize: '13.5px', color: colors.inkSoft, lineHeight: 1.5 }}>
          {peso(booking.total)} for {customerLabel(booking)} is now marked refunded. This is a reconciliation record
          only — no money was transferred by this action.
        </div>
        <div style={{ padding: '16px 22px', borderTop: `1px solid ${colors.cardBorder}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ border: 'none', cursor: 'pointer', background: colors.primary, color: '#fff', fontWeight: 800, fontSize: 14, padding: '12px 20px', borderRadius: 12 }}>
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} width={440}>
      <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${colors.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 19 }}>Mark refund sent?</div>
        <div onClick={onClose} style={{ cursor: 'pointer', width: 32, height: 32, borderRadius: 9, background: '#fff', border: `1px solid ${colors.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CloseIcon />
        </div>
      </div>
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: '13.5px', color: colors.inkSoft, lineHeight: 1.5 }}>
          Marks <b>{peso(booking.total)}</b> for <b>{customerLabel(booking)}</b> as refunded. Only send this once
          you've actually sent the money back via GCash yourself — this only stamps the ledger, it does not send
          any money.
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
          onClick={confirm}
          disabled={markRefunded.isPending}
          style={{ border: 'none', cursor: 'pointer', background: colors.primary, color: '#fff', fontWeight: 800, fontSize: 14, padding: '12px 20px', borderRadius: 12 }}
        >
          {markRefunded.isPending ? 'Marking…' : 'Mark refund sent'}
        </button>
      </div>
    </Modal>
  );
}
