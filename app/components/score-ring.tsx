import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { colors, fonts } from '@/constants/theme'

/** Circular 0-100 score, cyan on a soft track. */
export function ScoreRing({ score, size = 64, stroke }: { score: number; size?: number; stroke?: number }) {
  const width = stroke ?? Math.max(5, size / 11)
  const r = (size - width) / 2
  const c = 2 * Math.PI * r
  const tone = score >= 85 ? colors.success : score >= 60 ? colors.primary : colors.warning
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.primarySoft} strokeWidth={width} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone}
          strokeWidth={width}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(c * score) / 100} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontFamily: fonts.display, fontSize: size * 0.3, color: colors.text }}>{score}</Text>
      </View>
    </View>
  )
}
