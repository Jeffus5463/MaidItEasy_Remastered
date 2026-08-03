// Global booking state shared across the checkout flow.
import React, { createContext, useContext, useMemo, useState } from 'react';
import { DUMAGUETE_CENTER, MIN_BOOKING_HOURS, ServiceId } from './data';
import { findService, useServices } from './lib/services';

export interface BookingState {
  phone: string;
  service: ServiceId | null;
  units: number;
  date: string; // "Fri, Jul 24" — for display
  dateIso: string; // "2026-07-25" — for the DB
  startHour: number | null;
  durationHours: number; // per_hour: customer's chosen block; per_unit: derived from units
  barangay: string;
  landmark: string;
  contact: string;
  latitude: number;
  longitude: number;
  payment: 'gcash' | 'cash' | '';
  gcashRef: string;
  bookingId: string | null; // set once the booking row is created in Supabase
}

interface BookingContext extends BookingState {
  set: (patch: Partial<BookingState>) => void;
  reset: () => void;
  total: number;
}

const initial: BookingState = {
  phone: '',
  service: null,
  units: 1,
  date: '',
  dateIso: '',
  startHour: null,
  durationHours: MIN_BOOKING_HOURS,
  barangay: '',
  landmark: '',
  contact: '',
  latitude: DUMAGUETE_CENTER.latitude,
  longitude: DUMAGUETE_CENTER.longitude,
  payment: '',
  gcashRef: '',
  bookingId: null,
};

const Ctx = createContext<BookingContext | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BookingState>(initial);
  // Live pricing (Phase 7) — this `total` is what payment.tsx sends to
  // createBooking(), so it must track the real services table, not a
  // hardcoded price. It's still only ever a preview: the
  // bookings_capacity_guard trigger recomputes and overwrites the
  // authoritative total server-side on insert regardless of what's sent.
  const { data: services } = useServices();

  const value = useMemo<BookingContext>(() => {
    const set = (patch: Partial<BookingState>) => setState((s) => ({ ...s, ...patch }));
    const reset = () => setState(initial);
    const svc = state.service ? findService(services, state.service) : null;
    const total = !svc
      ? 0
      : svc.pricingModel === 'per_hour'
        ? state.durationHours * (svc.hourlyRate ?? 0)
        : svc.price * state.units;
    return { ...state, set, reset, total };
  }, [state, services]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBooking() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBooking must be used inside <BookingProvider>');
  return ctx;
}
