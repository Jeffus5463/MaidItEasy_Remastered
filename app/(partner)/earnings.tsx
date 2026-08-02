import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow } from '../../src/theme';
import { peso } from '../../src/data';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/UI';
import { bookingScope, formatBookingWhen } from '../../src/lib/bookings';
import { EarningRow, useMyEarnings } from '../../src/lib/partner';
import { useRequirePartner } from '../../src/lib/partnerAuth';

export default function PartnerEarnings() {
  const { partner, ready } = useRequirePartner();
  const { data: earnings, isLoading, isError, refetch } = useMyEarnings(partner?.id ?? null);

  const loading = !ready || isLoading;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <LoadingState message="Loading your earnings…" />
      </SafeAreaView>
    );
  }

  if (isError || !partner) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  const rows = earnings ?? [];
  const lifetimeTotal = rows.reduce((sum, r) => sum + r.commission_amount, 0);
  const unpaidTotal = rows.filter((r) => !r.paid_at).reduce((sum, r) => sum + r.commission_amount, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Lifetime total</Text>
            <Text style={styles.summaryValue}>{peso(lifetimeTotal)}</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardUnpaid]}>
            <Text style={styles.summaryLabelUnpaid}>Unpaid</Text>
            <Text style={styles.summaryValueUnpaid}>{peso(unpaidTotal)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Per job</Text>

        {rows.length === 0 ? (
          <EmptyState
            icon="cash-outline"
            title="No earnings yet"
            message="Completed jobs and their commission will show up here."
          />
        ) : (
          rows.map((row) => <EarningCard key={row.id} row={row} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function EarningCard({ row }: { row: EarningRow }) {
  const svcId = row.bookings?.service_id ?? 'cleaning';
  const scope = row.bookings
    ? bookingScope({
        service_id: row.bookings.service_id,
        units: row.bookings.units,
        tier: row.bookings.tier,
        duration_hours: row.bookings.duration_hours,
      })
    : 'Job';
  const when = row.bookings ? formatBookingWhen(row.bookings.date, row.bookings.start_hour, row.bookings.duration_hours) : '';
  const paid = !!row.paid_at;

  return (
    <View style={styles.jobRow}>
      <View style={[styles.jobIcon, { backgroundColor: svcId === 'aircon' ? colors.blueTint : colors.primaryTintBg }]}>
        {svcId === 'aircon' ? (
          <Ionicons name="snow" size={18} color={colors.blue} />
        ) : (
          <MaterialCommunityIcons name="broom" size={18} color={colors.primary} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.jobScope}>{scope}</Text>
        <Text style={styles.jobWhen}>{when}</Text>
        <Text style={styles.jobFee}>Job fee {peso(row.job_fee)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.jobEarn}>{peso(row.commission_amount)}</Text>
        <View style={[styles.statusChip, { backgroundColor: paid ? colors.primaryTintBg : colors.goldTint }]}>
          <Text style={[styles.statusChipText, { color: paid ? colors.primaryDark : colors.goldText }]}>
            {paid ? 'Paid' : 'Unpaid'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 4 },
  back: { width: 38, height: 38, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  scroll: { paddingHorizontal: 22, paddingBottom: 32, paddingTop: 12 },
  summaryRow: { flexDirection: 'row', gap: 11 },
  summaryCard: { flex: 1, backgroundColor: colors.primaryDark, borderRadius: radius.lg, padding: 16, ...shadow.cta },
  summaryCardUnpaid: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  summaryLabel: { fontFamily: fonts.semibold, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  summaryValue: { fontFamily: fonts.display, fontSize: 22, color: colors.white, marginTop: 4 },
  summaryLabelUnpaid: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  summaryValueUnpaid: { fontFamily: fonts.display, fontSize: 22, color: colors.goldText, marginTop: 4 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink, marginTop: 24, marginBottom: 4 },
  jobRow: {
    marginTop: 11,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  jobIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  jobScope: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  jobWhen: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.muted, marginTop: 1 },
  jobFee: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.mutedSoft, marginTop: 1 },
  jobEarn: { fontFamily: fonts.display, fontSize: 16, color: colors.primary },
  statusChip: { marginTop: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  statusChipText: { fontFamily: fonts.bold, fontSize: 10.5 },
});
