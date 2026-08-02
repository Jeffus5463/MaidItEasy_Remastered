import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../../src/theme';
import { Body, Display, FieldError, KeyboardScreen, LoadingState, PrimaryButton } from '../../src/components/UI';
import { changePartnerPassword, usePartnerSession } from '../../src/lib/partnerAuth';

const MIN_LENGTH = 8;

export default function ChangePassword() {
  const { session, partner, loading } = usePartnerSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <LoadingState message="Loading…" />
      </SafeAreaView>
    );
  }

  if (!session || !partner) {
    router.replace('/login');
    return null;
  }

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= MIN_LENGTH && password === confirm;

  const submit = async () => {
    if (!canSubmit) return;
    setError('');
    setSaving(true);
    try {
      await changePartnerPassword(partner.id, password);
      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update your password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardScreen>
        <View style={styles.body}>
          <Display>Set a new password</Display>
          <Body style={styles.sub}>
            You're using a one-time password. Choose a new one before continuing to your dashboard.
          </Body>

          <Text style={styles.label}>New password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={`At least ${MIN_LENGTH} characters`}
            placeholderTextColor={colors.mutedSoft}
          />
          {tooShort && <FieldError>{`Password must be at least ${MIN_LENGTH} characters.`}</FieldError>}

          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="Re-enter your new password"
            placeholderTextColor={colors.mutedSoft}
          />
          {mismatch && <FieldError>Passwords don't match.</FieldError>}
          {!!error && <FieldError>{error}</FieldError>}
        </View>

        <View style={styles.footer}>
          <PrimaryButton label="Set password & continue" disabled={!canSubmit || saving} loading={saving} onPress={submit} />
        </View>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
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
