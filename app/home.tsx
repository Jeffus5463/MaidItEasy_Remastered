import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '../src/components/BottomNav';
import { LoadingState } from '../src/components/UI';
import { colors, fonts, radius, shadow } from '../src/theme';
import { SERVICE_LIST, peso } from '../src/data';
import { signOutCustomer, useProfileName, useSession } from '../src/lib/auth';
import { useBooking } from '../src/store';

export default function Home() {
  const b = useBooking();
  const { set } = b;
  const { session, loading } = useSession();
  const { data: fullName } = useProfileName(session?.user.id);
  const firstName = fullName?.trim().split(/\s+/)[0];
  const initials = fullName
    ? fullName
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '·';

  useEffect(() => {
    if (!loading && !session) router.replace('/');
  }, [loading, session]);

  const signOut = async () => {
    await signOutCustomer();
    b.reset();
    router.replace('/');
  };

  const openService = (id: 'cleaning' | 'aircon') => {
    set({ service: id, units: 1 });
    router.push(`/service/${id}`);
  };

  if (loading || !session) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <LoadingState message="Signing you in…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.hello}>Kumusta, {firstName || 'there'}!</Text>
            <View style={styles.locRow}>
              <Ionicons name="location" size={12} color={colors.inkSoft} />
              <Text style={styles.loc}>Dumaguete City</Text>
            </View>
          </View>
          <View style={styles.topRowRight}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Pressable onPress={signOut} hitSlop={10} style={styles.signOutBtn}>
              <Ionicons name="log-out-outline" size={18} color={colors.inkSoft} />
            </Pressable>
          </View>
        </View>

        <View style={styles.trustBanner}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={styles.trustText}>
            Every partner is verified. Background-checked, NBI clearance on file, ID verified.
          </Text>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Our services</Text>
          <View style={styles.fixedTag}>
            <Text style={styles.fixedTagText}>Fixed prices</Text>
          </View>
        </View>

        {SERVICE_LIST.map((s) => (
          <Pressable key={s.id} style={styles.card} onPress={() => openService(s.id)}>
            <View style={[styles.thumb, { backgroundColor: s.tint }]}>
              {s.id === 'aircon' ? (
                <Ionicons name="snow" size={30} color={s.accent} />
              ) : (
                <MaterialCommunityIcons name="broom" size={32} color={s.accent} />
              )}
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{s.name}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>
                {s.desc}
              </Text>
              <View style={styles.cardMeta}>
                <Text style={styles.duration}>{s.duration}</Text>
                <Text style={[styles.price, { color: s.accent }]}>
                  {s.priceLabel === 'Starting at' ? 'from ' : ''}
                  {peso(s.price)}
                  {s.suffix}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}

        <View style={styles.soon}>
          <Text style={styles.soonText}>
            More services coming soon to Dumaguete — plumbing, electrical & handyman.
          </Text>
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  hello: { fontFamily: fonts.display, fontSize: 26, color: colors.ink, marginTop: 2 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  loc: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontFamily: fonts.bold, fontSize: 15 },
  topRowRight: { alignItems: 'center', gap: 6 },
  signOutBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  trustBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.primaryTintBg,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 20,
    alignItems: 'center',
  },
  trustText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.primaryDark, lineHeight: 18 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 12 },
  section: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  fixedTag: { backgroundColor: colors.goldTint, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  fixedTagText: { fontFamily: fonts.bold, fontSize: 12, color: colors.goldText },
  card: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
    ...shadow.card,
  },
  thumb: { width: 64, height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  cardDesc: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft, marginTop: 3, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  duration: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  price: { fontFamily: fonts.extrabold, fontSize: 16 },
  soon: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 16,
    marginTop: 4,
  },
  soonText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 },
});
