'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors } from '@/theme';
import { NAV, useNavBadgeCounts } from './Sidebar';

// Mobile counterpart to Sidebar — hidden by default, shown under 720px (see
// globals.css). Reuses the same NAV list/badge logic so the two can never
// drift out of sync on which pages exist or what a badge means.
export function BottomNav() {
  const pathname = usePathname();
  const { attention: attentionCount, gcash: pendingGcashCount } = useNavBadgeCounts();

  return (
    <div
      className="bottomnav"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 70,
        background: colors.sidebarBg,
        borderTop: '1px solid rgba(255,255,255,.09)',
        padding: '8px 4px calc(8px + env(safe-area-inset-bottom))',
        justifyContent: 'space-around',
        alignItems: 'stretch',
        boxShadow: '0 -10px 26px -14px rgba(11,43,40,.6)',
      }}
    >
      {NAV.map((n) => {
        const active = pathname === n.href;
        const badgeCount = n.badge === 'attention' ? attentionCount : n.badge === 'gcash' ? pendingGcashCount : 0;
        return (
          <Link
            key={n.href}
            href={n.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '6px 2px',
              borderRadius: 12,
              color: active ? '#fff' : '#7fa39b',
              background: active ? 'rgba(255,255,255,.09)' : 'transparent',
              transition: 'all .15s',
            }}
          >
            <span style={{ position: 'relative', display: 'flex' }}>
              <n.Icon color={active ? '#fff' : '#7fa39b'} />
              {badgeCount > 0 ? (
                <span
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -9,
                    background: colors.gold,
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 800,
                    lineHeight: '15px',
                    minWidth: 15,
                    height: 15,
                    textAlign: 'center',
                    padding: '0 4px',
                    borderRadius: 20,
                    boxSizing: 'border-box',
                  }}
                >
                  {badgeCount}
                </span>
              ) : null}
            </span>
            <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '-0.01em' }}>{n.short}</span>
          </Link>
        );
      })}
    </div>
  );
}
