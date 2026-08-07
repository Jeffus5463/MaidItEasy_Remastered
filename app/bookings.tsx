import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '../src/components/BottomNav';
import { SupportBlock } from '../src/components/SupportBlock';
import { EmptyState, ErrorState, LoadingState } from '../src/components/UI';
import { BookingStatus, bookingTicketCode, peso } from '../src/data';
import { colors, fonts, radius, shadow } from '../src/theme';
import { formatBookingWhen, statusLabel, useMyBookings } from '../src/lib/bookings';
import { findService, useServices } from '../src/lib/services';

const STATUS_TINTS: Record<BookingStatus, { bg: string; fg: string }> = {
  Pending: { bg: colors.goldTint, fg: colors.goldText },
  'Verifying payment': { bg: colors.goldTint, fg: colors.goldText },
  'Payment issue': { bg: '#fbecea', fg: colors.danger },
  Assigned: { bg: colors.primaryTintBg, fg: colors.primaryDark },
  'En route': { bg: colors.primaryTintBg, fg: colors.primaryDark },
  'In progress': { bg: colors.primaryTintBg, fg: colors.primaryDark },
  Completed: { bg: colors.primaryTintBg, fg: colors.primaryDark },
  Cancelled: { bg: '#fbecea', fg: colors.danger },
};

export default function Bookings() {
  const { data: bookings, isLoading, isError, refetch } = useMyBookings();
  const { data: serviceRows, isLoading: loadingServices, isError: errorServices, refetch: refetchServices } = useServices();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Text style={styles.h1}>My bookings</Text>

      {isLoading || loadingServices ? (
        <LoadingState message="Loading your bookings…" />
      ) : isError || errorServices ? (
        <ErrorState onRetry={() => (isError ? refetch() : refetchServices())} />
      ) : !bookings || bookings.length === 0 ? (
        <View style={styles.scroll}>
          <EmptyState
            icon="reader-outline"
            title="No bookings yet"
            message="Book a service from Home and it'll show up here."
          />
          <SupportBlock />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {bookings.map((booking) => {
            const svc = findService(serviceRows, booking.service_id);
            if (!svc) return null;
            // 'assigned' is a push to the partner, not a confirmation — the
            // partner can still decline it back to 'pending'. Don't show
            // "Assigned" until accepted_at is actually set, same reasoning
            // as the tracking screen (app/tracking.tsx).
            const dispatched = booking.status === 'assigned' && !booking.accepted_at;
            // Derived payment stage (Phase 14, no new booking status) takes
            // over the chip whenever a GCash payment isn't verified yet —
            // same three states as app/tracking.tsx's timeline.
            const gcashPayment = booking.payments.find((p) => p.method === 'gcash');
            const status: BookingStatus =
              booking.status !== 'cancelled' && gcashPayment?.status === 'awaiting_payment'
                ? 'Verifying payment'
                : booking.status !== 'cancelled' && gcashPayment?.status === 'rejected'
                  ? 'Payment issue'
                  : statusLabel(dispatched ? 'pending' : booking.status);
            const tint = STATUS_TINTS[status];
            const barangay = [booking.barangay, booking.landmark].filter(Boolean).join(', ');
            return (
              <Pressable
                key={booking.id}
                style={styles.row}
                onPress={() => router.push({ pathname: '/tracking', params: { id: booking.id } })}
              >
                <View style={styles.rowTop}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.icon, { backgroundColor: booking.service_id === 'aircon' ? colors.blueTint : colors.primaryTintBg }]}>
                      {booking.service_id === 'aircon' ? (
                        <Ionicons name="snow" size={18} color={colors.blue} />
                      ) : (
                        <MaterialCommunityIcons name="broom" size={18} color={colors.primary} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.name}>
                        {svc.name} <Text style={styles.ticket}>{bookingTicketCode(booking.id)}</Text>
                      </Text>
                      <Text style={styles.when}>{formatBookingWhen(booking.date, booking.start_hour, booking.duration_hours)}</Text>
                    </View>
                  </View>
                  <View style={[styles.chip, { backgroundColor: tint.bg }]}>
                    <Text style={[styles.chipText, { color: tint.fg }]}>{status}</Text>
                  </View>
                </View>
                <View style={styles.rowBottom}>
                  <View style={styles.brgyRow}>
                    <Ionicons name="location-outline" size={12} color={colors.muted} />
                    <Text style={styles.brgy}>{barangay}</Text>
                  </View>
                  <Text style={styles.total}>{peso(booking.total)}</Text>
                </View>
                {booking.status === 'cancelled' && booking.cancel_reason === 'expired-unpaid' && (
                  <Text style={styles.expiredNote}>Expired — payment wasn't completed in time.</Text>
                )}
                {booking.status === 'cancelled' && booking.cancel_reason !== 'expired-unpaid' && booking.refund_needed && (
                  <Text style={styles.expiredNote}>{booking.refunded_at ? 'Refunded.' : 'Refund pending.'}</Text>
                )}
              </Pressable>
            );
          })}
          <Text style={styles.footerNote}>That's all your bookings.</Text>
          <SupportBlock />
        </ScrollView>
      )}

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  h1: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 8 },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  row: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    marginBottom: 12,
    ...shadow.card,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowLeft: { flexDirection: 'row', gap: 12, alignItems: 'center', flexShrink: 1 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  ticket: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.mutedSoft },
  when: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 1 },
  chip: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: radius.pill },
  chipText: { fontFamily: fonts.bold, fontSize: 11.5 },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  brgyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  brgy: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, flexShrink: 1 },
  total: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  expiredNote: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.danger, marginTop: 8 },
  footerNote: { textAlign: 'center', fontFamily: fonts.medium, fontSize: 12, color: colors.mutedSoft, paddingVertical: 12 },
});
