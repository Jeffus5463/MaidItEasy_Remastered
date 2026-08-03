import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../src/theme';
import { TRACK_STEPS } from '../src/data';
import { ErrorState, LoadingState } from '../src/components/UI';
import { SupportBlock } from '../src/components/SupportBlock';
import { useBookingTracking } from '../src/lib/bookings';
import { useRealtimeInvalidate } from '../src/lib/realtime';
import { findService, useServices } from '../src/lib/services';
import { useBooking } from '../src/store';

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  assigned: 1,
  en_route: 2,
  in_progress: 3,
  completed: 4,
};

export default function Tracking() {
  const { id: paramId } = useLocalSearchParams<{ id?: string }>();
  const b = useBooking();
  const bookingId = paramId ?? b.bookingId;
  const { data: booking, isLoading, isError, refetch } = useBookingTracking(bookingId ?? null);
  const { data: serviceRows, isLoading: loadingServices, isError: errorServices, refetch: refetchServices } = useServices();
  useRealtimeInvalidate('bookings', bookingId ? `id=eq.${bookingId}` : undefined, ['bookings', bookingId]);
  // Backstop: catches anything missed during a dropped realtime connection.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const svc = findService(serviceRows, booking ? booking.service_id : (b.service ?? 'cleaning'));

  if (!bookingId) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState message="No booking to track." />
      </SafeAreaView>
    );
  }

  if (isLoading || loadingServices) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState message="Loading your booking…" />
      </SafeAreaView>
    );
  }

  // isError must be checked before `!booking` — react-query leaves `data`
  // undefined on a query error, so checking `!booking` first would mask a
  // real error behind an infinite loading state instead of showing retry.
  if (isError || errorServices || !booking || !svc) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState onRetry={() => (isError ? refetch() : refetchServices())} />
      </SafeAreaView>
    );
  }

  const cancelled = booking.status === 'cancelled';
  const expired = cancelled && booking.cancel_reason === 'expired-unpaid';
  // status flips to 'assigned' the moment the admin dispatches it — but
  // that's a push to the partner, not a confirmation. The partner can still
  // decline (back to 'pending' via release_and_rehold), so until
  // accepted_at is actually set, treat it the same as still-pending for
  // display: same rank, no named partner. Otherwise the customer sees "your
  // partner is confirmed" before the partner has responded at all.
  const confirmed = booking.status !== 'assigned' || !!booking.accepted_at;
  const idx = confirmed ? STATUS_RANK[booking.status] ?? 0 : 0;
  // partner_id may already be a soft hold (Phase 4) while status is still
  // 'pending' — that's not a dispatch yet (the admin still confirms), so
  // don't show a specific worker until it's real, matching the "Finding a
  // verified partner for you" copy on the Pending step below.
  const partner = confirmed && booking.status !== 'pending' ? booking.partners : null;
  const paymentRejected = booking.payments?.some((p) => p.status === 'rejected');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.h1}>Your booking</Text>
        <Text style={styles.hSub}>{svc.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {cancelled && (
          <View style={styles.cancelledBanner}>
            <Ionicons name={expired ? 'time-outline' : 'close-circle'} size={18} color={colors.danger} />
            <Text style={styles.cancelledText}>
              {expired ? "Booking expired — payment wasn't completed in time." : 'This booking was cancelled.'}
            </Text>
          </View>
        )}

        {!cancelled && paymentRejected && (
          <View style={styles.cancelledBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.cancelledText}>
              We couldn't verify your GCash payment — please re-send or call us.
            </Text>
          </View>
        )}

        {!cancelled && partner && (
          <View style={styles.partnerCard}>
            <View style={[styles.pAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.pAvatarText}>{partner.initials}</Text>
            </View>
            <View style={styles.pBody}>
              <Text style={styles.pName}>{partner.name}</Text>
              <View style={styles.pMetaRow}>
                <Ionicons name="star" size={13} color={colors.gold} />
                <Text style={styles.pMeta}>
                  {partner.rating.toFixed(1)} · {partner.jobs_count}+ jobs
                </Text>
              </View>
              <Text style={styles.pVerified}>Verified Partner · NBI clearance on file</Text>
            </View>
          </View>
        )}

        {!cancelled && (
          <View style={styles.steps}>
            {TRACK_STEPS.map((s, i) => {
              const done = i < idx;
              const active = i === idx;
              const on = done || active;
              return (
                <View key={s.title} style={styles.step}>
                  <View style={styles.rail}>
                    <View style={[styles.dot, { backgroundColor: on ? colors.primary : colors.border }]}>
                      {done && <Ionicons name="checkmark" size={13} color={colors.white} />}
                    </View>
                    {i < TRACK_STEPS.length - 1 && (
                      <View style={[styles.line, { backgroundColor: done ? colors.primary : colors.border }]} />
                    )}
                  </View>
                  <View style={styles.stepText}>
                    <Text style={[styles.stepTitle, { color: on ? colors.ink : colors.muted }]}>{s.title}</Text>
                    <Text style={styles.stepDesc}>{s.d}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ marginTop: 8 }}>
          <SupportBlock />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.ghost} onPress={() => router.replace('/home')}>
          <Text style={styles.ghostText}>Back to home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  h1: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  hSub: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted, marginTop: 2 },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  cancelledBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fbecea', borderRadius: radius.md, padding: 14, marginBottom: 20 },
  cancelledText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.danger },
  partnerCard: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 24 },
  pAvatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  pAvatarText: { color: colors.white, fontFamily: fonts.bold, fontSize: 18 },
  pBody: { flex: 1 },
  pName: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  pMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  pMeta: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  pVerified: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary, marginTop: 3 },
  steps: { marginTop: 4 },
  step: { flexDirection: 'row', gap: 14 },
  rail: { alignItems: 'center', width: 26 },
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, minHeight: 34, marginVertical: 2 },
  stepText: { flex: 1, paddingBottom: 24 },
  stepTitle: { fontFamily: fonts.bold, fontSize: 15 },
  stepDesc: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  footer: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 8 },
  ghost: { width: '100%', paddingVertical: 16, borderRadius: radius.lg, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  ghostText: { fontFamily: fonts.bold, fontSize: 16, color: colors.inkSoft },
});
