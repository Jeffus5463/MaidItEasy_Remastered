'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAdminSession } from '@/lib/auth';
import { useRealtimeInvalidate } from '@/lib/realtime';
import { colors } from '@/theme';
import { Sidebar } from './Sidebar';

export function AdminGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, isAdmin, loading } = useAdminSession();

  // /update-password is reached via a Supabase recovery-email link, which
  // establishes its own temporary session — it must not bounce through the
  // normal login gate (or the sidebar shell) while that's being resolved.
  const bypassGate = pathname === '/login' || pathname === '/update-password';

  useEffect(() => {
    if (loading || bypassGate) return;
    if (!session || !isAdmin) router.replace('/login');
  }, [loading, session, isAdmin, bypassGate, router]);

  // Subscribed once here rather than per-page — every real admin page
  // (board, summary, gcash) reads the same ['admin-bookings']/
  // ['admin-payments'] query keys, and this is the single place that
  // already wraps all of them once auth is confirmed. No filter: an admin
  // is authorized to see every booking/payment.
  const isAuthed = isAdmin && !!session;
  useRealtimeInvalidate('bookings', isAuthed ? null : undefined, ['admin-bookings']);
  useRealtimeInvalidate('payments', isAuthed ? null : undefined, ['admin-payments']);

  // These pages render their own full-page layout — no sidebar, no
  // data-fetching chrome, and no auth requirement to see them.
  if (bypassGate) return <>{children}</>;

  if (loading || !session || !isAdmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: colors.muted, fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: '#f2ede3' }}>
      <Sidebar />
      <div className="scr" style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 34px 60px' }}>{children}</div>
      </div>
    </div>
  );
}
