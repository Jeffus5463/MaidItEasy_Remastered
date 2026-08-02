import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../src/theme';
import { BARANGAYS, peso } from '../src/data';
import { LocationMap } from '../src/components/LocationMap';
import { FieldError, KeyboardScreen, PrimaryButton } from '../src/components/UI';
import { formatPhoneWithZero, isValidPhoneWithZero } from '../src/format';
import { useBooking } from '../src/store';

export default function Location() {
  const b = useBooking();
  const [barangay, setBarangay] = useState(b.barangay);
  const [landmark, setLandmark] = useState(b.landmark);
  const [landmarkTouched, setLandmarkTouched] = useState(false);
  const [contactDigits, setContactDigits] = useState(b.contact.replace(/\D/g, ''));
  const [contactTouched, setContactTouched] = useState(false);
  const [coords, setCoords] = useState({ latitude: b.latitude, longitude: b.longitude });

  const landmarkValid = landmark.trim().length > 2;
  const contactValid = isValidPhoneWithZero(contactDigits);
  const ready = !!barangay && landmarkValid && contactValid;

  const cont = () => {
    b.set({
      barangay,
      landmark,
      contact: formatPhoneWithZero(contactDigits),
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    router.push('/payment');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardScreen>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹  Back</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.h1}>Where should we go?</Text>

          <LocationMap latitude={coords.latitude} longitude={coords.longitude} onChange={setCoords} />

          <Text style={styles.label}>Barangay</Text>
          <View style={styles.brgyWrap}>
            {BARANGAYS.map((br) => {
              const active = br === barangay;
              return (
                <Pressable
                  key={br}
                  onPress={() => setBarangay(br)}
                  style={[styles.brgy, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.white }]}
                >
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: active ? colors.white : colors.inkSoft }}>{br}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Landmark — how we'll find you</Text>
          <TextInput
            style={[styles.input, landmarkTouched && !landmarkValid && styles.inputError]}
            value={landmark}
            onChangeText={setLandmark}
            onBlur={() => setLandmarkTouched(true)}
            placeholder="The clearest way to reach you in Dumaguete"
            placeholderTextColor={colors.mutedSoft}
          />
          {landmarkTouched && !landmarkValid && <FieldError>Add a short landmark so we can find you.</FieldError>}

          <Text style={styles.label}>Contact number</Text>
          <TextInput
            style={[styles.input, contactTouched && contactDigits.length > 0 && !contactValid && styles.inputError]}
            value={formatPhoneWithZero(contactDigits)}
            onChangeText={(t) => setContactDigits(t.replace(/\D/g, '').slice(0, 11))}
            onBlur={() => setContactTouched(true)}
            keyboardType="phone-pad"
            placeholder="0917 555 0123"
            placeholderTextColor={colors.mutedSoft}
          />
          {contactTouched && contactDigits.length > 0 && !contactValid && (
            <FieldError>Enter a valid 11-digit number starting with 09.</FieldError>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{peso(b.total)}</Text>
          </View>
          <PrimaryButton label="Continue to payment" disabled={!ready} onPress={cont} />
        </View>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  back: { paddingHorizontal: 20, paddingVertical: 12 },
  backText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.inkSoft },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },
  h1: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  label: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, marginTop: 24, marginBottom: 10 },
  brgyWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  brgy: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.xl, borderWidth: 1.5 },
  input: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 14, fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  inputError: { borderColor: colors.danger },
  footer: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 12, backgroundColor: colors.cream },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  totalValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
});
