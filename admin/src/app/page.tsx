'use client';

import Link from 'next/link';
import { useBookings, usePartners, usePayments } from '@/lib/data';
import { formatWhen, isToday, peso, serviceLabel, timeAgo } from '@/lib/format';
import { colors, fonts } from '@/theme';
import { TopBar, chip, svcIconWrap } from '@/components/shared';
import { AlertIcon, CalendarIcon, GcashIcon, PesoIcon, PeopleIcon, ChevronRightIcon, BroomIcon, AirconIcon } from '@/components/icons';
import { useNavBadgeCounts } from '@/components/Sidebar';

const STATUS_CHIP: Record<string, [string, string, string]> = {
  pending: [colors.goldTint, colors.goldText, 'Unassigned'],
  assigned: [colors.primaryTint, colors.primaryTintText, 'Assigned'],
  en_route: [colors.blueTint, colors.blue, 'En route'],
  in_progress: [colors.oliveTint, colors.oliveText, 'In progress'],
  completed: [colors.primaryTint, colors.primaryTintText, 'Completed'],
  cancelled: [colors.dangerTint, colors.danger, 'Cancelled'],
};

export default function SummaryPage() {
  const { data: bookings, isLoading: loadingBookings } = useBookings();
  const { data: payments } = usePayments();
  const { data: partners } = usePartners();

  const loading = loadingBookings || !bookings;

  const { needsAttention, declined, mostRecentDeclineAt } = useNavBadgeCounts();
  const bookingsToday = bookings?.filter((b) => isToday(b.date)) ?? [];
  const pendingGcash = payments?.filter((p) => p.status === 'awaiting_payment' && p.method === 'gcash') ?? [];

  const bookingById = new Map((bookings ?? []).map((b) => [b.id, b]));
  const verifiedToday = (payments ?? []).filter((p) => {
    if (p.status !== 'verified') return false;
    const booking = bookingById.get(p.booking_id);
    return booking && isToday(booking.date);
  });
  const gcashTotal = verifiedToday
    .filter((p) => p.method === 'gcash')
    .reduce((sum, p) => sum + (bookingById.get(p.booking_id)?.total ?? 0), 0);
  const cashTotal = verifiedToday
    .filter((p) => p.method === 'cash')
    .reduce((sum, p) => sum + (bookingById.get(p.booking_id)?.total ?? 0), 0);

  const activeVerifiedPartners = (partners ?? []).filter((p) => p.active && p.verified && p.nbi_verified && p.id_verified).length;
  const totalPartners = partners?.length ?? 0;

  const recent = (bookings ?? []).slice(0, 6);

  const kpis = [
    { icon: <CalendarIcon />, tint: colors.primaryTint, value: String(bookingsToday.length), label: 'Bookings today' },
    { icon: <AlertIcon />, tint: colors.goldTintAlt, value: String(needsAttention), label: 'Unassigned', warn: needsAttention > 0 },
    { icon: <PesoIcon />, tint: colors.primaryTint, value: peso(gcashTotal + cashTotal), label: 'Collected today' },
    { icon: <PeopleIcon />, tint: colors.primaryTint, value: `${activeVerifiedPartners} / ${totalPartners}`, label: 'Verified partners active' },
  ];

  return (
    <div style={{ animation: 'fadeUp .3s ease both' }}>
      <TopBar title="Daily summary" subtitle="Dumaguete City · MaidItEasy operations" />

      {loading ? (
        <div style={{ color: colors.muted, fontSize: 14 }}>Loading…</div>
      ) : (
        <>
          <div className="grid-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {kpis.map((k) => (
              <div key={k.label} style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 18, padding: '18px 18px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ width: 38, height: 38, borderRadius: 11, background: k.tint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {k.icon}
                  </span>
                  {k.warn ? <span style={chip(colors.goldTint, colors.goldText)}>Action</span> : null}
                </div>
                <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 30, marginTop: 14, letterSpacing: '-0.02em' }}>{k.value}</div>
                <div style={{ fontSize: '12.5px', color: colors.muted, fontWeight: 600, marginTop: 1 }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginTop: 20 }}>
            <div style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 18, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 17 }}>Recent bookings</div>
                <Link href="/board" style={{ fontSize: 13, fontWeight: 700, color: colors.primary }}>
                  Open board →
                </Link>
              </div>
              {recent.length === 0 ? (
                <div style={{ color: colors.muted, fontSize: 13, padding: '10px 0' }}>No bookings yet.</div>
              ) : (
                recent.map((b) => {
                  const c = STATUS_CHIP[b.status];
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 0', borderBottom: '1px solid #f2ece0' }}>
                      <div style={svcIconWrap(b.service_id, 40)}>{b.service_id === 'aircon' ? <AirconIcon size={20} /> : <BroomIcon size={20} />}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{serviceLabel(b.service_id, b.units, b.tier, b.duration_hours)}</div>
                        <div style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>
                          {formatWhen(b.date, b.start_hour, b.duration_hours)} · {b.barangay}
                        </div>
                      </div>
                      <div style={chip(c[0], c[1])}>{c[2]}</div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: 'linear-gradient(160deg,#0e6e63,#0a554d)', color: '#fff', borderRadius: 18, padding: 20 }}>
                <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,.7)', fontWeight: 700, letterSpacing: '.03em' }}>
                  REVENUE COLLECTED TODAY
                </div>
                <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 34, marginTop: 8, letterSpacing: '-0.02em' }}>
                  {peso(gcashTotal + cashTotal)}
                </div>
                <div style={{ display: 'flex', gap: 18, marginTop: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)' }}>GCash</div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginTop: 1 }}>{peso(gcashTotal)}</div>
                  </div>
                  <div style={{ width: 1, background: 'rgba(255,255,255,.18)' }} />
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)' }}>Cash (in person)</div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginTop: 1 }}>{peso(cashTotal)}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 18, padding: 20 }}>
                <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Needs your attention</div>
                {needsAttention === 0 && declined === 0 && pendingGcash.length === 0 ? (
                  <div style={{ color: colors.muted, fontSize: 13 }}>All caught up.</div>
                ) : (
                  <>
                    {needsAttention > 0 && (
                      <Link
                        href="/board"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: 11,
                          borderRadius: 12,
                          background: colors.goldTintAlt,
                          border: `1px solid ${colors.goldBorder}`,
                          marginBottom: 10,
                        }}
                      >
                        <span style={{ width: 34, height: 34, borderRadius: 10, background: colors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                          <AlertIcon size={18} color="#fff" />
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '13.5px', color: colors.goldTextDeep }}>
                            {needsAttention} booking{needsAttention === 1 ? '' : 's'} need{needsAttention === 1 ? 's' : ''} attention
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#b58e4f' }}>No worker is free — assign manually</div>
                        </div>
                        <ChevronRightIcon color="#c98a2e" />
                      </Link>
                    )}
                    {declined > 0 && (
                      <Link
                        href="/board"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: 11,
                          borderRadius: 12,
                          background: colors.dangerTint,
                          border: `1px solid ${colors.dangerBorder}`,
                          marginBottom: 10,
                        }}
                      >
                        <span style={{ width: 34, height: 34, borderRadius: 10, background: colors.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                          <AlertIcon size={18} color="#fff" />
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '13.5px', color: colors.danger }}>
                            {declined} booking{declined === 1 ? '' : 's'} recently declined
                          </div>
                          <div style={{ fontSize: '11.5px', color: colors.danger }}>
                            Review before confirming{mostRecentDeclineAt ? ` · most recent ${timeAgo(mostRecentDeclineAt)}` : ''}
                          </div>
                        </div>
                        <ChevronRightIcon color={colors.danger} />
                      </Link>
                    )}
                    {pendingGcash.length > 0 && (
                      <Link
                        href="/gcash"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: 11,
                          borderRadius: 12,
                          background: colors.blueBg,
                          border: `1px solid ${colors.blueBorder}`,
                        }}
                      >
                        <span style={{ width: 34, height: 34, borderRadius: 10, background: colors.gcashBrand, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                          <GcashIcon color="#fff" size={16} />
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '13.5px', color: colors.blueText }}>
                            {pendingGcash.length} payment{pendingGcash.length === 1 ? '' : 's'} to verify
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#6b90ad' }}>Check reference numbers</div>
                        </div>
                        <ChevronRightIcon color="#4d84ad" />
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
