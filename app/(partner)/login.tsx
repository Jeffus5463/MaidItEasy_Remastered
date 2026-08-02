import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../../src/theme';
import { Body, Display, FieldError, KeyboardScreen, PrimaryButton } from '../../src/components/UI';
import { signInPartner } from '../../src/lib/partnerAuth';

export default function PartnerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setError('');
    setSigningIn(true);
    try {
      const partner = await signInPartner(email, password);
      router.replace(partner.must_change_password ? '/change-password' : '/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardScreen>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹  Back</Text>
        </Pressable>

        <View style={styles.body}>
          <Display>Partner sign in</Display>
          <Body style={styles.sub}>Log in with the email and password your dispatcher gave you.</Body>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedSoft}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.mutedSoft}
          />

          {!!error && <FieldError>{error}</FieldError>}
        </View>

        <View style={styles.footer}>
          <PrimaryButton label="Log in" disabled={!canSubmit || signingIn} loading={signingIn} onPress={submit} />
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
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft, marginTop: 22, marginBottom: 8 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.ink,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 12 },
});
