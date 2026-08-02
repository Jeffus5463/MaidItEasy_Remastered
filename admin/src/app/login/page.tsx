'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { sendAdminPasswordReset, signInAdmin } from '@/lib/auth';
import { colors, fonts } from '@/theme';

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const canSubmit = mode === 'login' ? email.trim().length > 0 && password.length > 0 : email.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSigningIn(true);
    try {
      if (mode === 'login') {
        await signInAdmin(email, password);
        router.replace('/');
      } else {
        await sendAdminPasswordReset(email);
        setResetSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  const switchMode = (next: 'login' | 'reset') => {
    setMode(next);
    setError('');
    setResetSent(false);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: colors.pageBg }}>
      <form
        onSubmit={submit}
        style={{ width: 380, maxWidth: '100%', background: '#fff', border: `1px solid ${colors.cardBorder}`, borderRadius: 22, padding: 28 }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 13, background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M4 20l3-9 5 2 5-2 3 9" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 3v10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <path d="M8.5 6.5 12 3l3.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 22 }}>
          {mode === 'login' ? 'Admin sign in' : 'Reset your password'}
        </div>
        <div style={{ fontSize: '13.5px', color: colors.muted, marginTop: 4 }}>
          {mode === 'login' ? 'MaidItEasy operations console' : "We'll email you a link to set a new password."}
        </div>

        {resetSent ? (
          <div style={{ marginTop: 18, background: colors.primaryTint, border: `1px solid ${colors.cardBorder}`, borderRadius: 11, padding: '12px 13px', fontSize: '13px', color: colors.primaryTintText }}>
            If an admin account exists for that email, a reset link is on its way.
          </div>
        ) : (
          <>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase', marginTop: 22 }}>
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              placeholder="you@maiditeasy.com"
              style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${colors.border}`, borderRadius: 11, padding: '11px 13px', marginTop: 6, fontSize: 14, fontWeight: 600, background: '#fff', color: colors.ink }}
            />

            {mode === 'login' && (
              <>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase', marginTop: 16 }}>
                  Password
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${colors.border}`, borderRadius: 11, padding: '11px 13px', marginTop: 6, fontSize: 14, fontWeight: 600, background: '#fff', color: colors.ink }}
                />
              </>
            )}

            {error ? (
              <div style={{ marginTop: 14, background: colors.dangerTint, border: `1px solid ${colors.dangerBorder}`, borderRadius: 11, padding: '10px 13px', fontSize: '12.5px', color: colors.danger }}>
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || signingIn}
              style={{ width: '100%', marginTop: 20, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', background: canSubmit ? colors.primary : colors.disabled, color: '#fff', fontWeight: 800, fontSize: 14, padding: '13px', borderRadius: 12 }}
            >
              {signingIn ? (mode === 'login' ? 'Signing in…' : 'Sending…') : mode === 'login' ? 'Log in' : 'Send reset link'}
            </button>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          {mode === 'login' ? (
            <span onClick={() => switchMode('reset')} style={{ cursor: 'pointer', fontSize: '12.5px', fontWeight: 700, color: colors.primary }}>
              Forgot password?
            </span>
          ) : (
            <span onClick={() => switchMode('login')} style={{ cursor: 'pointer', fontSize: '12.5px', fontWeight: 700, color: colors.primary }}>
              Back to sign in
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
