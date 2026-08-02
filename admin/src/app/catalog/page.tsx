'use client';

import { useState } from 'react';
import { useServices, useToggleServiceActive, useUpdateService } from '@/lib/data';
import { colors, fonts } from '@/theme';
import { TopBar, Toggle, chip, svcIconWrap } from '@/components/shared';
import { AirconIcon, BroomIcon } from '@/components/icons';
import { useToast } from '@/components/Toast';
import { ServiceRow } from '@/lib/types';

function CatalogCard({ service }: { service: ServiceRow }) {
  const toggleActive = useToggleServiceActive();
  const updateService = useUpdateService();
  const showToast = useToast();
  const [price, setPrice] = useState(String(service.price));
  const [duration, setDuration] = useState(service.duration);
  const [hourlyRate, setHourlyRate] = useState(String(service.hourly_rate ?? ''));
  const [estMinutes, setEstMinutes] = useState(String(service.estimated_minutes_per_unit));

  const commitPrice = () => {
    const next = Number(price);
    if (!Number.isFinite(next) || next <= 0 || next === service.price) {
      setPrice(String(service.price));
      return;
    }
    updateService.mutate({ id: service.id, price: next }, { onSuccess: () => showToast(`${service.name} price updated`) });
  };

  const commitDuration = () => {
    if (duration.trim() === service.duration) return;
    updateService.mutate({ id: service.id, duration: duration.trim() });
  };

  const commitHourlyRate = () => {
    const next = Number(hourlyRate);
    if (!Number.isFinite(next) || next <= 0 || next === service.hourly_rate) {
      setHourlyRate(String(service.hourly_rate ?? ''));
      return;
    }
    updateService.mutate({ id: service.id, hourlyRate: next }, { onSuccess: () => showToast(`${service.name} hourly rate updated`) });
  };

  const commitEstMinutes = () => {
    const next = Number(estMinutes);
    if (!Number.isFinite(next) || next <= 0 || next === service.estimated_minutes_per_unit) {
      setEstMinutes(String(service.estimated_minutes_per_unit));
      return;
    }
    updateService.mutate({ id: service.id, estimatedMinutesPerUnit: next });
  };

  return (
    <div style={{ background: '#fff', border: `1px solid ${colors.cardBorder}`, borderRadius: 18, padding: 18, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 15 }}>
        <div style={svcIconWrap(service.id, 56)}>{service.id === 'aircon' ? <AirconIcon /> : <BroomIcon />}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ fontWeight: 700, fontSize: '16.5px' }}>{service.name}</div>
            <span style={chip(service.active ? colors.primaryTint : '#f0e9db', service.active ? colors.primaryTintText : '#8a7c5f')}>
              {service.active ? 'Active' : 'Hidden'}
            </span>
          </div>
        </div>
        <Toggle on={service.active} onClick={() => toggleActive.mutate({ id: service.id, active: !service.active })} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 15, paddingTop: 15, borderTop: '1px solid #f2ece0' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Fixed price</label>
          <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${colors.border}`, borderRadius: 11, padding: '9px 12px', marginTop: 6, background: colors.inputBg }}>
            <span style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.primary, fontSize: 17 }}>₱</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={commitPrice}
              style={{ border: 'none', background: 'transparent', fontFamily: fonts.display, fontWeight: 700, fontSize: 17, width: '100%', marginLeft: 2, color: colors.ink }}
            />
            <span style={{ fontSize: '12.5px', color: colors.muted, fontWeight: 600 }}>{service.suffix}</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Duration estimate</label>
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            onBlur={commitDuration}
            style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${colors.border}`, borderRadius: 11, padding: '11px 12px', marginTop: 6, background: colors.inputBg, fontWeight: 700, fontSize: 14, color: colors.ink }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'flex-end' }}>
        <div>
          {/* pricing_model itself is shown read-only, not a live dropdown —
              flipping a service between per_hour/per_unit would silently
              change how every NEW booking is priced/durationed (Phase 4,
              supabase/migrations/*_hourly_booking_schema.sql) with no
              migration for bookings already scheduled, which isn't safe to
              expose as a casual toggle. */}
          <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Pricing model</label>
          <div style={{ marginTop: 6 }}>
            <span style={chip(service.pricing_model === 'per_hour' ? colors.primaryTint : colors.blueTint, service.pricing_model === 'per_hour' ? colors.primaryTintText : colors.blueDeep)}>
              {service.pricing_model === 'per_hour' ? 'Per hour' : 'Per unit'}
            </span>
          </div>
        </div>
        {service.pricing_model === 'per_hour' ? (
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Hourly rate <span style={{ color: colors.goldText }}>· placeholder, confirm before launch</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${colors.border}`, borderRadius: 11, padding: '9px 12px', marginTop: 6, background: colors.inputBg }}>
              <span style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.primary, fontSize: 17 }}>₱</span>
              <input
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value.replace(/[^0-9]/g, ''))}
                onBlur={commitHourlyRate}
                style={{ border: 'none', background: 'transparent', fontFamily: fonts.display, fontWeight: 700, fontSize: 17, width: '100%', marginLeft: 2, color: colors.ink }}
              />
              <span style={{ fontSize: '12.5px', color: colors.muted, fontWeight: 600 }}>/hr</span>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Est. minutes per unit</label>
            <input
              value={estMinutes}
              onChange={(e) => setEstMinutes(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={commitEstMinutes}
              style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${colors.border}`, borderRadius: 11, padding: '11px 12px', marginTop: 6, background: colors.inputBg, fontWeight: 700, fontSize: 14, color: colors.ink }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function CatalogPage() {
  const { data: services, isLoading } = useServices();

  return (
    <div style={{ animation: 'fadeUp .3s ease both', maxWidth: 720 }}>
      <TopBar title="Service catalog" subtitle="Manage fixed-price launch services" />

      {isLoading || !services ? (
        <div style={{ color: colors.muted, fontSize: 14 }}>Loading…</div>
      ) : (
        services.map((s) => <CatalogCard key={s.id} service={s} />)
      )}

      <div style={{ border: '1.5px dashed #d4cbb9', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 11, color: '#a09a89' }}>
        <div style={{ fontSize: '12.5px', lineHeight: 1.4 }}>
          Plumbing, electrical &amp; handyman are queued for launch. Adding new services isn&apos;t wired up yet.
        </div>
      </div>
    </div>
  );
}
