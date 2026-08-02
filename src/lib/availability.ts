// Real slot availability — per-worker soft-hold timelines (Phase 4).
// A start hour is available only if at least one qualified worker is free
// for the whole [start_hour, start_hour+duration_hours) span plus a
// trailing buffer, across every service that worker is booked for that
// day — see supabase/migrations/*_hourly_booking_capacity.sql for the
// SECURITY DEFINER functions this calls (a customer session must never see
// other customers' bookings or the full partner directory in bulk, just
// the aggregate answer).
import { useQuery } from '@tanstack/react-query';
import { ServiceId } from '../data';
import { supabase } from './supabase';

export interface HourSlot {
  startHour: number;
  available: boolean;
}

export function useAvailableStartHours(serviceId: ServiceId | null, dateIso: string, durationHours: number) {
  return useQuery({
    queryKey: ['availability', serviceId, dateIso, durationHours],
    queryFn: async (): Promise<HourSlot[]> => {
      const { data, error } = await supabase.rpc('available_start_hours', {
        p_service_id: serviceId,
        p_date: dateIso,
        p_duration_hours: durationHours,
      });
      if (error) throw error;
      return ((data as { start_hour: number; available: boolean }[] | null) ?? [])
        .map((r) => ({ startHour: r.start_hour, available: r.available }))
        .sort((a, b) => a.startHour - b.startHour);
    },
    enabled: !!serviceId && !!dateIso && durationHours > 0,
  });
}
