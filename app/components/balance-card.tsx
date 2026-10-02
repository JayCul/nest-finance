import React, { PropsWithChildren, ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { G, Path } from 'react-native-svg'
import { colors, fonts, radius, shadow, space } from '@/constants/theme'

/** Two leaves from the logo, each split by its wave, as a card watermark. */
const LEAF = 'M 18 96 C 18 60 52 40 92 44 C 120 47 140 40 162 26 C 156 70 132 116 80 122 C 42 126 18 118 18 96 Z'
const WAVE = 'M 22 100 C 50 82 72 104 100 86 C 124 70 140 52 160 30'

function CardPattern() {
  return (
    <Svg width={200} height={200} viewBox="0 0 170 170" style={StyleSheet.absoluteFill as object}>
      <G transform="rotate(-14 85 85)">
        <Path d={LEAF} fill="rgba(255,255,255,0.16)" />
        <Path d={WAVE} stroke={colors.primary} strokeWidth={7} strokeLinecap="round" fill="none" />
      </G>
      <G transform="translate(84 98) scale(0.52) rotate(-14 85 85)">
        <Path d={LEAF} fill="rgba(255,255,255,0.11)" />
        <Path d={WAVE} stroke={colors.primary} strokeWidth={9} strokeLinecap="round" fill="none" />
      </G>
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
  pattern: { position: 'absolute', right: -34, top: 34, width: 200, height: 200 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.textOnPrimaryMuted },
})
