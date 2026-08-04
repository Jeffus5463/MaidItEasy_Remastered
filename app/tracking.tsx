import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../src/theme';
import { CANCELLATION_WINDOW_HOURS, TRACK_STEPS } from '../src/data';
import { ErrorState, FieldError, LoadingState } from '../src/components/UI';
import { SupportBlock } from '../src/components/SupportBlock';
import { cancelBookingCustomer, useBookingTracking } from '../src/lib/bookings';
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
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
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

  // Matches app/tracking.tsx's sibling screens' local-midnight parsing
  // (toLocalIso/formatBookingWhen) — the same "date" string means the same
  // calendar moment both here and in cancel_booking_customer()'s server-side
  // check.
  const startMs = new Date(`${booking.date}T00:00:00`).getTime() + booking.start_hour * 60 * 60 * 1000;
  const hoursUntilStart = (startMs - Date.now()) / (60 * 60 * 1000);
  const withinCancelWindow = hoursUntilStart >= CANCELLATION_WINDOW_HOURS;
  const canSelfCancel = !cancelled && (booking.status === 'pending' || booking.status === 'assigned');
  const gcashPayment = booking.payments?.find((p) => p.method === 'gcash') ?? null;
  const paidViaGcash = gcashPayment?.status === 'verified';
  const cancelCopy = !paidViaGcash
    ? "Nothing has been charged yet, so there's nothing to refund."
    : withinCancelWindow
      ? `You'll get a full refund — this is more than ${CANCELLATION_WINDOW_HOURS} hours before your booking.`
      : `No refund will be given — this is within ${CANCELLATION_WINDOW_HOURS} hours of your booking.`;

  const onConfirmCancel = async () => {
    setCancelError('');
    setCancelling(true);
    try {
      await cancelBookingCustomer(booking.id);
      setCancelOpen(false);
      refetch();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Could not cancel this booking. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

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
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelledText}>
                {expired ? "Booking expired — payment wasn't completed in time." : 'This booking was cancelled.'}
              </Text>
              {!expired && booking.refund_needed && (
                <Text style={styles.cancelledSubText}>
                  {booking.refunded_at ? 'Refunded.' : "Refund pending — we'll process it shortly."}
                </Text>
              )}
            </View>
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
        {canSelfCancel && (
          <Pressable style={styles.cancelBtn} onPress={() => setCancelOpen(true)}>
            <Text style={styles.cancelBtnText}>Cancel booking</Text>
          </Pressable>
        )}
        <Pressable style={styles.ghost} onPress={() => router.replace('/home')}>
          <Text style={styles.ghostText}>Back to home</Text>
        </Pressable>
      </View>

      <Modal visible={cancelOpen} transparent animationType="slide" onRequestClose={() => setCancelOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setCancelOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Cancel this booking?</Text>
            <Text style={styles.sheetSub}>{cancelCopy}</Text>
            {!!cancelError && <FieldError>{cancelError}</FieldError>}
            <View style={styles.sheetFooter}>
              <Pressable style={styles.keepBtn} onPress={() => setCancelOpen(false)}>
                <Text style={styles.keepBtnText}>Keep booking</Text>
              </Pressable>
              <Pressable
                style={[styles.cancelConfirmBtn, cancelling && styles.cancelConfirmBtnDisabled]}
                disabled={cancelling}
                onPress={onConfirmCancel}
              >
                <Text style={styles.cancelConfirmBtnText}>{cancelling ? 'Cancelling…' : 'Cancel booking'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  cancelledSubText: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, marginTop: 2 },
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
  footer: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 8, gap: 10 },
  ghost: { width: '100%', paddingVertical: 16, borderRadius: radius.lg, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  ghostText: { fontFamily: fonts.bold, fontSize: 16, color: colors.inkSoft },
  cancelBtn: { width: '100%', paddingVertical: 16, borderRadius: radius.lg, alignItems: 'center', borderWidth: 1.5, borderColor: '#e6c9c2', backgroundColor: colors.white },
  cancelBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.danger },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20,30,28,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.creamAlt, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 22, paddingBottom: 28 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#dcd3c2', alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  sheetSub: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 19 },
  sheetFooter: { flexDirection: 'row', gap: 11, marginTop: 18 },
  keepBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  keepBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.inkSoft },
  cancelConfirmBtn: { flex: 1, backgroundColor: colors.danger, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  cancelConfirmBtnDisabled: { backgroundColor: '#d8b4ab' },
  cancelConfirmBtnText: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.white },
});
