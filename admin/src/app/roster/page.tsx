'use client';

import { useState } from 'react';
import { useToggleWorkerActive, useToggleWorkerDay, useToggleWorkerVerified, useUpdateWorkerHours, usePartners } from '@/lib/data';
import { formatHour12 } from '@/lib/format';
import { colors, fonts } from '@/theme';
import { AddWorkerModal } from '@/components/AddWorkerModal';
import { ResetPasswordModal } from '@/components/ResetPasswordModal';
import { TopBar, Toggle, Avatar, chip } from '@/components/shared';
import { CrossIcon, PendClockIcon, PlusIcon, TickIcon } from '@/components/icons';
import { PartnerRow } from '@/lib/types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// 9 -> 20 as start-hour options (business_open_hour()..business_close_hour()-1,
// see supabase/migrations/*_hourly_booking_schema.sql), 10 -> 21 as end-hour
// options — a worker's own window is clamped to business hours overall.
const HOURS = Array.from({ length: 12 }, (_, i) => 9 + i);

type Status = 'verified' | 'pending' | 'action';

// The dispatch-eligibility badge must never disagree with
// qualified_free_partners() (supabase/migrations/*_hourly_booking_capacity.sql),
// which gates purely on `partners.verified` — so 'verified' here means
// exactly `p.verified`, nothing else. nbi_verified/agreement_verified are
// document-vetting indicators, not dispatch gates; among NOT-yet-verified
// workers they just help triage why (shown as 'pending' vs 'action needed'),
// they never make an unverified worker show as "Verified".
function computeStatus(p: PartnerRow): Status {
  if (p.verified) return 'verified';
  if (!p.agreement_verified) return 'action';
  return 'pending';
}

const STATUS_CHIP: Record<Status, [string, string, string]> = {
  verified: [colors.primaryTint, colors.primaryTintText, 'Verified'],
  pending: [colors.goldTint, colors.goldText, 'Pending'],
  action: [colors.dangerTint, colors.danger, 'Action needed'],
};

const SVC_LABEL: Record<string, string> = { cleaning: 'Cleaning', aircon: 'Aircon' };

