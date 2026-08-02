'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { updateAdminPassword, useAdminSession } from '@/lib/auth';
import { colors, fonts } from '@/theme';

const MIN_LENGTH = 8;

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { session, loading } = useAdminSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = password.length >= MIN_LENGTH && password === confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSaving(true);
    try {
      await updateAdminPassword(password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: colors.pageBg }}>
      <div style={{ width: 380, maxWidth: '100%', background: '#fff', border: `1px solid ${colors.cardBorder}`, borderRadius: 22, padding: 28 }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 22 }}>Set a new password</div>

        {loading ? (
          <div style={{ marginTop: 16, color: colors.muted, fontSize: 14 }}>Loading…</div>
        ) : !session ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: '13.5px', color: colors.inkSoft, lineHeight: 1.5 }}>
              This link has expired or was already used. Request a new one from the sign-in page.
            </div>
            <button
              onClick={() => router.replace('/login')}
              style={{ width: '100%', marginTop: 16, border: 'none', cursor: 'pointer', background: colors.primary, color: '#fff', fontWeight: 800, fontSize: 14, padding: '13px', borderRadius: 12 }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase', marginTop: 18 }}>
              New password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder={`At least ${MIN_LENGTH} characters`}
              style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${colors.border}`, borderRadius: 11, padding: '11px 13px', marginTop: 6, fontSize: 14, fontWeight: 600, background: '#fff', color: colors.ink }}
            />
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase', marginTop: 16 }}>
              Confirm password
            </label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${colors.border}`, borderRadius: 11, padding: '11px 13px', marginTop: 6, fontSize: 14, fontWeight: 600, background: '#fff', color: colors.ink }}
            />

            {error ? (
              <div style={{ marginTop: 14, background: colors.dangerTint, border: `1px solid ${colors.dangerBorder}`, borderRadius: 11, padding: '10px 13px', fontSize: '12.5px', color: colors.danger }}>
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || saving}
              style={{ width: '100%', marginTop: 20, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', background: canSubmit ? colors.primary : colors.disabled, color: '#fff', fontWeight: 800, fontSize: 14, padding: '13px', borderRadius: 12 }}
            >
              {saving ? 'Saving…' : 'Set password & continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
