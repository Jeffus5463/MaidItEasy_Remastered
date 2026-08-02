import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '../src/components/BottomNav';
import { SupportBlock } from '../src/components/SupportBlock';
import { EmptyState, ErrorState, LoadingState } from '../src/components/UI';
import { BookingStatus, SERVICES, peso } from '../src/data';
import { colors, fonts, radius, shadow } from '../src/theme';
import { formatBookingWhen, statusLabel, useMyBookings } from '../src/lib/bookings';

const STATUS_TINTS: Record<BookingStatus, { bg: string; fg: string }> = {
  Pending: { bg: colors.goldTint, fg: colors.goldText },
  Assigned: { bg: colors.primaryTintBg, fg: colors.primaryDark },
  'En route': { bg: colors.primaryTintBg, fg: colors.primaryDark },
  'In progress': { bg: colors.primaryTintBg, fg: colors.primaryDark },
  Completed: { bg: colors.primaryTintBg, fg: colors.primaryDark },
  Cancelled: { bg: '#fbecea', fg: colors.danger },
};

export default function Bookings() {
  const { data: bookings, isLoading, isError, refetch } = useMyBookings();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Text style={styles.h1}>My bookings</Text>

      {isLoading ? (
        <LoadingState message="Loading your bookings…" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
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
            const svc = SERVICES[booking.service_id];
            // 'assigned' is a push to the partner, not a confirmation — the
            // partner can still decline it back to 'pending'. Don't show
            // "Assigned" until accepted_at is actually set, same reasoning
            // as the tracking screen (app/tracking.tsx).
            const dispatched = booking.status === 'assigned' && !booking.accepted_at;
            const status = statusLabel(dispatched ? 'pending' : booking.status);
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
                      <Text style={styles.name}>{svc.name}</Text>
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
