'use client';

import { useState } from 'react';
import { useAssignPartner, useBookings, usePartners } from '@/lib/data';
import { formatWhen, serviceLabel } from '@/lib/format';
import { colors, fonts } from '@/theme';
import { BookingRow } from '@/lib/types';
import { useToast } from './Toast';
import { Avatar, Modal, chip, svcIconWrap } from './shared';
import { AirconIcon, BroomIcon, CloseIcon, TickIcon, ShieldIcon } from './icons';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Trailing buffer after every job, in minutes — must match buffer_minutes()
// in supabase/migrations/*_hourly_booking_capacity.sql (the real source of
// truth, enforced server-side); duplicated here the same way src/data.ts's
// BUFFER_MINUTES mirrors it for the Expo app, since this admin app shares
// no code with either.
const BUFFER_MINUTES = 30;

export function AssignModal({ booking, onClose }: { booking: BookingRow; onClose: () => void }) {
  const { data: partners } = usePartners();
  const { data: allBookings } = useBookings();
  const assignPartner = useAssignPartner();
  const showToast = useToast();

  // Use the booking's own date, not today — appending "T00:00:00" (no "Z")
  // forces local-time parsing so this doesn't shift a day depending on the
  // server's timezone (see src/lib/bookings.ts#formatBookingWhen for the
  // same pattern).
  const bookingWeekday = WEEKDAYS[new Date(`${booking.date}T00:00:00`).getDay()];
  const newStartMin = booking.start_hour * 60;
  const newEndMin = (booking.start_hour + booking.duration_hours) * 60 + BUFFER_MINUTES;

  const candidates = (partners ?? [])
    .filter((p) => p.verified && p.active)
    .map((p) => {
      const qualified = (p.service_tags ?? []).includes(booking.service_id);
      const onShift = (p.available_days ?? []).includes(bookingWeekday);
      const withinHours = booking.start_hour >= p.available_start_hour && booking.start_hour + booking.duration_hours <= p.available_end_hour;
      // Span-based conflict (Phase 4): busy if [this booking's span+buffer]
      // overlaps ANY other non-terminal booking of this worker's that day —
      // across every service, not just this one, so a worker mid-cleaning
      // is correctly unavailable for an overlapping aircon job too.
      const busy = (allBookings ?? []).some((b) => {
        if (b.partner_id !== p.id || b.id === booking.id || b.date !== booking.date) return false;
        if (['completed', 'cancelled'].includes(b.status)) return false;
        const existingStartMin = b.start_hour * 60;
        const existingEndMin = (b.start_hour + b.duration_hours) * 60 + BUFFER_MINUTES;
        return newStartMin < existingEndMin && existingStartMin < newEndMin;
      });
      const ok = qualified && onShift && withinHours && !busy;
      const reason = !qualified
        ? `Not tagged for ${booking.service_id === 'aircon' ? 'aircon' : 'cleaning'}`
        : !onShift
          ? `Off ${bookingWeekday}`
          : !withinHours
            ? 'Outside working hours'
            : busy
              ? 'Booked then'
              : '';
      return { partner: p, ok, reason };
    })
    .sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? -1 : 1));

  const okCount = candidates.filter((c) => c.ok).length;

  // Pre-select the worker the soft-hold engine already reserved at booking
  // time (bookings.partner_id set by the bookings_capacity_guard trigger),
  // if they're still feasible — the admin just confirms or overrides,
  // rather than hunting through the list themselves.
  const [pick, setPick] = useState<string | null>(() => {
    if (!booking.partner_id) return null;
    return candidates.find((c) => c.partner.id === booking.partner_id)?.ok ? booking.partner_id : null;
  });
  const isHeld = !!booking.partner_id && pick === booking.partner_id && booking.status === 'pending';

  const confirm = () => {
    if (!pick) return;
    const partner = candidates.find((c) => c.partner.id === pick)?.partner;
    assignPartner.mutate(
      { bookingId: booking.id, partnerId: pick },
      {
        onSuccess: () => {
          showToast(`${partner?.name} assigned · pushed to partner app`);
          onClose();
        },
      }
    );
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${colors.cardBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 19 }}>Assign a verified partner</div>
          <div
            onClick={onClose}
            style={{ cursor: 'pointer', width: 32, height: 32, borderRadius: 9, background: '#fff', border: `1px solid ${colors.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <CloseIcon />
          </div>
        </div>
        <div style={{ marginTop: 10, background: '#fff', border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={svcIconWrap(booking.service_id, 38)}>{booking.service_id === 'aircon' ? <AirconIcon size={18} /> : <BroomIcon size={18} />}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{serviceLabel(booking.service_id, booking.units, booking.tier, booking.duration_hours)}</div>
            <div style={{ fontSize: '11.5px', color: colors.muted }}>
              {formatWhen(booking.date, booking.start_hour, booking.duration_hours)} · {booking.barangay} · {booking.landmark}
            </div>
          </div>
        </div>
      </div>

      <div className="scr" style={{ padding: '14px 22px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
        <div style={{ fontSize: '11.5px', fontWeight: 800, color: colors.faint, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 9 }}>
          {okCount} of {candidates.length} verified partner{candidates.length === 1 ? '' : 's'} can take {booking.service_id === 'aircon' ? 'aircon' : 'cleaning'} at {formatWhen(booking.date, booking.start_hour, booking.duration_hours)}
        </div>

        {isHeld && (
          <div style={{ marginBottom: 10, fontSize: '11.5px', color: colors.primaryTintText, fontWeight: 700 }}>
            Pre-selected below — the system already held this worker&apos;s time for this booking.
          </div>
        )}

        {okCount === 0 && (
          <div style={{ border: '1.5px dashed #e0c9a6', background: '#fdf6ea', borderRadius: 14, padding: 16, display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ fontSize: '12.5px', color: '#7a5c1c', lineHeight: 1.5 }}>
              No verified partner is free for this service &amp; time slot. Free up a partner or add a new worker.
            </div>
          </div>
        )}

        {candidates.map(({ partner, ok, reason }) => {
          const selected = ok && pick === partner.id;
          return (
            <div
              key={partner.id}
              onClick={ok ? () => setPick(partner.id) : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 13px',
                borderRadius: 13,
                border: `1.5px solid ${selected ? colors.primary : colors.cardBorder}`,
                background: selected ? '#f5faf8' : ok ? '#fff' : '#f6f2ea',
                cursor: ok ? 'pointer' : 'not-allowed',
                marginBottom: 9,
                opacity: ok ? 1 : 0.75,
              }}
            >
              <div style={{ opacity: ok ? 1 : 0.45 }}>
                <Avatar initials={partner.initials} size={42} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: '14.5px' }}>{partner.name}</span>
                  <ShieldIcon />
                </div>
                <div style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>
                  {partner.barangay ?? '—'} · ★ {partner.rating} · {Math.round(partner.commission_rate * 100)}% commission
                </div>
              </div>
              <div style={chip(ok ? colors.primaryTint : '#f0e9db', ok ? colors.primaryTintText : '#8a7c5f')}>{ok ? 'Available' : reason}</div>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  flex: 'none',
                  border: selected ? 'none' : `2px solid ${colors.disabled}`,
                  background: selected ? colors.primary : ok ? '#fff' : '#efe9dd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selected ? <TickIcon size={13} color="#fff" /> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '16px 22px', borderTop: `1px solid ${colors.cardBorder}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, fontSize: '11.5px', color: colors.muted }}>Partner is notified instantly in their app</div>
        <button
          onClick={confirm}
          disabled={!pick || assignPartner.isPending}
          style={{
            border: 'none',
            cursor: pick ? 'pointer' : 'not-allowed',
            background: pick ? colors.primary : colors.disabled,
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            padding: '12px 20px',
            borderRadius: 12,
          }}
        >
          {assignPartner.isPending ? 'Assigning…' : 'Assign & push'}
        </button>
      </div>
    </Modal>
  );
}
