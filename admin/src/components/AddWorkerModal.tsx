'use client';

import { useState } from 'react';
import { useAddWorker } from '@/lib/data';
import { formatHour12 } from '@/lib/format';
import { colors, fonts } from '@/theme';
import { Modal, Toggle } from './shared';
import { AirconIcon, BroomIcon, CloseIcon, TickIcon } from './icons';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// 9 -> 20 as start-hour options, 10 -> 21 as end-hour options, matching
// the roster's working-hours selects (admin/src/app/roster/page.tsx) and
// business_open_hour()/business_close_hour() (9-21, supabase/migrations/
// *_hourly_booking_schema.sql).
const HOURS = Array.from({ length: 12 }, (_, i) => 9 + i);

export function AddWorkerModal({ onClose }: { onClose: () => void }) {
  const addWorker = useAddWorker();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [commission, setCommission] = useState('20');
  const [verified, setVerified] = useState(false);
  const [days, setDays] = useState<string[]>(DEFAULT_DAYS);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(21);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null);

  const toggleService = (id: string) => {
    setServices((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const toggleDay = (d: string) => {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  };

  const canSave = name.trim().length > 0 && email.trim().length > 0 && services.length > 0 && days.length > 0 && startHour < endHour;

  const save = () => {
    if (!canSave) return;
    setError(null);
    addWorker.mutate(
      {
        name,
        email,
        contact,
        serviceTags: services,
        commissionRate: Number(commission) || 20,
        verified,
        availableDays: days,
        availableStartHour: startHour,
        availableEndHour: endHour,
      },
      {
        onSuccess: (result) => {
          setCreated({ name: name.trim(), email: email.trim(), password: result.temporaryPassword });
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not create the worker account.'),
      }
    );
  };

  const servicePick = (on: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '12px 13px',
    borderRadius: 12,
    cursor: 'pointer',
    border: `1.5px solid ${on ? colors.primary : colors.border}`,
    background: on ? '#f5faf8' : '#fff',
    fontWeight: 700,
    fontSize: '13.5px',
    color: on ? colors.primaryDark : colors.inkSoft,
  });

  if (created) {
    return (
      <Modal onClose={onClose} width={460}>
        <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${colors.cardBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: colors.primaryTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <TickIcon size={16} />
            </span>
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 19 }}>{created.name} added</div>
          </div>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: '13.5px', color: colors.inkSoft, lineHeight: 1.5 }}>
            Hand these off to the worker now — this password won&apos;t be shown again. They&apos;ll be forced to
            set a new one on first login.
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Email</label>
            <div style={{ marginTop: 6, border: `1.5px solid ${colors.border}`, borderRadius: 11, padding: '11px 13px', fontFamily: fonts.display, fontWeight: 700, fontSize: 14, background: colors.inputBg }}>
              {created.email}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Temporary password</label>
            <div style={{ marginTop: 6, border: `1.5px solid ${colors.border}`, borderRadius: 11, padding: '11px 13px', fontFamily: fonts.display, fontWeight: 700, fontSize: 16, letterSpacing: '.03em', background: colors.inputBg }}>
              {created.password}
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 22px', borderTop: `1px solid ${colors.cardBorder}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ border: 'none', cursor: 'pointer', background: colors.primary, color: '#fff', fontWeight: 800, fontSize: 14, padding: '12px 20px', borderRadius: 12 }}
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} width={500}>
      <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${colors.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 19 }}>Add worker</div>
          <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Contracted offline — attach ID, NBI clearance &amp; agreement from the roster afterward.</div>
        </div>
        <div onClick={onClose} style={{ cursor: 'pointer', width: 32, height: 32, borderRadius: 9, background: '#fff', border: `1px solid ${colors.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <CloseIcon />
        </div>
      </div>

      <div className="scr" style={{ padding: '18px 22px', overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ana dela Cruz"
            style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${colors.border}`, borderRadius: 11, padding: '11px 13px', marginTop: 6, fontSize: 14, fontWeight: 600, background: '#fff', color: colors.ink }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Email (used to log in)</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ana@example.com"
            type="email"
            style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${colors.border}`, borderRadius: 11, padding: '11px 13px', marginTop: 6, fontSize: 14, fontWeight: 600, background: '#fff', color: colors.ink }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Mobile number</label>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="0917 000 0000"
            style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${colors.border}`, borderRadius: 11, padding: '11px 13px', marginTop: 6, fontSize: 14, fontWeight: 600, background: '#fff', color: colors.ink }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Service tags</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <div onClick={() => toggleService('cleaning')} style={servicePick(services.includes('cleaning'))}>
              <BroomIcon size={18} />
              Home Cleaning
            </div>
            <div onClick={() => toggleService('aircon')} style={servicePick(services.includes('aircon'))}>
              <AirconIcon size={18} />
              Aircon
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#a8a290', marginTop: 6 }}>Determines which jobs this worker can be assigned.</div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Commission rate</label>
          <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${colors.border}`, borderRadius: 11, padding: '9px 13px', marginTop: 6, background: '#fff', width: 120 }}>
            <input
              value={commission}
              onChange={(e) => setCommission(e.target.value.replace(/[^0-9]/g, ''))}
              style={{ border: 'none', background: 'transparent', fontFamily: fonts.display, fontWeight: 700, fontSize: 16, width: '100%', color: colors.ink }}
            />
            <span style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.primary, fontSize: 16 }}>%</span>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Available days</label>
          <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
            {DAYS.map((d) => {
              const on = days.includes(d);
              return (
                <div
                  key={d}
                  onClick={() => toggleDay(d)}
                  style={{
                    width: 40,
                    padding: '8px 0',
                    textAlign: 'center',
                    borderRadius: 8,
                    fontSize: 12,
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
          {days.length === 0 ? <div style={{ fontSize: 11, color: colors.danger, marginTop: 6 }}>Pick at least one day.</div> : null}
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: colors.faint, letterSpacing: '.04em', textTransform: 'uppercase' }}>Working hours</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <select
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              style={{ border: `1.5px solid ${colors.border}`, borderRadius: 10, padding: '9px 10px', fontSize: 13, fontWeight: 700, background: '#fff', color: colors.ink }}
            >
              {HOURS.map((h) => (
                <option key={h} value={h} disabled={h >= endHour}>
                  {formatHour12(h)}
                </option>
              ))}
            </select>
            <span style={{ color: colors.faint, fontSize: 12 }}>to</span>
            <select
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              style={{ border: `1.5px solid ${colors.border}`, borderRadius: 10, padding: '9px 10px', fontSize: 13, fontWeight: 700, background: '#fff', color: colors.ink }}
            >
              {HOURS.map((h) => (
                <option key={h + 1} value={h + 1} disabled={h + 1 <= startHour}>
                  {formatHour12((h + 1) % 24)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: '13px 15px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Cleared for dispatch (verified)</div>
            <div style={{ fontSize: '11.5px', color: colors.muted }}>Vetting complete — eligible for jobs now</div>
          </div>
          <Toggle on={verified} onClick={() => setVerified((v) => !v)} />
        </div>
        {error ? (
          <div style={{ background: colors.dangerTint, border: `1px solid ${colors.dangerBorder}`, borderRadius: 11, padding: '11px 13px', fontSize: '12.5px', color: colors.danger }}>
            {error}
          </div>
        ) : null}
      </div>

      <div style={{ padding: '16px 22px', borderTop: `1px solid ${colors.cardBorder}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={{ border: `1px solid ${colors.border}`, cursor: 'pointer', background: '#fff', color: colors.inkSoft, fontWeight: 700, fontSize: 14, padding: '12px 18px', borderRadius: 12 }}>
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!canSave || addWorker.isPending}
          style={{ border: 'none', cursor: canSave ? 'pointer' : 'not-allowed', background: canSave ? colors.primary : colors.disabled, color: '#fff', fontWeight: 800, fontSize: 14, padding: '12px 20px', borderRadius: 12 }}
        >
          {addWorker.isPending ? 'Adding…' : 'Add worker'}
        </button>
      </div>
    </Modal>
  );
}
