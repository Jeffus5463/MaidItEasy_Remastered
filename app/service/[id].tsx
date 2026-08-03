import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../../src/theme';
import { ServiceId, peso } from '../../src/data';
import { ErrorState, LoadingState, PrimaryButton } from '../../src/components/UI';
import { findService, useServices } from '../../src/lib/services';
import { useBooking } from '../../src/store';

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: ServiceId }>();
  const { set } = useBooking();
  const { data: serviceRows, isLoading, isError, refetch } = useServices();
  const svc = findService(serviceRows, id as ServiceId);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState message="Loading service…" />
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
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹  Back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: svc.tint }]}>
          {id === 'aircon' ? (
            <Ionicons name="snow" size={56} color={svc.accent} />
          ) : (
            <MaterialCommunityIcons name="broom" size={58} color={svc.accent} />
          )}
        </View>

        <Text style={styles.name}>{svc.name}</Text>
        <Text style={styles.desc}>{svc.desc}</Text>

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>{svc.priceLabel}</Text>
            <Text style={[styles.price, { color: svc.accent }]}>
              {peso(svc.price)}
              {svc.priceLabel === 'Starting at' ? ' & up' : svc.suffix}
            </Text>
          </View>
          <View style={styles.durationChip}>
            <Text style={styles.durationLabel}>Duration</Text>
            <Text style={styles.durationValue}>{svc.duration}</Text>
          </View>
        </View>

        <Text style={styles.section}>What's included</Text>
        <View style={styles.list}>
          {svc.includes.map((inc) => (
            <View key={inc} style={styles.incRow}>
              <View style={[styles.check, { backgroundColor: svc.tint }]}>
                <Ionicons name="checkmark" size={15} color={svc.accent} />
              </View>
              <Text style={styles.incText}>{inc}</Text>
            </View>
          ))}
        </View>

        <View style={styles.partnerNote}>
          <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
          <Text style={styles.partnerText}>
            You'll be assigned a Verified Partner — background-checked with NBI clearance on file. You
            don't pick; we dispatch our best available pro.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total from</Text>
          <Text style={styles.totalValue}>{peso(svc.price)}</Text>
        </View>
        <PrimaryButton
          label="Book this service"
          color={svc.accent}
          onPress={() => {
            set({ service: svc.id });
            router.push('/booking');
          }}
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
  hero: { height: 160, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginTop: 20 },
  desc: { fontFamily: fonts.regular, fontSize: 15, color: colors.inkSoft, marginTop: 8, lineHeight: 22 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  priceLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  price: { fontFamily: fonts.extrabold, fontSize: 26, marginTop: 2 },
  durationChip: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'flex-end' },
  durationLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  durationValue: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, marginTop: 2 },
  section: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, marginTop: 28 },
  list: { marginTop: 14, gap: 12 },
  incRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  incText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.inkSoft },
  partnerNote: { flexDirection: 'row', gap: 10, backgroundColor: colors.primaryTintBg, borderRadius: radius.md, padding: 14, marginTop: 24, alignItems: 'center' },
  partnerText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.primaryDark, lineHeight: 19 },
  footer: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 12, backgroundColor: colors.cream },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  totalValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
});
