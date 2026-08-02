import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../src/theme';
import { Body, Display, FieldError, KeyboardScreen, PrimaryButton } from '../src/components/UI';
import { setProfileName } from '../src/lib/auth';

export default function Name() {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const valid = name.trim().length > 1;

  const submit = async () => {
    if (!valid) return;
    setError('');
    setSaving(true);
    try {
      await setProfileName(name);
      router.replace('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardScreen>
        <View style={styles.body}>
          <Display>What's your name?</Display>
          <Body style={styles.sub}>
            So your partner and MaidItEasy staff know who they're helping.
          </Body>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={colors.mutedSoft}
            autoCapitalize="words"
            autoFocus
          />
          {!!error && <FieldError>{error}</FieldError>}
        </View>

        <View style={styles.footer}>
          <PrimaryButton label="Continue" disabled={!valid || saving} loading={saving} onPress={submit} />
        </View>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  sub: { marginTop: 14, fontSize: 15 },
  input: {
    marginTop: 32,
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
  footer: { paddingHorizontal: 24, paddingBottom: 12 },
});
