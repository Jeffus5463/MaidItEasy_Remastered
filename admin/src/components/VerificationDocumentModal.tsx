'use client';

import { useState } from 'react';
import { getPartnerDocumentUrl, useUploadPartnerDocument } from '@/lib/data';
import { colors, fonts } from '@/theme';
import { Modal, Toggle } from './shared';
import { CloseIcon } from './icons';
import { PartnerDocument, PartnerDocumentType, PartnerRow } from '@/lib/types';

const DOC_LABEL: Record<PartnerDocumentType, string> = {
  id: 'ID',
  nbi_clearance: 'NBI clearance',
  agreement: 'Signed agreement',
};

// Every save inserts a fresh partner_documents row (append-only, same as
// job_photos) — there's no "just flip verified" path through this modal by
// design, since a verification decision made here should always have a
// document behind it. Quick verify/revoke without a new upload lives on the
// roster card itself (useSetVettingFlag), for correcting an existing,
// already-evidenced decision.
export function VerificationDocumentModal({
  partner,
  docType,
  existingDoc,
  onClose,
}: {
  partner: PartnerRow;
  docType: PartnerDocumentType;
  existingDoc: PartnerDocument | null;
  onClose: () => void;
}) {
  const upload = useUploadPartnerDocument();
  const [file, setFile] = useState<File | null>(null);
  const [expiresAt, setExpiresAt] = useState(existingDoc?.expires_at ?? '');
  const [markVerified, setMarkVerified] = useState(true);
  const [viewing, setViewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = !!file;

  const save = () => {
    if (!file) return;
    setError(null);
    upload.mutate(
      { partnerId: partner.id, docType, file, expiresAt: expiresAt || null, markVerified },
      {
        onSuccess: onClose,
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not upload the document.'),
      }
    );
  };

  const view = async () => {
    if (!existingDoc) return;
    setViewing(true);
    try {
      const url = await getPartnerDocumentUrl(existingDoc.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Could not open the document.');
    } finally {
      setViewing(false);
    }
  };

  return (
    <Modal onClose={onClose} width={440}>
      <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${colors.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 19 }}>{DOC_LABEL[docType]}</div>
          <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{partner.name}</div>
        </div>
        <div onClick={onClose} style={{ cursor: 'pointer', width: 32, height: 32, borderRadius: 9, background: '#fff', border: `1px solid ${colors.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <CloseIcon />
        </div>
      </div>

      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {existingDoc ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: '11px 13px' }}>
            <div style={{ fontSize: '12.5px', color: colors.inkSoft }}>
              Current file uploaded {new Date(existingDoc.created_at).toLocaleDateString()}
            </div>
            <button
              onClick={view}
              disabled={viewing}
              style={{ border: 'none', cursor: 'pointer', background: 'transparent', color: colors.primary, fontWeight: 700, fontSize: '12.5px' }}
            >
              {viewing ? 'Opening…' : 'View'}
            </button>
          </div>
        ) : null}

        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>
            {existingDoc ? 'Replace with a new scan/photo' : 'Upload a scan/photo'}
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ display: 'block', marginTop: 6, fontSize: 13 }}
          />
        </div>

        {docType === 'nbi_clearance' ? (
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Expires on</label>
            <input
              type="date"
              value={expiresAt ?? ''}
              onChange={(e) => setExpiresAt(e.target.value)}
              style={{ display: 'block', width: '100%', boxSizing: 'border-box', border: `1.5px solid ${colors.border}`, borderRadius: 11, padding: '11px 13px', marginTop: 6, fontSize: 14, fontWeight: 600, background: '#fff', color: colors.ink }}
            />
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: '13px 15px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Mark verified</div>
            <div style={{ fontSize: '11.5px', color: colors.muted }}>Confirms this document was reviewed and is good.</div>
          </div>
          <Toggle on={markVerified} onClick={() => setMarkVerified((v) => !v)} />
        </div>

        {error ? (
          <div style={{ background: colors.dangerTint, border: `1px solid ${colors.dangerBorder}`, borderRadius: 11, padding: '11px 13px', fontSize: '12.5px', color: colors.danger }}>
            {error}
          </div>
        ) : null}
      </div>

      <div style={{ padding: '16px 22px', borderTop: `1px solid ${colors.cardBorder}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={{ border: `1px solid ${colors.border}`, cursor: 'pointer', background: '#fff', color: colors.inkSoft, fontWeight: 700, fontSize: 14, padding: '12px 18px', borderRadius: 12 }}>
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!canSave || upload.isPending}
          style={{ border: 'none', cursor: canSave ? 'pointer' : 'not-allowed', background: canSave ? colors.primary : colors.disabled, color: '#fff', fontWeight: 800, fontSize: 14, padding: '12px 20px', borderRadius: 12 }}
        >
          {upload.isPending ? 'Uploading…' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}
