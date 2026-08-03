import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../../src/theme';
import { SERVICES } from '../../src/data';
import { ErrorState, LoadingState } from '../../src/components/UI';
import { formatBookingWhen } from '../../src/lib/bookings';
import { completeJob, enRouteJob, startJob, uploadJobPhoto, useJob } from '../../src/lib/partner';
import { useRequirePartner } from '../../src/lib/partnerAuth';
import { usePartnerJob } from '../../src/partnerStore';

const STEPS = [
  { key: 'assigned', title: 'Accepted' },
  { key: 'en_route', title: 'On the way' },
  { key: 'in_progress', title: 'In progress' },
  { key: 'completed', title: 'Completed' },
] as const;

const RANK: Record<string, number> = { assigned: 0, en_route: 1, in_progress: 2, completed: 3 };

export default function ActiveJob() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ready } = useRequirePartner();
  const { data: booking, isLoading, isError, refetch } = useJob(id ?? null);
  const { beforePhoto, afterPhoto, setBeforePhoto, setAfterPhoto } = usePartnerJob();
  const queryClient = useQueryClient();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const insets = useSafeAreaInsets();

  const pickAndUpload = async (kind: 'before' | 'after') => {
    if (!id) return;
    const setUploading = kind === 'before' ? setUploadingBefore : setUploadingAfter;
    const setter = kind === 'before' ? setBeforePhoto : setAfterPhoto;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (result.canceled || !result.assets[0]) return;

    setError('');
    setUploading(true);
    try {
      const signedUrl = await uploadJobPhoto(id, kind, result.assets[0].uri);
      setter(signedUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not upload the ${kind} photo. Please try again.`);
    } finally {
      setUploading(false);
    }
  };

  if (!ready || isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <LoadingState message="Loading job…" />
      </SafeAreaView>
    );
  }

  if (isError || !booking) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  // Not yet accepted — send the partner to the Accept/Decline screen instead
  // of letting them act on a job they haven't responded to (e.g. via a
  // direct link to this screen).
  const needsAccept = booking.status === 'assigned' && !booking.accepted_at;
  if (needsAccept) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <RedirectToJob id={booking.id} />
        <LoadingState message="Loading job…" />
      </SafeAreaView>
    );
  }

  const svc = SERVICES[booking.service_id];
  const status = booking.status;
  const curRank = RANK[status] ?? -1;

  let bannerText = 'Accepted — head to the location';
  let bannerBg: string = colors.primaryTintBg;
  let bannerColor: string = colors.primaryDark;
  if (status === 'en_route') {
    bannerText = 'On the way';
    bannerBg = colors.blueTint;
    bannerColor = colors.blue;
  } else if (status === 'in_progress') {
    bannerText = 'In progress';
    bannerBg = colors.goldTint;
    bannerColor = colors.goldText;
  } else if (status === 'completed') {
    bannerText = 'Completed';
  }

  const showPhotos = status === 'in_progress';
  const readyToComplete = !!beforePhoto && !!afterPhoto && !uploadingBefore && !uploadingAfter;

  const onPrimaryPress = async () => {
    setError('');
    setWorking(true);
    try {
      if (status === 'assigned') {
        await enRouteJob(booking.id);
        refetch();
      } else if (status === 'en_route') {
        await startJob(booking.id);
        refetch();
      } else if (status === 'in_progress' && readyToComplete) {
        await completeJob(booking.id);
        queryClient.invalidateQueries({ queryKey: ['partner-jobs'] });
        router.replace({ pathname: '/completed', params: { id: booking.id } });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const primaryLabel =
    status === 'assigned'
      ? 'On my way'
      : status === 'en_route'
        ? 'Start job'
        : readyToComplete
          ? 'Complete job'
          : 'Upload both photos to complete';
  const primaryEnabled = (status === 'assigned' || status === 'en_route' || readyToComplete) && !working;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/dashboard')} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <View>
          <Text style={styles.headerService}>{svc.name}</Text>
          <Text style={styles.headerWhen}>{formatBookingWhen(booking.date, booking.start_hour, booking.duration_hours)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.banner, { backgroundColor: bannerBg }]}>
          <View style={[styles.bannerDot, { backgroundColor: bannerColor }]} />
          <Text style={[styles.bannerText, { color: bannerColor }]}>{bannerText}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoTopRow}>
            <View style={styles.brgyTag}>
              <Text style={styles.brgyTagText}>{booking.barangay}</Text>
            </View>
            <Text style={styles.infoCustomer}>{booking.contact}</Text>
          </View>
          <View style={styles.landmarkRow}>
            <Ionicons name="location-outline" size={15} color={colors.goldText} />
            <Text style={styles.landmarkText}>{booking.landmark}</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>JOB PROGRESS</Text>
          {STEPS.map((step, i) => {
            const state = i < curRank ? 'done' : i === curRank ? 'active' : 'todo';
            const isDone = state === 'done';
            const isActive = state === 'active';
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepRail}>
                  <View
                    style={[
                      styles.stepDot,
                      { backgroundColor: isDone || isActive ? colors.primary : colors.white },
                      !(isDone || isActive) && styles.stepDotOutline,
                    ]}
                  >
                    {isDone && <Ionicons name="checkmark" size={12} color={colors.white} />}
                    {isActive && <View style={styles.stepActiveInner} />}
                  </View>
                  {i < STEPS.length - 1 && (
                    <View style={[styles.stepLine, { backgroundColor: isDone ? colors.primary : colors.borderSoft }]} />
                  )}
                </View>
                <View style={styles.stepTextWrap}>
                  <Text style={[styles.stepTitle, { color: isDone || isActive ? colors.ink : colors.mutedSoft }]}>
                    {step.title}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {showPhotos && (
          <View style={styles.photosSection}>
            <Text style={styles.photosTitle}>Before & after photos</Text>
            <Text style={styles.photosSub}>Upload proof of your work. Both are required to complete the job.</Text>
            <View style={styles.photosRow}>
              <PhotoSlot label="Before" uri={beforePhoto} uploading={uploadingBefore} onPress={() => pickAndUpload('before')} />
              <PhotoSlot label="After" uri={afterPhoto} uploading={uploadingAfter} onPress={() => pickAndUpload('after')} />
            </View>
          </View>
        )}

        {!!error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[styles.primaryBtn, !primaryEnabled && styles.primaryBtnDisabled]}
          disabled={!primaryEnabled}
          onPress={onPrimaryPress}
        >
          <Text style={styles.primaryBtnText}>{working ? 'Please wait…' : primaryLabel}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function RedirectToJob({ id }: { id: string }) {
  useEffect(() => {
    router.replace({ pathname: '/job', params: { id } });
  }, [id]);
  return null;
}

function PhotoSlot({
  label,
  uri,
  uploading,
  onPress,
}: {
  label: string;
  uri: string | null;
  uploading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.photoSlot} onPress={uploading ? undefined : onPress}>
      {uploading ? (
        <View style={styles.photoEmpty}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.photoEmptyText}>Uploading…</Text>
        </View>
      ) : uri ? (
        <View>
          <Image source={{ uri }} style={styles.photoImage} />
          <View style={styles.photoBadge}>
            <Ionicons name="checkmark" size={12} color={colors.white} />
          </View>
        </View>
      ) : (
        <View style={styles.photoEmpty}>
          <Ionicons name="camera-outline" size={26} color={colors.mutedSoft} />
          <Text style={styles.photoEmptyText}>Add photo</Text>
        </View>
      )}
      <Text style={styles.photoLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 4 },
  back: { width: 38, height: 38, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  headerService: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  headerWhen: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  scroll: { paddingHorizontal: 22, paddingBottom: 24, paddingTop: 6 },
  banner: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.pill, paddingHorizontal: 15, paddingVertical: 8 },
  bannerDot: { width: 8, height: 8, borderRadius: 4 },
  bannerText: { fontFamily: fonts.bold, fontSize: 13 },
  infoCard: { marginTop: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  infoTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  brgyTag: { backgroundColor: colors.primaryTintBg, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3 },
  brgyTagText: { fontFamily: fonts.extrabold, fontSize: 11, color: colors.primary },
  infoCustomer: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted },
  landmarkRow: { flexDirection: 'row', gap: 7, alignItems: 'flex-start', marginTop: 10 },
  landmarkText: { fontFamily: fonts.semibold, fontSize: 13.5, color: '#5c4a28', flexShrink: 1 },
  progressCard: { marginTop: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, padding: 18, paddingBottom: 4 },
  progressTitle: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.muted, letterSpacing: 0.4, marginBottom: 12 },
  stepRow: { flexDirection: 'row', gap: 13 },
  stepRail: { alignItems: 'center', width: 24 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepDotOutline: { borderWidth: 2, borderColor: colors.borderSoft },
  stepActiveInner: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.white },
  stepLine: { width: 2, height: 22, marginVertical: 2 },
  stepTextWrap: { paddingBottom: 16, flex: 1 },
  stepTitle: { fontFamily: fonts.bold, fontSize: 14 },
  photosSection: { marginTop: 16 },
  photosTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.ink, marginBottom: 4 },
  photosSub: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted, lineHeight: 18, marginBottom: 12 },
  photosRow: { flexDirection: 'row', gap: 12 },
  photoSlot: { flex: 1 },
  photoImage: { height: 112, borderRadius: 13, width: '100%' },
  photoBadge: { position: 'absolute', top: 7, right: 7, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  photoEmpty: { height: 112, borderRadius: 13, borderWidth: 2, borderColor: '#d5cdbd', borderStyle: 'dashed', backgroundColor: colors.creamAlt, alignItems: 'center', justifyContent: 'center', gap: 5 },
  photoEmptyText: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.mutedSoft },
  photoLabel: { textAlign: 'center', fontFamily: fonts.bold, fontSize: 11.5, color: colors.muted, marginTop: 6 },
  errorCard: { marginTop: 14, backgroundColor: colors.primaryTintBg, borderRadius: radius.md, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' },
  errorText: { flex: 1, fontFamily: fonts.medium, fontSize: 12.5, color: colors.danger },
  footer: { paddingHorizontal: 22, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.cream },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center' },
  primaryBtnDisabled: { backgroundColor: colors.disabled },
  primaryBtnText: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.white },
});
