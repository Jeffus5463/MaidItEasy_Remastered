import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow } from '../../src/theme';
import { LoadingState } from '../../src/components/UI';
import { useRequirePartner } from '../../src/lib/partnerAuth';
import { usePartnerJob } from '../../src/partnerStore';

export default function JobDeclined() {
  const { ready } = useRequirePartner();
  const { declineReason, reset } = usePartnerJob();
  const insets = useSafeAreaInsets();

  const backToDashboard = () => {
    reset();
    router.replace('/dashboard');
  };

  if (!ready) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <LoadingState message="Loading…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Ionicons name="arrow-undo" size={32} color="#8a7c63" />
        </View>
        <Text style={styles.title}>Job returned</Text>
        <Text style={styles.sub}>
          This job has been sent back to the dispatcher to reassign. Reason:{' '}
          <Text style={styles.reason}>{declineReason}</Text>.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.primaryBtn} onPress={backToDashboard}>
          <Text style={styles.primaryBtnText}>Back to dashboard</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 40, alignItems: 'center' },
  iconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#f3ece2', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 23, color: colors.ink, marginTop: 20 },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, textAlign: 'center', marginTop: 8, lineHeight: 21, maxWidth: 280 },
  reason: { fontFamily: fonts.bold, color: '#5c5240' },
  footer: { paddingHorizontal: 24, paddingTop: 8 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', ...shadow.cta },
  primaryBtnText: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.white },
});
