import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../src/theme';
import { GCASH_NUMBER, formatHourRange, peso } from '../src/data';
import { ErrorState, FieldError, KeyboardScreen, LoadingState, PrimaryButton } from '../src/components/UI';
import { formatGcashRef, isValidGcashRef } from '../src/format';
import { createBooking, gcashRefInUse, uploadPaymentProof } from '../src/lib/bookings';
import { findService, useServices } from '../src/lib/services';
import { useBooking } from '../src/store';

type Method = 'gcash' | 'cash';

export default function Payment() {
  const b = useBooking();
  const { data: serviceRows, isLoading, isError, refetch } = useServices();
  const svc = findService(serviceRows, b.service ?? 'cleaning');
  const [method, setMethod] = useState<Method | ''>(b.payment);
  const [refDigits, setRefDigits] = useState(b.gcashRef.replace(/\D/g, ''));
  const [refTouched, setRefTouched] = useState(false);
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const refValid = isValidGcashRef(refDigits);
  const ready = method === 'cash' || (method === 'gcash' && refValid && !!proofUri);
  const timeLabel = b.startHour !== null ? formatHourRange(b.startHour, b.durationHours) : '';
  const when = [b.date, timeLabel].filter(Boolean).join(' · ');
  const where = [b.barangay, b.landmark].filter(Boolean).join(' — ');

  const pickProof = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (result.canceled || !result.assets[0]) return;
    setProofUri(result.assets[0].uri);
  };

  const confirm = async () => {
    if (!b.service || b.startHour === null) return;
    const gcashRef = formatGcashRef(refDigits);
    setSubmitError('');
    setSubmitting(true);
    try {
      let proofPath: string | null = null;
      if (method === 'gcash') {
        // Friendly pre-check before uploading anything — the real backstop
        // is the enforce_gcash_ref_uniqueness() trigger, which the insert
        // below still hits if this check somehow misses a race.
        const alreadyUsed = await gcashRefInUse(gcashRef);
        if (alreadyUsed) {
          setSubmitError('This reference number has already been used for another booking.');
          setSubmitting(false);
          return;
        }
        setUploadingProof(true);
        try {
          proofPath = await uploadPaymentProof(proofUri!);
        } finally {
          setUploadingProof(false);
        }
      }
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
        proofPath,
      });
      b.set({ payment: method as Method, gcashRef, bookingId: booking.id });
      router.replace('/confirmation');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not confirm your booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState message="Loading…" />
      </SafeAreaView>
    );
  }

  if (isError || !svc) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

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
              <Text style={styles.gcashLabel}>Payment screenshot</Text>
              <Pressable onPress={pickProof} disabled={uploadingProof} style={styles.proofSlot}>
                {uploadingProof ? (
                  <View style={styles.proofEmpty}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.proofEmptyText}>Uploading…</Text>
                  </View>
                ) : proofUri ? (
                  <View>
                    <Image source={{ uri: proofUri }} style={styles.proofImage} />
                    <View style={styles.proofBadge}>
                      <Ionicons name="checkmark" size={12} color={colors.white} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.proofEmpty}>
                    <Ionicons name="camera-outline" size={22} color={colors.mutedSoft} />
                    <Text style={styles.proofEmptyText}>Attach a screenshot of your GCash receipt</Text>
                  </View>
                )}
              </Pressable>
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
              <Text style={styles.methodTitle}>Pay by cash</Text>
              <Text style={styles.methodDesc}>Pay your assigned partner directly, in person</Text>
            </View>
            <View style={[styles.radio, method === 'cash' && styles.radioOn]} />
          </Pressable>

          {method === 'gcash' && (
            <View style={styles.safety}>
              <Ionicons name="lock-closed" size={16} color={colors.inkSoft} />
              <Text style={styles.safetyText}>
                Your GCash payment goes straight to MaidItEasy — you'll never be asked to pay the
                worker directly.
              </Text>
            </View>
          )}

          {method === 'cash' && (
            <View style={styles.safety}>
              <Ionicons name="cash-outline" size={16} color={colors.inkSoft} />
              <Text style={styles.safetyText}>
                Pay your assigned partner directly, in cash, once the job is done.
              </Text>
            </View>
          )}

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
  proofSlot: { marginTop: 2 },
  proofImage: { height: 120, borderRadius: 13, width: '100%' },
  proofBadge: { position: 'absolute', top: 7, right: 7, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  proofEmpty: { height: 90, borderRadius: 13, borderWidth: 2, borderColor: '#d5cdbd', borderStyle: 'dashed', backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 16 },
  proofEmptyText: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.mutedSoft, textAlign: 'center' },
  safety: { flexDirection: 'row', gap: 10, backgroundColor: colors.sand, borderRadius: radius.md, padding: 14, marginTop: 8, alignItems: 'center' },
  safetyText: { flex: 1, fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft, lineHeight: 17 },
  footer: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.cream },
});
