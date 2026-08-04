'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useBookings, usePayments } from '@/lib/data';
import { signOutAdmin, useAdminSession } from '@/lib/auth';
import { colors, fonts } from '@/theme';
import { BoardIcon, CatalogIcon, GcashIcon, HomeIcon, PayoutIcon, RefundIcon, RosterIcon } from './icons';

// `short` is the mobile bottom-nav label (BottomNav.tsx) — the sidebar
// itself still shows the full `label`.
export const NAV = [
  { href: '/', label: 'Daily summary', short: 'Summary', Icon: HomeIcon, badge: 'none' as const },
  { href: '/board', label: 'Booking board', short: 'Board', Icon: BoardIcon, badge: 'attention' as const },
  { href: '/roster', label: 'Worker roster', short: 'Roster', Icon: RosterIcon, badge: 'none' as const },
  { href: '/catalog', label: 'Service catalog', short: 'Catalog', Icon: CatalogIcon, badge: 'none' as const },
  { href: '/gcash', label: 'GCash verification', short: 'GCash', Icon: GcashIcon, badge: 'gcash' as const },
  { href: '/refunds', label: 'Refunds', short: 'Refunds', Icon: RefundIcon, badge: 'refunds' as const },
  { href: '/payouts', label: 'Payouts', short: 'Payouts', Icon: PayoutIcon, badge: 'none' as const },
];

// Shared by Sidebar, BottomNav, and the Daily summary page — same
// underlying (already-cached) queries, so computing it more than once is
// free, and it keeps the nav badges and the summary's "Needs your
// attention" card from drifting apart (Genuine logic #4, CLAUDE.md ->
// Admin console).
//
// Two distinct "attention" cases, surfaced separately: `needsAttention` is
// a genuinely blocked booking (release_and_rehold() found nobody free —
// `qualified_free_partners()` excludes the just-declined/unassigned
// partner, see supabase/migrations/*_hourly_booking_capacity.sql);
// `declined` is broader — any booking still carrying a decline flag,
// including ones release_and_rehold() *did* successfully re-hold, since an
// admin still needs to notice and confirm it (decline_reason/declined_at
// only clear on the next useAssignPartner() call). `attention` is their
// union (deduped by booking id) for the single nav pill.
export function useNavBadgeCounts() {
  const { data: bookings } = useBookings();
  const { data: payments } = usePayments();

  const pending = bookings?.filter((b) => b.status === 'pending') ?? [];
  const needsAttention = pending.filter((b) => !b.partner_id);
  const declined = (bookings ?? []).filter((b) => !!b.decline_reason);
  const attentionIds = new Set([...needsAttention, ...declined].map((b) => b.id));
  const mostRecentDeclineAt = declined.reduce<string | null>(
    (latest, b) => (b.declined_at && (!latest || b.declined_at > latest) ? b.declined_at : latest),
    null
  );
  const refundsOwed = (bookings ?? []).filter((b) => b.refund_needed && !b.refunded_at);

  return {
    attention: attentionIds.size,
    gcash: payments?.filter((p) => p.status === 'awaiting_payment').length ?? 0,
    needsAttention: needsAttention.length,
    declined: declined.length,
    mostRecentDeclineAt,
    refunds: refundsOwed.length,
  };
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { attention: attentionCount, gcash: pendingGcashCount, refunds: refundsCount } = useNavBadgeCounts();
  const { session } = useAdminSession();

  const logOut = async () => {
    await signOutAdmin();
    router.replace('/login');
  };

  return (
    <div
      className="sidebar"
      style={{
        width: 250,
        flex: 'none',
        background: colors.sidebarBg,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 16px',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '4px 8px 20px' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 20l3-9 5 2 5-2 3 9" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 3v10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <path d="M8.5 6.5 12 3l3.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>
            MaidItEasy
          </div>
          <div style={{ fontSize: '10.5px', color: '#6f9c93', fontWeight: 700, letterSpacing: '.08em' }}>
            ADMIN CONSOLE
          </div>
        </div>
      </div>
      <div style={{ fontSize: '10.5px', color: '#5c8a80', fontWeight: 700, letterSpacing: '.09em', padding: '8px 12px 6px' }}>
        OPERATIONS
      </div>
      {NAV.map((n) => {
        const active = pathname === n.href;
        const badgeCount = n.badge === 'attention' ? attentionCount : n.badge === 'gcash' ? pendingGcashCount : n.badge === 'refunds' ? refundsCount : 0;
        return (
          <Link
            key={n.href}
            href={n.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '11px 12px',
              borderRadius: 11,
              cursor: 'pointer',
              marginBottom: 3,
              fontSize: 14,
              fontWeight: 700,
              color: active ? '#fff' : '#a9c4bd',
              background: active ? colors.primary : 'transparent',
              transition: 'all .15s',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ display: 'flex' }}>
                <n.Icon color={active ? '#fff' : '#a9c4bd'} />
              </span>
              {n.label}
            </span>
            {badgeCount > 0 ? (
              <span
                style={{
                  background: active ? 'rgba(255,255,255,.22)' : colors.gold,
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '1px 8px',
                  borderRadius: 20,
                }}
              >
                {badgeCount}
              </span>
            ) : null}
          </Link>
        );
      })}
      <div style={{ flex: 1 }} />
      <div
        style={{
          background: 'rgba(255,255,255,.06)',
          border: '1px solid rgba(255,255,255,.09)',
          borderRadius: 14,
          padding: 13,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 13,
              fontFamily: fonts.display,
              flex: 'none',
            }}
          >
            {(session?.user.email ?? '?').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session?.user.email ?? 'Admin'}
            </div>
            <div onClick={logOut} style={{ fontSize: 11, color: '#6f9c93', cursor: 'pointer' }}>
              Log out
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
