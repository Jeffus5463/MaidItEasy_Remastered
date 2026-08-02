// Global booking state shared across the checkout flow.
import React, { createContext, useContext, useMemo, useState } from 'react';
import { DUMAGUETE_CENTER, MIN_BOOKING_HOURS, SERVICES, ServiceId } from './data';

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

  const value = useMemo<BookingContext>(() => {
    const set = (patch: Partial<BookingState>) => setState((s) => ({ ...s, ...patch }));
    const reset = () => setState(initial);
    const svc = state.service ? SERVICES[state.service] : null;
    const total = !svc
      ? 0
      : svc.pricingModel === 'per_hour'
        ? state.durationHours * (svc.hourlyRate ?? 0)
        : svc.price * state.units;
    return { ...state, set, reset, total };
  }, [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBooking() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBooking must be used inside <BookingProvider>');
  return ctx;
}
