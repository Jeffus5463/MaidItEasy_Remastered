// Shared bottom nav shown on home.tsx and bookings.tsx only.
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

export function BottomNav() {
  const pathname = usePathname();
  const onHome = pathname === '/home';
  const onBookings = pathname === '/bookings';

  return (
    <View style={styles.bar}>
      <Pressable style={styles.tab} onPress={() => router.replace('/home')}>
        <Ionicons name="home" size={22} color={onHome ? colors.primary : colors.mutedSoft} />
        <Text style={[styles.label, { color: onHome ? colors.primary : colors.mutedSoft }]}>Home</Text>
      </Pressable>
      <Pressable style={styles.tab} onPress={() => router.replace('/bookings')}>
        <Ionicons name="reader-outline" size={22} color={onBookings ? colors.primary : colors.mutedSoft} />
        <Text style={[styles.label, { color: onBookings ? colors.primary : colors.mutedSoft }]}>Bookings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: { alignItems: 'center', gap: 3, flex: 1 },
  label: { fontFamily: fonts.bold, fontSize: 10.5 },
});
