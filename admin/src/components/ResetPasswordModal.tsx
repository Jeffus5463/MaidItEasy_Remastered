'use client';

import { useState } from 'react';
import { useResetPartnerPassword } from '@/lib/data';
import { colors, fonts } from '@/theme';
import { Modal } from './shared';
import { CloseIcon, TickIcon } from './icons';
import { PartnerRow } from '@/lib/types';

export function ResetPasswordModal({ partner, onClose }: { partner: PartnerRow; onClose: () => void }) {
  const reset = useResetPartnerPassword();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');

  const confirm = () => {
    setError('');
    reset.mutate(partner.id, {
      onSuccess: (data) => setResult(data.temporaryPassword),
      onError: (err) => setError(err instanceof Error ? err.message : 'Could not reset the password.'),
    });
  };

  if (result) {
    return (
      <Modal onClose={onClose} width={440}>
        <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${colors.cardBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: colors.primaryTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <TickIcon size={16} />
            </span>
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 19 }}>Password reset</div>
          </div>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: '13.5px', color: colors.inkSoft, lineHeight: 1.5 }}>
            Hand this to {partner.name} now — it won&apos;t be shown again. They&apos;ll be forced to
            set a new password on next login.
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Temporary password</label>
            <div style={{ marginTop: 6, border: `1.5px solid ${colors.border}`, borderRadius: 11, padding: '11px 13px', fontFamily: fonts.display, fontWeight: 700, fontSize: 16, letterSpacing: '.03em', background: colors.inputBg }}>
              {result}
            </div>
          </div>
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
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 19 }}>Reset password?</div>
        <div onClick={onClose} style={{ cursor: 'pointer', width: 32, height: 32, borderRadius: 9, background: '#fff', border: `1px solid ${colors.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CloseIcon />
        </div>
      </div>
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: '13.5px', color: colors.inkSoft, lineHeight: 1.5 }}>
          This immediately replaces <b>{partner.name}</b>&apos;s password with a new one-time
          password. Their current password stops working right away.
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
          disabled={reset.isPending}
          style={{ border: 'none', cursor: 'pointer', background: colors.primary, color: '#fff', fontWeight: 800, fontSize: 14, padding: '12px 20px', borderRadius: 12 }}
        >
          {reset.isPending ? 'Resetting…' : 'Reset password'}
        </button>
      </div>
    </Modal>
  );
}
