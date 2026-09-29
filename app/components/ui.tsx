import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import React, { PropsWithChildren, ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, fonts, radius, shadow, space } from '@/constants/theme'

export type IconName = React.ComponentProps<typeof Ionicons>['name']

export function Screen({
  children,
  scroll = true,
  padded = true,
}: PropsWithChildren<{ scroll?: boolean; padded?: boolean }>) {
  const content = <View style={[padded && styles.screenPad, { gap: space.lg }]}>{children}</View>
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  )
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.row}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} style={styles.row}>
          <Text style={styles.sectionAction}>{action}</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  )
}

type PillVariant = 'white' | 'glass' | 'primary' | 'outline' | 'danger' | 'dark'

export function PillButton({
  title,
  icon,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  subtitle,
  style,
  haptic,
}: {
  title: string
  icon?: IconName
  onPress?: () => void
  variant?: PillVariant
  disabled?: boolean
  loading?: boolean
  subtitle?: string
  style?: StyleProp<ViewStyle>
  haptic?: boolean
}) {
  const v = pillVariants[variant]
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        onPress?.()
      }}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={17} color={v.fg} /> : null}
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.pillText, { color: v.fg }]}>{title}</Text>
            {subtitle ? <Text style={[styles.pillSub, { color: v.fg }]}>{subtitle}</Text> : null}
          </View>
        </>
      )}
    </Pressable>
  )
}

const pillVariants: Record<PillVariant, { bg: string; fg: string; border: string }> = {
  white: { bg: colors.surface, fg: colors.text, border: colors.surface },
  glass: { bg: colors.primaryGlass, fg: colors.textOnPrimary, border: 'rgba(255,255,255,0.35)' },
  primary: { bg: colors.primary, fg: colors.textOnPrimary, border: colors.primary },
  outline: { bg: colors.surface, fg: colors.text, border: colors.border },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
  dark: { bg: colors.dark, fg: colors.textOnPrimary, border: colors.dark },
}

/** "$2,545.00" with the cents lighter, like a banking app. */
export function Money({
  usd,
  size = 34,
  color = colors.text,
  style,
}: {
  usd: number | null | undefined
  size?: number
  color?: string
  style?: StyleProp<TextStyle>
}) {
  if (usd == null || !Number.isFinite(usd)) {
    return <Text style={[{ fontFamily: fonts.display, fontSize: size, color }, style]}>$—</Text>
  }
  const [whole, cents] = usd.toFixed(2).split('.')
  const withCommas = Number(whole).toLocaleString('en-US')
  return (
    <Text style={[{ fontFamily: fonts.display, fontSize: size, color, letterSpacing: -0.5 }, style]}>
      ${withCommas}
      <Text style={{ opacity: 0.55 }}>.{cents}</Text>
    </Text>
  )
}

export function IconCircle({
  name,
  color = colors.primary,
  bg = colors.primarySoft,
  size = 40,
}: {
  name: IconName
  color?: string
  bg?: string
  size?: number
}) {
  return (
    <View style={[styles.iconCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Ionicons name={name} size={size * 0.48} color={color} />
    </View>
  )
}

export function ListRow({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  right,
  rightSub,
  rightColor,
  onPress,
}: {
  icon: IconName
  iconColor?: string
  iconBg?: string
  title: string
  subtitle?: string
  right?: string
  rightSub?: string
  rightColor?: string
  onPress?: () => void
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.7 }]}>
      <IconCircle name={icon} color={iconColor} bg={iconBg} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {right ? <Text style={[styles.rowRight, rightColor ? { color: rightColor } : null]}>{right}</Text> : null}
        {rightSub ? <Text style={styles.rowSub}>{rightSub}</Text> : null}
      </View>
    </Pressable>
  )
}

export function StatusDot({ color = colors.success, label }: { color?: string; label: string }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.rowSub, { color }]}>{label}</Text>
    </View>
  )
}

export function InfoRow({ label, value, valueColor }: { label: string; value: ReactNode; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  )
}

export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={12}
        style={styles.headerBtn}
      >
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={right ? styles.headerBtn : styles.headerSpacer}>{right}</View>
    </View>
  )
}

export function Field({ label, hint, style, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.textSecondary} style={[styles.field, style]} {...props} />
      {hint ? <Text style={styles.rowSub}>{hint}</Text> : null}
    </View>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              Haptics.selectionAsync()
              onChange(o.value)
            }}
            style={[styles.segment, active && { backgroundColor: colors.dark }]}
          >
            <Text style={[styles.segmentText, active && { color: colors.textOnPrimary }]}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function Notice({ tone = 'info', children }: PropsWithChildren<{ tone?: 'info' | 'warning' | 'danger' }>) {
  const palette = {
    info: { bg: colors.primarySoft, fg: colors.primaryDark, icon: 'shield-checkmark-outline' as IconName },
    warning: { bg: colors.warningSoft, fg: '#A86A0B', icon: 'time-outline' as IconName },
    danger: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle-outline' as IconName },
  }[tone]
  return (
    <View style={[styles.notice, { backgroundColor: palette.bg }]}>
      <Ionicons name={palette.icon} size={18} color={palette.fg} />
      <Text style={[styles.noticeText, { color: palette.fg }]}>{children}</Text>
    </View>
  )
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenPad: { paddingHorizontal: space.lg },
  scrollContent: { paddingBottom: 120, paddingTop: space.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    ...shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xs },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  sectionAction: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  pill: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
  },
  pillText: { fontFamily: fonts.semibold, fontSize: 14 },
  pillSub: { fontFamily: fonts.medium, fontSize: 10.5, opacity: 0.8, marginTop: 1 },
  iconCircle: { alignItems: 'center', justifyContent: 'center' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    ...shadow.card,
  },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  rowSub: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowRight: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.text },
  dot: { width: 7, height: 7, borderRadius: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  infoLabel: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.textSecondary },
  infoValue: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 40, height: 40 },
  headerTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  field: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#ECEEF0',
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segment: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  segmentText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary },
  notice: { flexDirection: 'row', gap: 10, padding: space.md, borderRadius: radius.md, alignItems: 'flex-start' },
  noticeText: { flex: 1, fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18 },
})
