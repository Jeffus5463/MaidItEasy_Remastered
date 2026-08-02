import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../src/theme';
import { Body, Display, PrimaryButton } from '../src/components/UI';
import { Text } from 'react-native';

const POINTS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'shield-checkmark', text: 'Verified, background-checked partners' },
  { icon: 'cash-outline', text: 'Fixed peso prices, shown upfront' },
  { icon: 'flash', text: 'Book in under a minute' },
];

export default function Landing() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Text style={styles.logoMark}>M</Text>
          </View>
          <Text style={styles.brand}>MaidItEasy</Text>
        </View>

        <View style={styles.hero}>
          <Display style={styles.headline}>Trusted home services in Dumaguete.</Display>
          <Body style={styles.sub}>
            Background-checked professionals, transparent pricing, and easy booking — right at your
            doorstep.
          </Body>
        </View>

        <View style={styles.points}>
          {POINTS.map((p) => (
            <View key={p.text} style={styles.point}>
              <View style={styles.pointIcon}>
                <Ionicons name={p.icon} size={17} color={colors.primary} />
              </View>
              <Text style={styles.pointText}>{p.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Get started" onPress={() => router.push('/phone')} />
        <Text style={styles.serving}>Serving Dumaguete City & nearby barangays</Text>
        <Pressable onPress={() => router.push('/login')}>
          <Text style={styles.partnerLink}>Are you a partner? Sign in here</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: { color: colors.white, fontFamily: fonts.display, fontSize: 22 },
  brand: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink },
  hero: { marginTop: 24 },
  headline: { fontSize: 34, lineHeight: 40 },
  sub: { marginTop: 16, fontSize: 16, lineHeight: 24, color: colors.inkSoft },
  points: { marginTop: 40, gap: 18 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pointIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryTintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, flex: 1 },
  footer: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 8, gap: 14 },
  serving: { textAlign: 'center', fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  partnerLink: { textAlign: 'center', fontFamily: fonts.bold, fontSize: 13, color: colors.primary, marginTop: 6 },
});
