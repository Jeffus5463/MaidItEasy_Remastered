import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow } from '../../src/theme';
import { COMMISSION_RATE, DECLINE_REASONS, peso } from '../../src/data';
import { ErrorState, FieldError, LoadingState } from '../../src/components/UI';
import { bookingScope, customerLabel, formatBookingWhen } from '../../src/lib/bookings';
import { acceptJob, declineJob, useJob } from '../../src/lib/partner';
import { useRequirePartner } from '../../src/lib/partnerAuth';
import { useRealtimeInvalidate } from '../../src/lib/realtime';
import { findService, useServices } from '../../src/lib/services';
import { usePartnerJob } from '../../src/partnerStore';

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { partner, ready } = useRequirePartner();
  // A partner can sit on this Accept/Decline screen while an admin unassigns
  // it or another partner's decline re-holds it elsewhere. Realtime alone
  // can't catch that: Supabase authorizes postgres_changes UPDATE events
  // against the NEW row under the caller's own RLS, so a change that revokes
  // this partner's visibility (unassigned away) is never delivered to them —
  // only a change that grants it would be. The 5s poll is the backstop for
  // that specific direction; realtime still covers everything else (e.g. an
  // in-place edit that keeps this partner assigned) without waiting on it.
  const { data: booking, isLoading, isError, refetch } = useJob(id ?? null, 5000);
  const { data: serviceRows, isLoading: loadingServices, isError: errorServices, refetch: refetchServices } = useServices();
  useRealtimeInvalidate('bookings', id ? `id=eq.${id}` : undefined, ['partner-job', id]);
  const { setDecline } = usePartnerJob();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [declining, setDeclining] = useState(false);
  const [declineError, setDeclineError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');
  const insets = useSafeAreaInsets();

  if (!ready || isLoading || loadingServices) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <LoadingState message="Loading job details…" />
      </SafeAreaView>
    );
  }

  const svc = booking ? findService(serviceRows, booking.service_id) : undefined;

  if (isError || errorServices || !booking || !partner || !svc) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ErrorState onRetry={() => (isError ? refetch() : refetchServices())} />
      </SafeAreaView>
    );
  }
  // Already accepted (or moved further along) — bounce forward to the active
  // job screen instead of re-showing a stale Accept/Decline prompt. Mirrors
  // active.tsx's RedirectToJob, which bounces the other way when a booking
  // isn't accepted yet. Without this, a stale /job screen instance (reached
  // via a double-tap push, the device back button, or a deep link) keeps
  // showing "Accept job" even after accepted_at is already set.
  const alreadyAccepted = booking.status !== 'assigned' || !!booking.accepted_at;
  if (alreadyAccepted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <RedirectToActive id={booking.id} />
        <LoadingState message="Loading job…" />
      </SafeAreaView>
    );
  }

  const earn = Math.round(booking.total * COMMISSION_RATE);
  const digits = booking.contact.replace(/\D/g, '');
  const paymentMethod = booking.payments?.[0]?.method ?? null;

  // Already assigned by the dispatcher, but the partner hasn't responded yet
  // until this writes accepted_at — that's what lets the dashboard/active
  // screen tell an accepted job apart from one still awaiting a response.
  const onAccept = async () => {
    setAcceptError('');
    setAccepting(true);
    try {
      await acceptJob(booking.id);
      router.replace({ pathname: '/active', params: { id: booking.id } });
    } catch (e) {
      setAcceptError(e instanceof Error ? e.message : 'Could not accept this job. Please try again.');
      setAccepting(false);
    }
  };

  const onConfirmDecline = async () => {
    if (!reason) return;
    setDeclineError('');
    setDeclining(true);
    try {
      await declineJob(booking.id, reason, note);
      setDecline(reason, note);
      setDeclineOpen(false);
      router.replace('/declined');
    } catch (e) {
      setDeclineError(e instanceof Error ? e.message : 'Could not decline this job. Please try again.');
    } finally {
      setDeclining(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Job details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusBanner}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>New assignment · awaiting your response</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <View style={styles.serviceIcon}>
              {booking.service_id === 'aircon' ? (
                <Ionicons name="snow" size={24} color={colors.blue} />
              ) : (
                <MaterialCommunityIcons name="broom" size={24} color={colors.primary} />
              )}
            </View>
            <View>
              <Text style={styles.serviceName}>{svc.name}</Text>
              <Text style={styles.serviceScope}>{bookingScope(booking)}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>DATE & TIME</Text>
              <Text style={styles.metaValue}>{formatBookingWhen(booking.date, booking.start_hour, booking.duration_hours)}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>EST. DURATION</Text>
              <Text style={styles.metaValue}>{svc.duration}</Text>
            </View>
          </View>
        </View>

        <View style={styles.earnCard}>
          <View style={styles.earnIcon}>
            <Ionicons name="cash-outline" size={22} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.earnLabel}>You earn from this job</Text>
            <Text style={styles.earnValue}>{peso(earn)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.commissionText}>{Math.round(COMMISSION_RATE * 100)}% commission</Text>
            <Text style={styles.jobFeeText}>Job fee {peso(booking.total)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.mapBox}>
          <Ionicons name="location" size={32} color={colors.primary} />
          <Pressable
            style={styles.directionsChip}
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.barangay + ', Dumaguete City')}`
              )
            }
          >
            <Ionicons name="navigate-outline" size={13} color={colors.primary} />
            <Text style={styles.directionsText}>Directions</Text>
          </Pressable>
        </View>
        <View style={styles.locationCard}>
          <View style={styles.brgyRow}>
            <View style={styles.brgyTag}>
              <Text style={styles.brgyTagText}>BARANGAY</Text>
            </View>
            <Text style={styles.brgyName}>{booking.barangay}</Text>
          </View>
          <View style={styles.landmarkBox}>
            <View style={styles.landmarkLabelRow}>
              <Ionicons name="location-outline" size={12} color={colors.goldText} />
              <Text style={styles.landmarkLabel}>LANDMARK</Text>
            </View>
            <Text style={styles.landmarkText}>{booking.landmark}</Text>
          </View>
        </View>

        <View style={styles.customerCard}>
          <View style={styles.customerAvatar}>
            <Ionicons name="person" size={20} color={colors.goldText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerLabel}>Customer</Text>
            <Text style={styles.customerContact}>{customerLabel(booking)}</Text>
            {!!booking.customer_name && <Text style={styles.customerSub}>{booking.contact}</Text>}
          </View>
          <View style={styles.customerActions}>
            <Pressable style={styles.customerActionBtn} onPress={() => Linking.openURL(`tel:${digits}`)}>
              <Ionicons name="call-outline" size={18} color={colors.primary} />
            </Pressable>
            <Pressable style={styles.customerActionBtn} onPress={() => Linking.openURL(`sms:${digits}`)}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {paymentMethod === 'cash' ? (
          <View style={styles.warningCard}>
            <Ionicons name="cash-outline" size={18} color={colors.primary} />
            <Text style={styles.warningText}>
              <Text style={{ fontFamily: fonts.bold }}>Collect {peso(booking.total)} in cash</Text> from
              the customer once the job is done.
            </Text>
          </View>
        ) : (
          <View style={styles.warningCard}>
            <Ionicons name="card-outline" size={18} color={colors.primary} />
            <Text style={styles.warningText}>
              <Text style={{ fontFamily: fonts.bold }}>No payment on site.</Text> The customer settles with
              MaidItEasy directly. Never accept GCash from the customer.
            </Text>
          </View>
        )}

        {!!acceptError && <FieldError>{acceptError}</FieldError>}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.declineBtn} onPress={() => setDeclineOpen(true)} disabled={accepting}>
          <Text style={styles.declineBtnText}>Decline</Text>
        </Pressable>
        <Pressable
          style={[styles.acceptBtn, accepting && styles.acceptBtnDisabled]}
          onPress={onAccept}
          disabled={accepting}
        >
          <Text style={styles.acceptBtnText}>{accepting ? 'Accepting…' : 'Accept job'}</Text>
        </Pressable>
      </View>

      <Modal visible={declineOpen} transparent animationType="slide" onRequestClose={() => setDeclineOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDeclineOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Decline this job?</Text>
            <Text style={styles.sheetSub}>
              Select a reason. This job goes back to the dispatcher to reassign.
            </Text>
            <View style={styles.reasonList}>
              {DECLINE_REASONS.map((r) => {
                const active = reason === r;
                return (
                  <Pressable
                    key={r}
                    style={[styles.reasonRow, active && styles.reasonRowActive]}
                    onPress={() => setReason(r)}
                  >
                    <Text style={styles.reasonText}>{r}</Text>
                    <View style={[styles.radio, active && styles.radioActive]}>
                      {active && <Ionicons name="checkmark" size={12} color={colors.white} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {!!reason && (
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a short note for the dispatcher (optional)"
                placeholderTextColor={colors.mutedSoft}
                multiline
                style={styles.noteInput}
              />
            )}
            {!!declineError && <FieldError>{declineError}</FieldError>}
            <View style={styles.sheetFooter}>
              <Pressable style={styles.keepBtn} onPress={() => setDeclineOpen(false)}>
                <Text style={styles.keepBtnText}>Keep job</Text>
              </Pressable>
              <Pressable
                style={[styles.declineConfirmBtn, (!reason || declining) && styles.declineConfirmBtnDisabled]}
                disabled={!reason || declining}
                onPress={onConfirmDecline}
              >
                <Text style={styles.declineConfirmBtnText}>{declining ? 'Declining…' : 'Decline & return'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function RedirectToActive({ id }: { id: string }) {
  useEffect(() => {
    router.replace({ pathname: '/active', params: { id } });
  }, [id]);
  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 4 },
  back: { width: 38, height: 38, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  scroll: { paddingHorizontal: 22, paddingBottom: 24, paddingTop: 8 },
  statusBanner: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.goldTint, borderRadius: radius.pill, paddingHorizontal: 15, paddingVertical: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  statusText: { fontFamily: fonts.bold, fontSize: 13, color: colors.goldText },
  card: { marginTop: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, padding: 16 },
  cardTopRow: { flexDirection: 'row', gap: 13, alignItems: 'center' },
  serviceIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.primaryTintBg, alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  serviceScope: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted, marginTop: 1 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  metaBox: { flex: 1, backgroundColor: colors.creamAlt, borderRadius: radius.md, padding: 11 },
  metaLabel: { fontFamily: fonts.extrabold, fontSize: 10.5, color: colors.muted, letterSpacing: 0.4 },
  metaValue: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.ink, marginTop: 2 },
  earnCard: { marginTop: 14, backgroundColor: colors.primaryDark, borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13, ...shadow.cta },
  earnIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  earnLabel: { fontFamily: fonts.semibold, fontSize: 12, color: 'rgba(255,255,255,0.82)' },
  earnValue: { fontFamily: fonts.display, fontSize: 25, color: colors.white, marginTop: 1 },
  commissionText: { fontFamily: fonts.semibold, fontSize: 11.5, color: 'rgba(255,255,255,0.85)' },
  jobFeeText: { fontFamily: fonts.medium, fontSize: 11, color: 'rgba(255,255,255,0.62)', marginTop: 2 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.ink, marginTop: 14, marginBottom: 8 },
  mapBox: { backgroundColor: colors.primaryTintBg, borderWidth: 1, borderColor: '#d7e7e2', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, height: 132, alignItems: 'center', justifyContent: 'center' },
  directionsChip: { position: 'absolute', bottom: 9, right: 9, backgroundColor: colors.white, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5, ...shadow.card },
  directionsText: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary },
  locationCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderTopWidth: 0, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, padding: 16 },
  brgyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brgyTag: { backgroundColor: colors.primaryTintBg, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3 },
  brgyTagText: { fontFamily: fonts.extrabold, fontSize: 11, color: colors.primary },
  brgyName: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  landmarkBox: { marginTop: 12, backgroundColor: colors.goldTint, borderWidth: 1.5, borderColor: '#f0d9b3', borderRadius: radius.md, padding: 11 },
  landmarkLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  landmarkLabel: { fontFamily: fonts.extrabold, fontSize: 11, color: colors.goldText, letterSpacing: 0.3 },
  landmarkText: { fontFamily: fonts.bold, fontSize: 14.5, color: '#5c4a28', marginTop: 4 },
  customerCard: { marginTop: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  customerAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.goldTint, alignItems: 'center', justifyContent: 'center' },
  customerLabel: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted },
  customerContact: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, marginTop: 2 },
  customerSub: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 1 },
  customerActions: { flexDirection: 'row', gap: 9 },
  customerActionBtn: { width: 40, height: 40, borderRadius: 11, backgroundColor: colors.primaryTintBg, alignItems: 'center', justifyContent: 'center' },
  warningCard: { marginTop: 14, backgroundColor: colors.primaryTintBg, borderRadius: radius.md, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' },
  warningText: { flex: 1, fontFamily: fonts.medium, fontSize: 11.5, color: colors.primaryDark, lineHeight: 17 },
  footer: { flexDirection: 'row', gap: 11, paddingHorizontal: 22, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.cream },
  declineBtn: { width: 110, borderWidth: 1.5, borderColor: '#e6c9c2', backgroundColor: colors.white, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  declineBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.danger },
  acceptBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, ...shadow.cta },
  acceptBtnDisabled: { backgroundColor: colors.disabled },
  acceptBtnText: { fontFamily: fonts.extrabold, fontSize: 15.5, color: colors.white },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20,30,28,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.creamAlt, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 22, paddingBottom: 28 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#dcd3c2', alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  sheetSub: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 19 },
  reasonList: { marginTop: 16, gap: 9 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#e7dfd2', backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: 15, paddingVertical: 13 },
  reasonRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryTintBg },
  reasonText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#d5cdbd', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderWidth: 0, backgroundColor: colors.primary },
  noteInput: { marginTop: 11, height: 64, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 13, fontFamily: fonts.medium, fontSize: 13.5, color: colors.ink, backgroundColor: colors.white, textAlignVertical: 'top' },
  sheetFooter: { flexDirection: 'row', gap: 11, marginTop: 16 },
  keepBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  keepBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.inkSoft },
  declineConfirmBtn: { flex: 1, backgroundColor: colors.danger, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  declineConfirmBtnDisabled: { backgroundColor: '#d8b4ab' },
  declineConfirmBtnText: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.white },
});
