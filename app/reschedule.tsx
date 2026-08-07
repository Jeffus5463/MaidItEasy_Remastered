import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../src/theme';
import { formatHour12, nextDates } from '../src/data';
import { ErrorState, FieldError, LoadingState, PrimaryButton } from '../src/components/UI';
import { bookingScope, rescheduleBookingCustomer, useAvailableStartHoursForReschedule, useBookingTracking } from '../src/lib/bookings';
import { findService, useServices } from '../src/lib/services';

const DATES = nextDates();

// Duration is fixed to the existing booking's duration_hours — a reschedule
// only ever moves date/start_hour, never re-derives price/duration (see
// reschedule_booking_customer(), supabase/migrations/*_customer_reschedule.sql).
export default function Reschedule() {
  const { id: bookingId } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading, isError, refetch } = useBookingTracking(bookingId ?? null);
  const { data: serviceRows, isLoading: loadingServices, isError: errorServices, refetch: refetchServices } = useServices();

  const [dateIso, setDateIso] = useState('');
  const [startHour, setStartHour] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const durationHours = booking?.duration_hours ?? 0;
  const { data: availability, isLoading: availabilityLoading } = useAvailableStartHoursForReschedule(
    booking?.id ?? null,
    booking?.service_id ?? null,
    dateIso,
    durationHours
  );
  const slots = availability ?? [];

  // Picking a new date always requires re-picking a time, same reasoning
  // as app/booking.tsx's own effect (a previously valid hour may no longer
  // fit or be free on the newly chosen date).
  useEffect(() => {
    if (startHour === null) return;
    const stillOk = slots.some((s) => s.startHour === startHour && s.available);
    if (!stillOk) setStartHour(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateIso]);

  if (isLoading || loadingServices) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState message="Loading your booking…" />
      </SafeAreaView>
    );
  }

  const svc = booking ? findService(serviceRows, booking.service_id) : undefined;

  if (isError || errorServices || !booking || !svc) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState onRetry={() => (isError ? refetch() : refetchServices())} />
      </SafeAreaView>
    );
  }

  if (booking.status !== 'pending' && booking.status !== 'assigned') {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState message="This booking can no longer be rescheduled here — please call us." />
      </SafeAreaView>
    );
  }

  const ready = !!dateIso && startHour !== null;

  const onConfirm = async () => {
    if (startHour === null) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      await rescheduleBookingCustomer(booking.id, dateIso, startHour);
      router.replace({ pathname: '/tracking', params: { id: booking.id } });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not reschedule this booking. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹  Back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Reschedule booking</Text>
        <Text style={styles.sub}>
          {svc.name} · {bookingScope(booking)}
        </Text>

        <View style={styles.block}>
          <Text style={styles.label}>Choose a new date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            {DATES.map((d) => {
              const active = d.iso === dateIso;
              return (
                <Pressable
                  key={d.iso}
                  style={[styles.dateChip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.white }]}
                  onPress={() => {
                    setDateIso(d.iso);
                    setStartHour(null);
                  }}
                >
                  <Text style={[styles.dateDow, { color: active ? colors.white : colors.muted }]}>{d.dow}</Text>
                  <Text style={[styles.dateDay, { color: active ? colors.white : colors.ink }]}>{d.day}</Text>
                  <Text style={[styles.dateMon, { color: active ? colors.white : colors.muted }]}>{d.mon}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Choose a new start time</Text>
          <View style={styles.timeRow}>
            {slots.map((s) => {
              const active = s.startHour === startHour;
              const full = !s.available;
              return (
                <Pressable
                  key={s.startHour}
                  disabled={full}
                  onPress={() => setStartHour(s.startHour)}
                  style={[
                    styles.timePill,
                    {
                      borderStyle: full ? 'dashed' : 'solid',
                      borderColor: full ? '#ddd6c8' : active ? colors.primary : colors.border,
                      backgroundColor: full ? '#f4f1e9' : active ? colors.primary : colors.white,
                    },
                  ]}
                >
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: full ? colors.mutedSoft : active ? colors.white : colors.inkSoft }}>
                    {formatHour12(s.startHour)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.note}>
            {!dateIso
              ? 'Choose a date to see live availability.'
              : availabilityLoading
                ? 'Checking availability…'
                : slots.length === 0
                  ? 'No start times left for that date — try another day.'
                  : 'Some times may be full based on partner availability.'}
          </Text>
        </View>

        {!!submitError && <FieldError>{submitError}</FieldError>}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={submitting ? 'Rescheduling…' : 'Confirm reschedule'}
          disabled={!ready || submitting}
          onPress={onConfirm}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  back: { paddingHorizontal: 20, paddingVertical: 12 },
  backText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.inkSoft },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },
  h1: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  sub: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted, marginTop: 4 },
  block: { marginTop: 26 },
  label: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink, marginBottom: 12 },
  dateRow: { gap: 10, paddingVertical: 2 },
  dateChip: { minWidth: 60, borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', gap: 2 },
  dateDow: { fontFamily: fonts.semibold, fontSize: 12 },
  dateDay: { fontFamily: fonts.display, fontSize: 20 },
  dateMon: { fontFamily: fonts.medium, fontSize: 11 },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timePill: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.xl, borderWidth: 1.5 },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 10 },
  footer: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.cream },
});
