import React, { PropsWithChildren, ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { colors, fonts, radius, shadow, space } from '@/constants/theme'

/** Stacked chevron outlines, our own take on a fintech card watermark. */
function CardPattern() {
  const chevron = (x: number, y: number, s: number) =>
    `M ${x} ${y} L ${x + s} ${y + s} L ${x} ${y + 2 * s} M ${x + s * 0.55} ${y} L ${x + s * 1.55} ${y + s} L ${x + s * 0.55} ${y + 2 * s}`
  return (
    <Svg width={170} height={170} viewBox="0 0 170 170" style={StyleSheet.absoluteFill as object}>
      <Path d={chevron(62, 18, 48)} stroke="rgba(255,255,255,0.16)" strokeWidth={14} strokeLinejoin="round" fill="none" />
      <Path d={chevron(98, 58, 40)} stroke="rgba(255,255,255,0.10)" strokeWidth={10} strokeLinejoin="round" fill="none" />
    </Svg>
  )
}

export function BalanceCard({
  header,
  label,
  children,
  footer,
}: PropsWithChildren<{ header?: ReactNode; label: string; footer?: ReactNode }>) {
  return (
    <View style={styles.card}>
      <View style={styles.pattern} pointerEvents="none">
        <CardPattern />
      </View>
      {header}
      <View style={{ gap: 4, paddingHorizontal: space.xs }}>
        <Text style={styles.label}>{label}</Text>
        {children}
      </View>
      {footer}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: space.md,
    paddingBottom: space.lg,
    gap: space.lg,
    overflow: 'hidden',
    ...shadow.primary,
  },
  pattern: { position: 'absolute', right: -20, top: 40, width: 170, height: 170 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.textOnPrimaryMuted },
})
