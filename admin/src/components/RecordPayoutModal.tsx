'use client';

import { useState } from 'react';
import { useRecordPayout } from '@/lib/data';
import { peso } from '@/lib/format';
import { colors, fonts } from '@/theme';
import { Modal } from './shared';
import { CloseIcon, TickIcon } from './icons';
import { PartnerRow } from '@/lib/types';

export function RecordPayoutModal({
  partner,
  unpaidTotal,
  jobCount,
  onClose,
}: {
  partner: PartnerRow;
  unpaidTotal: number;
  jobCount: number;
  onClose: () => void;
}) {
  const recordPayout = useRecordPayout();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const confirm = () => {
    setError('');
    recordPayout.mutate(partner.id, {
      onSuccess: () => setDone(true),
      onError: (err) => setError(err instanceof Error ? err.message : 'Could not record the payout.'),
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
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 19 }}>Payout recorded</div>
          </div>
        </div>
        <div style={{ padding: '18px 22px', fontSize: '13.5px', color: colors.inkSoft, lineHeight: 1.5 }}>
          {jobCount} job{jobCount === 1 ? '' : 's'} totalling <b>{peso(unpaidTotal)}</b> for {partner.name} are now marked
          paid. This is a reconciliation record only — no money was transferred by this action.
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
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 19 }}>Record payout?</div>
        <div onClick={onClose} style={{ cursor: 'pointer', width: 32, height: 32, borderRadius: 9, background: '#fff', border: `1px solid ${colors.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CloseIcon />
        </div>
      </div>
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: '13.5px', color: colors.inkSoft, lineHeight: 1.5 }}>
          Marks all <b>{jobCount}</b> unpaid job{jobCount === 1 ? '' : 's'} for <b>{partner.name}</b> as paid —{' '}
          <b>{peso(unpaidTotal)}</b> total. This only stamps the ledger; it does not send any money.
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
          disabled={recordPayout.isPending}
          style={{ border: 'none', cursor: 'pointer', background: colors.primary, color: '#fff', fontWeight: 800, fontSize: 14, padding: '12px 20px', borderRadius: 12 }}
        >
          {recordPayout.isPending ? 'Recording…' : 'Record payout'}
        </button>
      </div>
    </Modal>
  );
}
