import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../src/theme';
import { GCASH_NUMBER, SERVICES, formatHourRange, peso } from '../src/data';
import { FieldError, KeyboardScreen, PrimaryButton } from '../src/components/UI';
import { formatGcashRef, isValidGcashRef } from '../src/format';
import { createBooking } from '../src/lib/bookings';
import { useBooking } from '../src/store';

type Method = 'gcash' | 'cash';

export default function Payment() {
  const b = useBooking();
  const svc = b.service ? SERVICES[b.service] : SERVICES.cleaning;
  const [method, setMethod] = useState<Method | ''>(b.payment);
  const [refDigits, setRefDigits] = useState(b.gcashRef.replace(/\D/g, ''));
  const [refTouched, setRefTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const refValid = isValidGcashRef(refDigits);
  const ready = method === 'cash' || (method === 'gcash' && refValid);
  const timeLabel = b.startHour !== null ? formatHourRange(b.startHour, b.durationHours) : '';
  const when = [b.date, timeLabel].filter(Boolean).join(' · ');
  const where = [b.barangay, b.landmark].filter(Boolean).join(' — ');

  const confirm = async () => {
    if (!b.service || b.startHour === null) return;
    const gcashRef = formatGcashRef(refDigits);
    setSubmitError('');
    setSubmitting(true);
    try {
      const booking = await createBooking({
        serviceId: b.service,
        units: b.units,
        startHour: b.startHour,
        durationHours: b.durationHours,
        date: b.dateIso,
        barangay: b.barangay,
        landmark: b.landmark,
        contact: b.contact,
        latitude: b.latitude,
        longitude: b.longitude,
        total: b.total,
        payment: method as Method,
        gcashRef,
      });
      b.set({ payment: method as Method, gcashRef, bookingId: booking.id });
      router.replace('/confirmation');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not confirm your booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardScreen>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹  Back</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.h1}>Payment</Text>

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Order summary</Text>
            <Row k={svc.name} v={peso(b.total)} />
            {!!when && <Row k={when} muted />}
            {!!where && <Row k={where} muted />}
            <View style={styles.divider} />
            <Row k="Total" v={peso(b.total)} bold />
          </View>

          <Text style={styles.label}>How would you like to pay?</Text>

          <Pressable
            onPress={() => setMethod('gcash')}
            style={[styles.method, method === 'gcash' && styles.methodActive]}
          >
            <View style={[styles.methodIcon, { backgroundColor: colors.blueTint }]}>
              <Text style={[styles.methodIconText, { color: colors.blue }]}>G</Text>
            </View>
            <View style={styles.methodBody}>
              <Text style={styles.methodTitle}>GCash</Text>
              <Text style={styles.methodDesc}>Send & enter your reference number</Text>
            </View>
            <View style={[styles.radio, method === 'gcash' && styles.radioOn]} />
          </Pressable>

          {method === 'gcash' && (
            <View style={styles.gcashBox}>
              <Text style={styles.gcashLabel}>Send to (MaidItEasy GCash)</Text>
              <Text style={styles.gcashNumber}>{GCASH_NUMBER}</Text>
              <TextInput
                style={[styles.input, refTouched && refDigits.length > 0 && !refValid && styles.inputError]}
                value={formatGcashRef(refDigits)}
                onChangeText={(t) => setRefDigits(t.replace(/\D/g, '').slice(0, 13))}
                onBlur={() => setRefTouched(true)}
                placeholder="e.g. 8021 4455 9930"
                placeholderTextColor={colors.mutedSoft}
                keyboardType="number-pad"
              />
              {refTouched && refDigits.length > 0 && !refValid && (
                <FieldError>Enter the 10–13 digit reference number from your GCash receipt.</FieldError>
              )}
              <Text style={styles.gcashNote}>
                Our admin will verify your payment before assigning a partner. Usually within a few
                minutes.
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => setMethod('cash')}
            style={[styles.method, method === 'cash' && styles.methodActive]}
          >
            <View style={[styles.methodIcon, { backgroundColor: colors.goldTint }]}>
              <Ionicons name="wallet-outline" size={20} color={colors.goldText} />
            </View>
            <View style={styles.methodBody}>
              <Text style={styles.methodTitle}>Pay cash at office</Text>
              <Text style={styles.methodDesc}>Settle at the MaidItEasy office</Text>
            </View>
            <View style={[styles.radio, method === 'cash' && styles.radioOn]} />
          </Pressable>

          <View style={styles.safety}>
            <Ionicons name="lock-closed" size={16} color={colors.inkSoft} />
            <Text style={styles.safetyText}>
              Your partner never handles money. All payments go through MaidItEasy — never pay the
              worker directly.
            </Text>
          </View>

          {!!submitError && <FieldError>{submitError}</FieldError>}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label="Confirm booking"
            disabled={!ready || submitting}
            loading={submitting}
            onPress={confirm}
          />
        </View>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

function Row({ k, v, muted, bold }: { k: string; v?: string; muted?: boolean; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowK, muted && { color: colors.muted, fontFamily: fonts.medium }, bold && { fontFamily: fonts.bold, color: colors.ink }]}>{k}</Text>
      {!!v && <Text style={[styles.rowV, bold && { fontFamily: fonts.extrabold }]}>{v}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  back: { paddingHorizontal: 20, paddingVertical: 12 },
  backText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.inkSoft },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },
  h1: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  summary: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, marginTop: 16 },
  summaryTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowK: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft, flex: 1, paddingRight: 12 },
  rowV: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  label: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink, marginTop: 26, marginBottom: 12 },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, padding: 14, marginBottom: 12 },
  methodActive: { borderColor: colors.primary },
  methodIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  methodIconText: { fontFamily: fonts.extrabold, fontSize: 18 },
  methodBody: { flex: 1 },
  methodTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  methodDesc: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  gcashBox: { backgroundColor: colors.blueTint, borderRadius: radius.md, padding: 16, marginBottom: 12, marginTop: -4, gap: 8 },
  gcashLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.blue },
  gcashNumber: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  input: { backgroundColor: colors.white, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, marginTop: 4 },
  inputError: { borderColor: colors.danger },
  gcashNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft, lineHeight: 17 },
  safety: { flexDirection: 'row', gap: 10, backgroundColor: colors.sand, borderRadius: radius.md, padding: 14, marginTop: 8, alignItems: 'center' },
  safetyText: { flex: 1, fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft, lineHeight: 17 },
  footer: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.cream },
});
