import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow } from '../../src/theme';
import { COMMISSION_RATE, SERVICES, peso } from '../../src/data';
import { ErrorState, LoadingState } from '../../src/components/UI';
import { formatBookingWhen } from '../../src/lib/bookings';
import { useJob, useJobPhotos } from '../../src/lib/partner';
import { useRequirePartner } from '../../src/lib/partnerAuth';
import { usePartnerJob } from '../../src/partnerStore';

export default function JobCompleted() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { partner, ready } = useRequirePartner();
  const { data: booking, isLoading, isError, refetch } = useJob(id ?? null);
  const { data: photos } = useJobPhotos(id ?? null);
  const { reset } = usePartnerJob();
  const firstName = partner?.name.split(' ')[0] ?? '';
  const insets = useSafeAreaInsets();

  const backToDashboard = () => {
    reset();
    router.replace('/dashboard');
  };

  if (!ready || isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <LoadingState message="Loading…" />
      </SafeAreaView>
    );
  }

  if (isError || !booking) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  const svc = SERVICES[booking.service_id];
  const earn = Math.round(booking.total * COMMISSION_RATE);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <View style={styles.checkCircleOuter}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={34} color={colors.white} />
          </View>
        </View>
        <Text style={styles.title}>Job completed!</Text>
        <Text style={styles.sub}>
          Great work, {firstName}. Your photos have been submitted and the customer has been notified.
        </Text>

        <View style={styles.photosRow}>
          <PhotoThumb uri={photos?.before ?? null} label="Before" />
          <PhotoThumb uri={photos?.after ?? null} label="After" />
        </View>

        <View style={styles.summaryCard}>
          <Row k="Service" v={svc.name} />
          <Row k="Customer" v={booking.contact} />
          <Row k="Location" v={booking.barangay} />
          <Row k="Completed" v={formatBookingWhen(booking.date, booking.start_hour, booking.duration_hours)} />
          <View style={styles.divider} />
          <View style={styles.earnRow}>
            <Text style={styles.earnLabel}>
              You earned <Text style={styles.earnLabelSub}>({Math.round(COMMISSION_RATE * 100)}% commission)</Text>
            </Text>
            <Text style={styles.earnValue}>{peso(earn)}</Text>
          </View>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            Payment is settled between the customer and MaidItEasy. Nothing to collect on your end.
          </Text>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.primaryBtn} onPress={backToDashboard}>
          <Text style={styles.primaryBtnText}>Back to dashboard</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function PhotoThumb({ uri, label }: { uri: string | null; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      {uri ? (
        <Image source={{ uri }} style={styles.photo} />
      ) : (
        <View style={styles.photoFallback}>
          <Ionicons name="image-outline" size={24} color={colors.mutedSoft} />
        </View>
      )}
      <Text style={styles.photoLabel}>{label}</Text>
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowK}>{k}</Text>
      <Text style={styles.rowV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, alignItems: 'center' },
  checkCircleOuter: { width: 92, height: 92, borderRadius: 46, backgroundColor: colors.primaryTintBg, alignItems: 'center', justifyContent: 'center' },
  checkCircle: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 25, color: colors.ink, marginTop: 20 },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, textAlign: 'center', marginTop: 8, lineHeight: 21, maxWidth: 270 },
  photosRow: { flexDirection: 'row', gap: 11, marginTop: 22, alignSelf: 'stretch' },
  photo: { height: 96, borderRadius: radius.md, width: '100%' },
  photoFallback: { height: 96, borderRadius: radius.md, backgroundColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  photoLabel: { textAlign: 'center', fontFamily: fonts.bold, fontSize: 11.5, color: colors.muted, marginTop: 5 },
  summaryCard: { alignSelf: 'stretch', marginTop: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowK: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.muted },
  rowV: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.ink },
  divider: { height: 1, borderStyle: 'dashed', borderTopWidth: 1, borderTopColor: colors.border, marginVertical: 6 },
  earnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 3 },
  earnLabel: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.muted },
  earnLabelSub: { fontSize: 11.5 },
  earnValue: { fontFamily: fonts.display, fontSize: 18, color: colors.primary },
  noteCard: { alignSelf: 'stretch', marginTop: 14, backgroundColor: colors.primaryTintBg, borderRadius: radius.md, padding: 12 },
  noteText: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.primaryDark, lineHeight: 17 },
  footer: { paddingHorizontal: 24, paddingTop: 8 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', ...shadow.cta },
  primaryBtnText: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.white },
});
