'use client';

import { useState } from 'react';
import { useEarnings, usePartners } from '@/lib/data';
import { peso } from '@/lib/format';
import { colors, fonts } from '@/theme';
import { TopBar, Avatar, chip } from '@/components/shared';
import { RecordPayoutModal } from '@/components/RecordPayoutModal';
import { PartnerRow } from '@/lib/types';

export default function PayoutsPage() {
  const { data: earnings, isLoading } = useEarnings();
  const { data: partners } = usePartners();
  const [paying, setPaying] = useState<{ partner: PartnerRow; unpaidTotal: number; jobCount: number } | null>(null);

  const partnerById = new Map((partners ?? []).map((p) => [p.id, p]));

  const byPartner = new Map<string, { unpaidTotal: number; unpaidCount: number; lifetimeTotal: number }>();
  for (const e of earnings ?? []) {
    const entry = byPartner.get(e.partner_id) ?? { unpaidTotal: 0, unpaidCount: 0, lifetimeTotal: 0 };
    entry.lifetimeTotal += e.commission_amount;
    if (!e.paid_at) {
      entry.unpaidTotal += e.commission_amount;
      entry.unpaidCount += 1;
    }
    byPartner.set(e.partner_id, entry);
  }

  const rows = Array.from(byPartner.entries())
    .map(([partnerId, totals]) => ({ partner: partnerById.get(partnerId), partnerId, ...totals }))
    .filter((r) => !!r.partner)
    .sort((a, b) => b.unpaidTotal - a.unpaidTotal);

  const totalUnpaid = rows.reduce((sum, r) => sum + r.unpaidTotal, 0);

  const recentPayouts = (earnings ?? [])
    .filter((e) => e.paid_at)
    .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())
    .slice(0, 8);

  return (
    <div style={{ animation: 'fadeUp .3s ease both', maxWidth: 820 }}>
      <TopBar title="Payouts" subtitle="Reconcile commissions owed to partners" />

      {isLoading || !earnings ? (
        <div style={{ color: colors.muted, fontSize: 14 }}>Loading…</div>
      ) : (
        <>
          <div style={{ background: 'linear-gradient(160deg,#0e6e63,#0a554d)', color: '#fff', borderRadius: 18, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,.7)', fontWeight: 700, letterSpacing: '.03em' }}>
              TOTAL UNPAID ACROSS ALL WORKERS
            </div>
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 34, marginTop: 8, letterSpacing: '-0.02em' }}>
              {peso(totalUnpaid)}
            </div>
          </div>

          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 17, marginBottom: 12 }}>By worker</div>

          {rows.length === 0 ? (
            <div style={{ color: colors.muted, fontSize: 14, marginBottom: 24 }}>No completed jobs with earnings yet.</div>
          ) : (
            rows.map((r) => {
              const p = r.partner!;
              return (
                <div
                  key={r.partnerId}
                  style={{ background: '#fff', border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '15px 17px', marginBottom: 11, display: 'flex', alignItems: 'center', gap: 14 }}
                >
                  <Avatar initials={p.initials} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '14.5px' }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                      Lifetime {peso(r.lifetimeTotal)} · {r.unpaidCount} unpaid job{r.unpaidCount === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: 6 }}>
                    <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 18, color: r.unpaidTotal > 0 ? colors.goldText : colors.primaryTintText }}>
                      {peso(r.unpaidTotal)}
                    </div>
                    <div style={{ fontSize: 11, color: colors.muted }}>{r.unpaidTotal > 0 ? 'unpaid' : 'all settled'}</div>
                  </div>
                  <button
                    onClick={() => setPaying({ partner: p, unpaidTotal: r.unpaidTotal, jobCount: r.unpaidCount })}
                    disabled={r.unpaidTotal === 0}
                    style={{
                      border: 'none',
                      cursor: r.unpaidTotal > 0 ? 'pointer' : 'not-allowed',
                      background: r.unpaidTotal > 0 ? colors.primary : colors.disabled,
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '12.5px',
                      padding: '10px 14px',
                      borderRadius: 10,
                      flex: 'none',
                    }}
                  >
                    Record payout
                  </button>
                </div>
              );
            })
          )}

          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 17, margin: '24px 0 12px' }}>Recent payouts</div>
          {recentPayouts.length === 0 ? (
            <div style={{ color: colors.muted, fontSize: 14 }}>No payouts recorded yet.</div>
          ) : (
            recentPayouts.map((e) => {
              const p = partnerById.get(e.partner_id);
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 4px', borderBottom: '1px solid #f2ece0' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p?.name ?? 'Unknown worker'}</div>
                    <div style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>
                      Paid {new Date(e.paid_at!).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={chip(colors.primaryTint, colors.primaryTintText)}>{peso(e.commission_amount)}</div>
                </div>
              );
            })
          )}
        </>
      )}

      {paying ? (
        <RecordPayoutModal
          partner={paying.partner}
          unpaidTotal={paying.unpaidTotal}
          jobCount={paying.jobCount}
          onClose={() => setPaying(null)}
        />
      ) : null}
    </div>
  );
}
