// No customer self-cancel by design — changes/cancellations go through a
// phone call. Shown on tracking and My Bookings.
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { SUPPORT_PHONE } from '../data';

export function SupportBlock() {
  const digits = SUPPORT_PHONE.replace(/\D/g, '');
  return (
    <Pressable style={styles.card} onPress={() => Linking.openURL(`tel:${digits}`)}>
      <View style={styles.icon}>
        <Ionicons name="call-outline" size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.text}>Need to change or cancel? Call us</Text>
        <Text style={styles.phone}>{SUPPORT_PHONE}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.primaryTintBg,
    borderRadius: radius.md,
    padding: 13,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  phone: { fontFamily: fonts.medium, fontSize: 12, color: colors.primaryDark, marginTop: 1 },
});
