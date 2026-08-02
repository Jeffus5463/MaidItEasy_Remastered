import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../src/theme';
import { Body, Display, FieldError, KeyboardScreen, PrimaryButton } from '../src/components/UI';
import { formatPhoneNoZero, isValidPhoneNoZero } from '../src/format';
import { useBooking } from '../src/store';

export default function Phone() {
  const { set } = useBooking();
  const [digits, setDigits] = useState('');
  const [touched, setTouched] = useState(false);
  const valid = isValidPhoneNoZero(digits);
  const showError = touched && digits.length > 0 && !valid;

  const submit = () => {
    set({ phone: digits });
    router.push('/otp');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardScreen>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹  Back</Text>
        </Pressable>

        <View style={styles.body}>
          <Display>What's your mobile number?</Display>
          <Body style={styles.sub}>
            We'll text you a 6-digit code to verify it's you. This is how you sign in to MaidItEasy.
          </Body>

          <View style={styles.inputRow}>
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>+63</Text>
            </View>
            <TextInput
              style={[styles.input, showError && styles.inputError]}
              value={formatPhoneNoZero(digits)}
              onChangeText={(t) => setDigits(t.replace(/\D/g, '').slice(0, 10))}
              onBlur={() => setTouched(true)}
              keyboardType="phone-pad"
              placeholder="917 555 0123"
              placeholderTextColor={colors.mutedSoft}
              autoFocus
            />
          </View>
          {showError && <FieldError>Enter a valid 10-digit mobile number.</FieldError>}
        </View>

        <View style={styles.footer}>
          <PrimaryButton label="Send code" disabled={!valid} onPress={submit} />
          <Text style={styles.terms}>
            By continuing you agree to MaidItEasy's Terms & Privacy Policy.
          </Text>
        </View>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  back: { paddingHorizontal: 20, paddingVertical: 12 },
  backText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.inkSoft },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  sub: { marginTop: 14, fontSize: 15 },
  inputRow: { flexDirection: 'row', gap: 10, marginTop: 32 },
  prefix: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  prefixText: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.ink,
  },
  inputError: { borderColor: colors.danger },
  footer: { paddingHorizontal: 24, paddingBottom: 12, gap: 14 },
  terms: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 12, color: colors.muted, lineHeight: 18 },
});
