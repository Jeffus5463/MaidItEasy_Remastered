// Shared UI primitives styled to the MaidItEasy design system.
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, fonts, radius, shadow } from '../theme';

/* ---------- Keyboard ---------- */

// Keeps the CTA above the keyboard on screens with text inputs.
export function KeyboardScreen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

/* ---------- Typography ---------- */

export function Display({ style, ...p }: TextProps) {
  return <Text {...p} style={[{ fontFamily: fonts.display, color: colors.ink, fontSize: 28, lineHeight: 34 }, style]} />;
}
export function Title({ style, ...p }: TextProps) {
  return <Text {...p} style={[{ fontFamily: fonts.displaySemi, color: colors.ink, fontSize: 20 }, style]} />;
}
export function Body({ style, ...p }: TextProps) {
  return <Text {...p} style={[{ fontFamily: fonts.regular, color: colors.inkSoft, fontSize: 15, lineHeight: 22 }, style]} />;
}
export function Label({ style, ...p }: TextProps) {
  return <Text {...p} style={[{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 14 }, style]} />;
}
export function Muted({ style, ...p }: TextProps) {
  return <Text {...p} style={[{ fontFamily: fonts.medium, color: colors.muted, fontSize: 13 }, style]} />;
}
export function FieldError({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: fonts.medium, color: colors.danger, fontSize: 12.5, marginTop: 6 }}>
      {children}
    </Text>
  );
}

/* ---------- Buttons ---------- */

interface BtnProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  color?: string;
  style?: ViewStyle;
}

export function PrimaryButton({ label, onPress, disabled, loading, color = colors.primary, style }: BtnProps) {
  const ok = !disabled && !loading;
  return (
    <Pressable
      onPress={ok ? onPress : undefined}
      style={[
        styles.btn,
        { backgroundColor: ok ? color : colors.disabled },
        ok && shadow.cta,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.btnText}>{label}</Text>
      )}
    </Pressable>
  );
}

/* ---------- Selectable pills / chips / cards ---------- */

export function Pill({
  label,
  active,
  disabled,
  accent = colors.primary,
  onPress,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  accent?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[
        styles.pill,
        {
          borderColor: disabled ? '#ddd6c8' : active ? accent : colors.border,
          borderStyle: disabled ? 'dashed' : 'solid',
          backgroundColor: disabled ? '#f4f1e9' : active ? accent : colors.white,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: 13,
          color: disabled ? colors.mutedSoft : active ? colors.white : colors.inkSoft,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ---------- Async states — for screens backed by a data fetch ---------- */

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.stateBox}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );
}

export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.stateBox}>
      <Ionicons name="alert-circle-outline" size={30} color={colors.danger} />
      <Text style={styles.stateText}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState({
  icon = 'reader-outline',
  title,
  message,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
}) {
  return (
    <View style={styles.stateBox}>
      <Ionicons name={icon} size={32} color={colors.mutedSoft} />
      <Text style={styles.stateTitle}>{title}</Text>
      {!!message && <Text style={styles.stateText}>{message}</Text>}
    </View>
  );
}

/* ---------- Layout ---------- */

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />;
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colors.white, fontFamily: fonts.extrabold, fontSize: 16 },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: radius.xl,
    borderWidth: 1.5,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  stateBox: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 32 },
  stateTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  stateText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 4, paddingVertical: 10, paddingHorizontal: 20, borderRadius: radius.md, backgroundColor: colors.primaryTintBg },
  retryText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
});