export default function RosterPage() {
  const { data: partners, isLoading } = usePartners();
  const toggleActive = useToggleWorkerActive();
  const toggleVerified = useToggleWorkerVerified();
  const toggleDay = useToggleWorkerDay();
  const updateHours = useUpdateWorkerHours();
  const [addOpen, setAddOpen] = useState(false);
  const [resetting, setResetting] = useState<PartnerRow | null>(null);

  const verifiedCount = (partners ?? []).filter((p) => computeStatus(p) === 'verified').length;
  const pendingCount = (partners ?? []).filter((p) => computeStatus(p) === 'pending').length;
  const actionCount = (partners ?? []).filter((p) => computeStatus(p) === 'action').length;

  return (
    <div style={{ animation: 'fadeUp .3s ease both' }}>
      <TopBar title="Worker roster" subtitle="Vetting & verification status of your partners" />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 14, padding: '13px 18px', flex: 1 }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 24, color: colors.primary }}>{verifiedCount}</div>
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 600 }}>Verified partners</div>
        </div>
        <div style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 14, padding: '13px 18px', flex: 1 }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 24, color: '#e6913c' }}>{pendingCount}</div>
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 600 }}>Pending verification</div>
        </div>
        <div style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 14, padding: '13px 18px', flex: 1 }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 24, color: colors.danger }}>{actionCount}</div>
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 600 }}>Action needed</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: colors.muted, fontWeight: 600 }}>
          Documents (ID · NBI · agreement) are vetted offline. Set service tags &amp; available days to control dispatch.
        </div>
        <button
          onClick={() => setAddOpen(true)}
          style={{ border: 'none', cursor: 'pointer', background: colors.primary, color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 15px', borderRadius: 11, display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}
        >
          <PlusIcon />
          Add worker
        </button>
      </div>

      {isLoading || !partners ? (
        <div style={{ color: colors.muted, fontSize: 14 }}>Loading…</div>
      ) : (
        partners.map((w) => {
          const status = computeStatus(w);
          const chipColors = STATUS_CHIP[status];
          const mark = (ok: boolean, pending: boolean) => (ok ? <TickIcon /> : pending ? <PendClockIcon /> : <CrossIcon />);
          const markColor = (ok: boolean, pending: boolean) => (ok ? colors.primaryTintText : pending ? colors.goldText : colors.danger);
          return (
            <div key={w.id} style={{ background: '#fff', border: `1px solid ${w.active ? colors.cardBorder : '#e6ddce'}`, borderRadius: 16, padding: '16px 18px', marginBottom: 12, opacity: w.active ? 1 : 0.62 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                <Avatar initials={w.initials} size={38} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: '15.5px' }}>{w.name}</div>
                    <span style={{ ...chip(chipColors[0], chipColors[1]), display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '11.5px', padding: '5px 11px' }}>
                      {chipColors[2]}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    {w.barangay ?? '—'} · {w.jobs_count > 0 ? `${w.jobs_count}+ jobs` : 'New'} · {w.contact ?? '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
                    {w.service_tags.map((id) => (
                      <span
                        key={id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: id === 'aircon' ? '#e8f1fb' : colors.primaryTint,
                          color: id === 'aircon' ? colors.blueDeep : colors.primaryTintText,
                        }}
                      >
                        {SVC_LABEL[id] ?? id}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {w.auth_user_id ? (
                    <button
                      onClick={() => setResetting(w)}
                      style={{ border: `1px solid ${colors.border}`, cursor: 'pointer', background: '#fff', color: colors.inkSoft, fontWeight: 700, fontSize: '11.5px', padding: '7px 10px', borderRadius: 9 }}
                    >
                      Reset password
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', color: colors.faint }}>No login yet</span>
                  )}
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: w.verified ? colors.primaryTintText : colors.danger }}>
                    {w.verified ? 'Cleared for dispatch' : 'Not cleared'}
                  </span>
                  <Toggle on={w.verified} onClick={() => toggleVerified.mutate({ id: w.id, verified: !w.verified })} size="sm" />
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: w.active ? colors.primaryTintText : colors.faint }}>
                    {w.active ? 'Active' : 'Inactive'}
                  </span>
                  <Toggle on={w.active} onClick={() => toggleActive.mutate({ id: w.id, active: !w.active })} size="sm" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 22, marginTop: 14, paddingTop: 14, borderTop: '1px solid #f2ece0', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: colors.faint, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 5 }}>Vetting</div>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12.5px', fontWeight: 700, color: colors.primaryTintText }}>
                      <TickIcon /> ID
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12.5px', fontWeight: 700, color: markColor(w.nbi_verified, status === 'pending') }}>
                      {mark(w.nbi_verified, status === 'pending')} NBI
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12.5px', fontWeight: 700, color: markColor(w.agreement_verified, false) }}>
                      {mark(w.agreement_verified, false)} Agreement
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: colors.faint, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 5 }}>Commission</div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#39443f' }}>{Math.round(w.commission_rate * 100)}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: colors.faint, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 5 }}>Rating</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e6913c' }}>{w.jobs_count > 0 ? `★ ${w.rating}` : '—'}</div>
                </div>
                <div style={{ flex: 1, minWidth: 250 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: colors.faint, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 5 }}>Available days</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {DAYS.map((d) => {
                      const days = w.available_days ?? [];
                      const on = days.includes(d);
                      return (
                        <div
                          key={d}
                          onClick={() => {
                            const next = on ? days.filter((x) => x !== d) : [...days, d];
                            toggleDay.mutate({ id: w.id, days: next });
                          }}
                          style={{
                            width: 34,
                            padding: '6px 0',
                            textAlign: 'center',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            userSelect: 'none',
                            border: `1px solid ${on ? colors.primary : colors.border}`,
                            background: on ? colors.primary : '#fff',
                            color: on ? '#fff' : '#a8a290',
                          }}
                        >
                          {d}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ minWidth: 200 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: colors.faint, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 5 }}>
                    Working hours
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <select
                      value={w.available_start_hour}
                      onChange={(e) => updateHours.mutate({ id: w.id, startHour: Number(e.target.value), endHour: w.available_end_hour })}
                      style={{ border: `1px solid ${colors.border}`, borderRadius: 8, padding: '6px 8px', fontSize: 12, fontWeight: 700, background: '#fff', color: colors.ink }}
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h} disabled={h >= w.available_end_hour}>
                          {formatHour12(h)}
                        </option>
                      ))}
                    </select>
                    <span style={{ color: colors.faint, fontSize: 12 }}>to</span>
                    <select
                      value={w.available_end_hour}
                      onChange={(e) => updateHours.mutate({ id: w.id, startHour: w.available_start_hour, endHour: Number(e.target.value) })}
                      style={{ border: `1px solid ${colors.border}`, borderRadius: 8, padding: '6px 8px', fontSize: 12, fontWeight: 700, background: '#fff', color: colors.ink }}
                    >
                      {HOURS.map((h) => (
                        <option key={h + 1} value={h + 1} disabled={h + 1 <= w.available_start_hour}>
                          {formatHour12((h + 1) % 24)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}

      {addOpen ? <AddWorkerModal onClose={() => setAddOpen(false)} /> : null}
      {resetting ? <ResetPasswordModal partner={resetting} onClose={() => setResetting(null)} /> : null}
    </div>
  );
}
