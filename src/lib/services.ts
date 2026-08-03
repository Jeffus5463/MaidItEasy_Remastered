// Live service catalog (Phase 7) — price/duration/active/etc. come from the
// real `services` table now, not a hardcoded object, so an admin's catalog
// edit (admin/src/app/catalog/page.tsx) reaches every screen below instead
// of only the app bundle's build-time snapshot. Mirrors
// admin/src/lib/data.ts#useServices(); RLS: services_public_read grants
// SELECT to everyone, so this needs no auth-specific policy.
//
// Snapshot invariant: an existing booking's own bookings.total/
// duration_hours are never recomputed from this — screens showing an
// already-created booking always render its own stored fields, never a
// fresh price lookup. Only the checkout flow (src/store.tsx's `total`,
// app/booking.tsx's live preview) computes a total from these live fields,
// and that's only ever a preview: the bookings_capacity_guard trigger (see
// supabase/migrations/*_service_price_integrity.sql) recomputes and
// overwrites the authoritative total server-side on insert regardless of
// what the client sends.
import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { PricingModel, SERVICE_PRESENTATION, ServiceId } from '../data';

// Raw shape of a `services` row (snake_case, matches the DB) — same as
// admin/src/lib/types.ts#ServiceRow.
export interface ServiceRow {
  id: ServiceId;
  name: string;
  price: number;
  suffix: string;
  duration: string;
  price_label: string;
  active: boolean;
  pricing_model: PricingModel;
  hourly_rate: number | null;
  estimated_minutes_per_unit: number;
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('*').order('name');
      if (error) throw error;
      return data as ServiceRow[];
    },
  });
}

// Merged shape every screen actually renders — the live DB fields
// (camelCase, matching this app's existing convention) plus this service's
// static presentation copy. Same field names as the old hardcoded `Service`
// type it replaces, so call sites only needed to change where the object
// comes from, not what they read off it.
export interface Service {
  id: ServiceId;
  name: string;
  price: number;
  suffix: string;
  duration: string;
  priceLabel: string;
  pricingModel: PricingModel;
  hourlyRate: number | null;
  estimatedMinutesPerUnit: number | null;
  active: boolean;
  desc: string;
  accent: string;
  tint: string;
  includes: string[];
}

export function mergeService(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    suffix: row.suffix,
    duration: row.duration,
    priceLabel: row.price_label,
    pricingModel: row.pricing_model,
    hourlyRate: row.hourly_rate,
    estimatedMinutesPerUnit: row.estimated_minutes_per_unit,
    active: row.active,
    ...SERVICE_PRESENTATION[row.id],
  };
}

export function findService(services: ServiceRow[] | undefined, id: ServiceId): Service | undefined {
  const row = services?.find((s) => s.id === id);
  return row ? mergeService(row) : undefined;
}
