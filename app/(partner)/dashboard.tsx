import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../../src/theme';
import { SERVICES, toLocalIso } from '../../src/data';
import { ErrorState, LoadingState } from '../../src/components/UI';
import { BookingRow, formatBookingWhen } from '../../src/lib/bookings';
import { useMyJobs } from '../../src/lib/partner';
import { signOutPartner, useRequirePartner } from '../../src/lib/partnerAuth';

export default function PartnerDashboard() {
  const { partner, ready } = useRequirePartner();
  const { data: mine, isLoading: loadingMine, isError: errorMine, refetch: refetchMine } = useMyJobs(partner?.id ?? null);

  const loading = !ready || loadingMine;

  const logOut = async () => {
    await signOutPartner();
    router.replace('/login');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <LoadingState message="Loading your dashboard…" />
      </SafeAreaView>
    );
  }

  if (errorMine || !partner) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ErrorState onRetry={() => refetchMine()} />
      </SafeAreaView>
    );
  }

  // Three buckets, each sorted by the job's own scheduled date/time (not
  // created_at, which is useMyJobs' own order and reflects booking-creation
  // order, not schedule order). 'pending' is excluded from every bucket: a
  // Phase 4 soft-hold can set partner_id while status stays 'pending', and
  // per CLAUDE.md a partner isn't meant to see a booking until it actually
  // leaves 'pending' — filtering only by partner_id here isn't enough.
  // 'cancelled' is excluded too.
  const visibleJobs = (mine ?? []).filter((j) => j.status !== 'pending' && j.status !== 'cancelled');
  const byWhenAsc = (a: BookingRow, b: BookingRow) => (a.date === b.date ? a.start_hour - b.start_hour : a.date < b.date ? -1 : 1);

  // Awaiting: dispatched but not yet accepted/declined. All of them, not
  // just the newest — Phase 2.8 fix (was `mine?.find(...)`, hiding every
  // assignment but the single latest).
  const awaitingJobs = visibleJobs.filter((j) => j.status === 'assigned' && !j.accepted_at).sort(byWhenAsc);
  // Upcoming: accepted and not yet completed (assigned-and-accepted,
  // en_route, or in_progress).
  const upcomingJobs = visibleJobs.filter((j) => !!j.accepted_at && j.status !== 'completed').sort(byWhenAsc);
  // Completed: most-recent-first. There's no completed_at column, so the
  // job's own scheduled date/time is the best available proxy.
  const completedJobs = visibleJobs.filter((j) => j.status === 'completed').sort((a, b) => byWhenAsc(b, a));

  const pendingCount = awaitingJobs.length;
  const hasNewJob = pendingCount > 0;
  const todayStr = toLocalIso(new Date());
  const todayCount = visibleJobs.filter((j) => j.date === todayStr).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerLabel}>Partner dashboard</Text>
              <Text style={styles.headerName}>Kumusta, {partner.name.split(' ')[0]}!</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{partner.initials}</Text>
            </View>
          </View>

          <View style={styles.verifiedRow}>
            <View style={styles.verifiedIcon}>
              <Ionicons name="shield-checkmark" size={19} color={colors.mint} />
            </View>
            <View style={styles.verifiedBody}>
              <Text style={styles.verifiedTitle}>Verified Partner</Text>
              <Text style={styles.verifiedSub}>NBI clearance on file · ID verified</Text>
            </View>
            <View style={styles.ratingBlock}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color={colors.gold} />
                <Text style={styles.ratingText}>{partner.rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.ratingSub}>{partner.jobs_count > 0 ? `${partner.jobs_count}+ jobs` : 'New'}</Text>
            </View>
          </View>
          <Pressable onPress={logOut} style={styles.logOutRow}>
            <Ionicons name="log-out-outline" size={13} color="rgba(255,255,255,0.72)" />
            <Text style={styles.logOutText}>Log out</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.countersRow}>
            <View style={styles.counterCard}>
              <Text style={styles.counterValue}>{todayCount}</Text>
              <Text style={styles.counterLabel}>Jobs today</Text>
            </View>
            <View style={styles.counterCard}>
              <Text style={[styles.counterValue, { color: colors.gold }]}>{pendingCount}</Text>
              <Text style={styles.counterLabel}>Awaiting response</Text>
            </View>
          </View>

          <Pressable style={styles.earningsLink} onPress={() => router.push('/earnings')}>
            <View style={styles.earningsLinkIcon}>
              <Ionicons name="cash-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.earningsLinkText}>View earnings</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>

          {hasNewJob && (
            <>
              <View style={styles.pushCard}>
                <View style={styles.pushIcon}>
                  <Ionicons name="notifications" size={18} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pushLabel}>PUSH NOTIFICATION</Text>
                  <Text style={styles.pushText}>
                    {pendingCount} new assignment{pendingCount === 1 ? '' : 's'} — respond below
                  </Text>
                </View>
              </View>

              <View style={styles.newAssignmentRow}>
                <View style={styles.pulseDot} />
                <Text style={styles.newAssignmentTitle}>Awaiting your response ({pendingCount})</Text>
              </View>

              {awaitingJobs.map((job) => (
                <Pressable
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() => router.push({ pathname: '/job', params: { id: job.id } })}
                >
                  <View style={styles.jobCardHeader}>
                    <Ionicons name="briefcase-outline" size={15} color={colors.goldText} />
                    <Text style={styles.jobCardHeaderText}>NEW ASSIGNMENT</Text>
                  </View>
                  <View style={styles.jobCardBody}>
                    <View style={styles.jobCardTop}>
                      <View style={styles.jobIcon}>
                        {job.service_id === 'aircon' ? (
                          <Ionicons name="snow" size={22} color={colors.blue} />
                        ) : (
                          <MaterialCommunityIcons name="broom" size={22} color={colors.primary} />
                        )}
                      </View>
                      <View>
                        <Text style={styles.jobService}>{SERVICES[job.service_id].name}</Text>
                        <Text style={styles.jobWhen}>{formatBookingWhen(job.date, job.start_hour, job.duration_hours)}</Text>
                      </View>
                    </View>
                    <View style={styles.jobLocRow}>
                      <Ionicons name="location-outline" size={14} color={colors.primary} />
                      <Text style={styles.jobLocText}>
                        <Text style={styles.jobLocBold}>{job.barangay}</Text> · {job.landmark}
                      </Text>
                    </View>
                    <View style={styles.viewJobBtn}>
                      <Text style={styles.viewJobBtnText}>View job details</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </>
          )}

          {upcomingJobs.length > 0 && (
            <>
              <Text style={styles.scheduleTitle}>Upcoming</Text>
              {upcomingJobs.map((job) => {
                const svc = SERVICES[job.service_id];
                const inProgress = job.status === 'en_route' || job.status === 'in_progress';
                return (
                  <Pressable
                    key={job.id}
                    style={styles.scheduleRow}
                    onPress={() => router.push({ pathname: '/active', params: { id: job.id } })}
                  >
                    <View style={[styles.scheduleIcon, { backgroundColor: job.service_id === 'aircon' ? colors.blueTint : colors.primaryTintBg }]}>
                      {job.service_id === 'aircon' ? (
                        <Ionicons name="snow" size={18} color={colors.blue} />
                      ) : (
                        <MaterialCommunityIcons name="broom" size={18} color={colors.primary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scheduleService}>{svc.name}</Text>
                      <Text style={styles.scheduleWhen}>
                        {formatBookingWhen(job.date, job.start_hour, job.duration_hours)} · {job.barangay}
                      </Text>
                    </View>
                    <View style={[styles.scheduleChip, inProgress && styles.scheduleChipActive]}>
                      <Text style={[styles.scheduleChipText, inProgress && styles.scheduleChipActiveText]}>
                        {inProgress ? 'In progress' : 'Upcoming'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </>
          )}

          {completedJobs.length > 0 && (
            <>
              <Text style={styles.scheduleTitle}>Completed</Text>
              {completedJobs.map((job) => {
                const svc = SERVICES[job.service_id];
                return (
                  <Pressable
                    key={job.id}
                    style={[styles.scheduleRow, styles.scheduleRowDone]}
                    onPress={() => router.push({ pathname: '/completed', params: { id: job.id } })}
                  >
                    <View style={[styles.scheduleIcon, { backgroundColor: job.service_id === 'aircon' ? colors.blueTint : colors.primaryTintBg }]}>
                      {job.service_id === 'aircon' ? (
                        <Ionicons name="snow" size={18} color={colors.blue} />
                      ) : (
                        <MaterialCommunityIcons name="broom" size={18} color={colors.primary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scheduleService}>{svc.name}</Text>
                      <Text style={styles.scheduleWhen}>
                        {formatBookingWhen(job.date, job.start_hour, job.duration_hours)} · {job.barangay}
                      </Text>
                    </View>
                    <View style={styles.scheduleChip}>
                      <Text style={styles.scheduleChipText}>Completed</Text>
                    </View>
                  </Pressable>
                );
              })}
            </>
          )}

          <View style={styles.footerNote}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.footerNoteText}>
              Jobs are assigned by the dispatcher. You never collect payment — MaidItEasy handles all
              billing.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: 32 },
  header: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 22,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLabel: { fontFamily: fonts.semibold, fontSize: 13, color: 'rgba(255,255,255,0.72)' },
  headerName: { fontFamily: fonts.display, fontSize: 22, color: colors.white, marginTop: 2 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.display, fontSize: 15, color: colors.white },
  verifiedRow: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  verifiedIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(143,227,214,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBody: { flex: 1 },
  verifiedTitle: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.white },
  verifiedSub: { fontFamily: fonts.medium, fontSize: 11, color: 'rgba(255,255,255,0.72)' },
  ratingBlock: { alignItems: 'flex-end' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontFamily: fonts.display, fontSize: 16, color: colors.white },
  ratingSub: { fontFamily: fonts.medium, fontSize: 10.5, color: 'rgba(255,255,255,0.7)' },
  logOutRow: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end', marginTop: 12 },
  logOutText: { fontFamily: fonts.semibold, fontSize: 11.5, color: 'rgba(255,255,255,0.72)' },
  body: { paddingHorizontal: 22, paddingTop: 20 },
  countersRow: { flexDirection: 'row', gap: 11 },
  counterCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 13,
  },
  counterValue: { fontFamily: fonts.display, fontSize: 22, color: colors.primary },
  counterLabel: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.muted, marginTop: 1 },
  earningsLink: {
    marginTop: 11,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  earningsLinkIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primaryTintBg, alignItems: 'center', justifyContent: 'center' },
  earningsLinkText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  pushCard: {
    marginTop: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    padding: 12,
    flexDirection: 'row',
    gap: 11,
    alignItems: 'center',
  },
  pushIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pushLabel: { fontFamily: fonts.extrabold, fontSize: 10.5, color: colors.muted, letterSpacing: 0.4 },
  pushText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, marginTop: 1 },
  newAssignmentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  newAssignmentTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  jobCard: {
    marginTop: 12,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#f0d9b3',
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  jobCardHeader: { backgroundColor: colors.goldTint, paddingHorizontal: 16, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 7 },
  jobCardHeaderText: { fontFamily: fonts.extrabold, fontSize: 12, color: colors.goldText, letterSpacing: 0.3 },
  jobCardBody: { padding: 16 },
  jobCardTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  jobIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: colors.primaryTintBg, alignItems: 'center', justifyContent: 'center' },
  jobService: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.ink },
  jobWhen: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 1 },
  jobLocRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  jobLocText: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft, flexShrink: 1 },
  jobLocBold: { fontFamily: fonts.bold, color: colors.inkSoft },
  viewJobBtn: { marginTop: 14, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  viewJobBtnText: { fontFamily: fonts.extrabold, fontSize: 14.5, color: colors.white },
  scheduleTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink, marginTop: 22 },
  scheduleRow: {
    marginTop: 11,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  scheduleRowDone: { opacity: 0.75 },
  scheduleIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scheduleService: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.ink },
  scheduleWhen: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 1 },
  scheduleChip: { backgroundColor: colors.primaryTintBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  scheduleChipText: { fontFamily: fonts.bold, fontSize: 11, color: colors.primaryDark },
  scheduleChipActive: { backgroundColor: colors.goldTint },
  scheduleChipActiveText: { color: colors.goldText },
  footerNote: {
    marginTop: 16,
    backgroundColor: colors.primaryTintBg,
    borderRadius: radius.md,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  footerNoteText: { flex: 1, fontFamily: fonts.medium, fontSize: 11.5, color: colors.primaryDark, lineHeight: 17 },
});
