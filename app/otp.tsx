import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../src/theme';
import { Body, Display, FieldError, KeyboardScreen, PrimaryButton } from '../src/components/UI';
import { formatPhoneNoZero } from '../src/format';
import { signInWithPhone } from '../src/lib/auth';
import { useBooking } from '../src/store';

const LEN = 6;

function fmtPhone(d: string) {
  return d ? formatPhoneNoZero(d) : 'your number';
}

export default function Otp() {
  const { phone } = useBooking();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<TextInput>(null);
  const filled = code.length >= LEN;

  const verify = async () => {
    setError('');
    setVerifying(true);
    try {
      const { hasName } = await signInWithPhone(phone);
      router.replace(hasName ? '/home' : '/name');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not verify. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardScreen>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹  Back</Text>
        </Pressable>

        <View style={styles.body}>
          <Display>Enter the code</Display>
          <Body style={styles.sub}>
            We sent a 6-digit code by SMS to +63 {fmtPhone(phone)}.
          </Body>

          <Pressable style={styles.boxes} onPress={() => ref.current?.focus()}>
            {Array.from({ length: LEN }).map((_, i) => {
              const active = i === code.length;
              const on = i < code.length || active;
              return (
                <View key={i} style={[styles.box, { borderColor: on ? colors.primary : colors.border }]}>
                  <Text style={styles.boxText}>{code[i] ?? ''}</Text>
                </View>
              );
            })}
          </Pressable>

          <TextInput
            ref={ref}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, LEN))}
            keyboardType="number-pad"
            maxLength={LEN}
            autoFocus
            style={styles.hidden}
          />

          <View style={styles.resendRow}>
            <Text style={styles.resendMuted}>Didn't get the code? </Text>
            <Pressable onPress={() => setCode('')}>
              <Text style={styles.resend}>Resend</Text>
            </Pressable>
          </View>
          {!!error && <FieldError>{error}</FieldError>}
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label="Verify & continue"
            disabled={!filled || verifying}
            loading={verifying}
            onPress={verify}
          />
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
  boxes: { flexDirection: 'row', gap: 10, marginTop: 32, justifyContent: 'space-between' },
  box: {
    width: 46,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxText: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  resendRow: { flexDirection: 'row', marginTop: 24, alignItems: 'center' },
  resendMuted: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  resend: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  footer: { paddingHorizontal: 24, paddingBottom: 12 },
});
