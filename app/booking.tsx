import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../src/theme';
import { MIN_BOOKING_HOURS, SERVICES, formatHour12, nextDates, peso, toLocalIso } from '../src/data';
import { PrimaryButton } from '../src/components/UI';
import { useBooking } from '../src/store';
import { useAvailableStartHours } from '../src/lib/availability';

const DATES = nextDates();
const MAX_BOOKING_HOURS = 8;

export default function Booking() {
  const b = useBooking();
  const svc = b.service ? SERVICES[b.service] : SERVICES.cleaning;
  const isPerHour = svc.pricingModel === 'per_hour';

  const [units, setUnits] = useState(b.units);
  const [hours, setHours] = useState(Math.max(b.durationHours, MIN_BOOKING_HOURS));
  const [date, setDate] = useState(b.date);
  const [dateIso, setDateIso] = useState(b.dateIso);
  const [startHour, setStartHour] = useState<number | null>(b.startHour);

  // per_unit duration is derived from units, never chosen directly — the
  // server (bookings_capacity_guard trigger) recomputes this same formula
  // and is the real source of truth; this is just so the grid greys the
  // right cells before the customer even submits.
  const durationHours = isPerHour ? hours : Math.max(1, Math.ceil((units * (svc.estimatedMinutesPerUnit ?? 45)) / 60));

  const { data: availability, isLoading: availabilityLoading } = useAvailableStartHours(b.service, dateIso, durationHours);

  // Simple lead-time rule: on today's date, a start hour that has already
  // begun is hidden, not just greyed. Compared against the LOCAL calendar
  // date (toLocalIso), same as nextDates() -- Date#toISOString() is UTC and
  // would disagree with dateIso near midnight in any timezone ahead of UTC.
  const now = new Date();
  const isToday = !!dateIso && dateIso === toLocalIso(now);
  const currentHour = now.getHours();

  const slots = (availability ?? []).filter((s) => !isToday || s.startHour > currentHour);
  // Distinct from "no start times left" (today, all hours already begun):
  // this is a real day with real hours on offer, but zero qualified
  // partners are scheduled to work it at all — the grid would otherwise
  // just render every cell greyed with no explanation.
  const noPartnersThisDay = !availabilityLoading && !!dateIso && slots.length > 0 && !slots.some((s) => s.available);

  // Re-check the currently selected start hour still fits when the
  // duration changes (e.g. customer adds an hour and it no longer fits
  // before close, or a previously-picked worker's slot is now too short).
  useEffect(() => {
    if (startHour === null) return;
    const stillOk = slots.some((s) => s.startHour === startHour && s.available);
    if (!stillOk) setStartHour(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationHours, dateIso]);

  const ready = !!date && startHour !== null;
  const total = isPerHour ? durationHours * (svc.hourlyRate ?? 0) : svc.price * units;

  const cont = () => {
    if (startHour === null) return;
    b.set({ units, durationHours, date, dateIso, startHour });
    router.push('/location');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹  Back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Book service</Text>
        <Text style={styles.sub}>
          {svc.name} · {peso(svc.price)}
          {svc.suffix} · {svc.duration}
        </Text>

        {isPerHour ? (
          <View style={styles.block}>
            <Text style={styles.label}>How many hours?</Text>
            <View style={styles.stepper}>
              <Pressable style={styles.stepBtn} onPress={() => setHours((h) => Math.max(MIN_BOOKING_HOURS, h - 1))}>
                <Text style={styles.stepBtnText}>–</Text>
              </Pressable>
              <View style={styles.stepValue}>
                <Text style={styles.stepValueText}>{hours} hr{hours > 1 ? 's' : ''}</Text>
                <Text style={styles.stepValueSub}>{peso(svc.hourlyRate ?? 0)}/hr</Text>
              </View>
              <Pressable style={styles.stepBtn} onPress={() => setHours((h) => Math.min(MAX_BOOKING_HOURS, h + 1))}>
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
            <Text style={styles.note}>Minimum booking is {MIN_BOOKING_HOURS} hours.</Text>
          </View>
        ) : (
          <View style={styles.block}>
            <Text style={styles.label}>Number of units</Text>
            <View style={styles.stepper}>
              <Pressable style={styles.stepBtn} onPress={() => setUnits((u) => Math.max(1, u - 1))}>
                <Text style={styles.stepBtnText}>–</Text>
              </Pressable>
              <View style={styles.stepValue}>
                <Text style={styles.stepValueText}>{units}</Text>
                <Text style={styles.stepValueSub}>{peso(svc.price)} each</Text>
              </View>
              <Pressable style={styles.stepBtn} onPress={() => setUnits((u) => Math.min(10, u + 1))}>
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
            <Text style={styles.note}>Approx {durationHours} hr{durationHours > 1 ? 's' : ''} on site.</Text>
          </View>
        )}

        <View style={styles.block}>
          <Text style={styles.label}>Choose a date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            {DATES.map((d) => {
              const active = d.full === date;
              return (
                <Pressable
                  key={d.iso}
                  style={[styles.dateChip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.white }]}
                  onPress={() => {
                    setDate(d.full);
                    setDateIso(d.iso);
                    setStartHour(null); // re-check availability for the new date before locking in a start hour
                  }}
                >
                  <Text style={[styles.dateDow, { color: active ? colors.white : colors.muted }]}>{d.dow}</Text>
                  <Text style={[styles.dateDay, { color: active ? colors.white : colors.ink }]}>{d.day}</Text>
                  <Text style={[styles.dateMon, { color: active ? colors.white : colors.muted }]}>{d.mon}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Choose a start time</Text>
          <View style={styles.timeRow}>
            {slots.map((s) => {
              const active = s.startHour === startHour;
              const full = !s.available;
              return (
                <Pressable
                  key={s.startHour}
                  disabled={full}
                  onPress={() => setStartHour(s.startHour)}
                  style={[
                    styles.timePill,
                    {
                      borderStyle: full ? 'dashed' : 'solid',
                      borderColor: full ? '#ddd6c8' : active ? colors.primary : colors.border,
                      backgroundColor: full ? '#f4f1e9' : active ? colors.primary : colors.white,
                    },
                  ]}
                >
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: full ? colors.mutedSoft : active ? colors.white : colors.inkSoft }}>
                    {formatHour12(s.startHour)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {noPartnersThisDay ? (
            <View style={styles.emptyBanner}>
              <Text style={styles.emptyBannerText}>No partners are scheduled for this day yet — try another date.</Text>
            </View>
          ) : (
            <Text style={styles.note}>
              {!dateIso
                ? 'Choose a date to see live availability.'
                : availabilityLoading
                  ? 'Checking availability…'
                  : slots.length === 0
                    ? 'No start times left for that date — try another day.'
                    : 'Some times may be full based on partner availability.'}
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{peso(total)}</Text>
        </View>
        <PrimaryButton label="Continue" disabled={!ready} onPress={cont} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  back: { paddingHorizontal: 20, paddingVertical: 12 },
  backText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.inkSoft },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },
  h1: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  sub: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted, marginTop: 4 },
  block: { marginTop: 26 },
  label: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink, marginBottom: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontFamily: fonts.bold, fontSize: 24, color: colors.primary },
  stepValue: { flex: 1, alignItems: 'center' },
  stepValueText: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  stepValueSub: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  dateRow: { gap: 10, paddingVertical: 2 },
  dateChip: { minWidth: 60, borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', gap: 2 },
  dateDow: { fontFamily: fonts.semibold, fontSize: 12 },
  dateDay: { fontFamily: fonts.display, fontSize: 20 },
  dateMon: { fontFamily: fonts.medium, fontSize: 11 },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timePill: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.xl, borderWidth: 1.5 },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 10 },
  emptyBanner: { marginTop: 10, backgroundColor: colors.goldTint, borderRadius: radius.md, padding: 12 },
  emptyBannerText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.goldText },
  footer: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 12, backgroundColor: colors.cream },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  totalValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
});
