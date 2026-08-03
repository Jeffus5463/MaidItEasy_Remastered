import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../src/theme';
import { formatHourRange, peso } from '../src/data';
import { ErrorState, LoadingState, PrimaryButton } from '../src/components/UI';
import { findService, useServices } from '../src/lib/services';
import { useBooking } from '../src/store';

export default function Confirmation() {
  const b = useBooking();
  const { data: serviceRows, isLoading, isError, refetch } = useServices();
  const svc = findService(serviceRows, b.service ?? 'cleaning');
  const timeLabel = b.startHour !== null ? formatHourRange(b.startHour, b.durationHours) : '';
  const when = [b.date, timeLabel].filter(Boolean).join(' · ');

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState message="Loading…" />
      </SafeAreaView>
    );
  }

  if (isError || !svc) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={44} color={colors.white} />
        </View>
        <Text style={styles.h1}>Booking confirmed!</Text>
        <Text style={styles.sub}>
          {b.payment === 'gcash'
            ? "We're verifying your GCash payment and will assign a verified partner shortly."
            : 'Your booking is confirmed. Pay your assigned partner directly, in cash, once the job is done.'}
        </Text>

        <View style={styles.card}>
          <Row k="Service" v={svc.name} />
          <Row k="When" v={when || '—'} />
          <Row k="Where" v={[b.barangay, b.landmark].filter(Boolean).join(' — ') || '—'} />
          <Row k="Total" v={peso(b.total)} bold />
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Track your booking"
          onPress={() => router.replace({ pathname: '/tracking', params: { id: b.bookingId ?? '' } })}
        />
        <Pressable style={styles.ghost} onPress={() => router.replace('/home')}>
          <Text style={styles.ghostText}>Back to home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowK}>{k}</Text>
      <Text style={[styles.rowV, bold && { fontFamily: fonts.extrabold, fontSize: 16 }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  body: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  checkCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: fonts.display, fontSize: 26, color: colors.ink, marginTop: 24 },
  sub: { fontFamily: fonts.regular, fontSize: 15, color: colors.inkSoft, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  card: { alignSelf: 'stretch', backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 18, marginTop: 30, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  rowK: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  rowV: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, flexShrink: 1, textAlign: 'right', paddingLeft: 12 },
  footer: { paddingHorizontal: 24, paddingBottom: 12, gap: 10 },
  ghost: { width: '100%', paddingVertical: 16, borderRadius: radius.lg, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  ghostText: { fontFamily: fonts.bold, fontSize: 16, color: colors.inkSoft },
});
