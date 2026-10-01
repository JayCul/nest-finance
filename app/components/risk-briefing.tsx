import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fonts, radius, space } from '@/constants/theme'
import { aiAvailable, useAiText } from '@/features/ai/groq'
import { type WithdrawalRisk } from '@/features/intel/withdrawal-risk'

const LEVEL = {
  high: { label: 'High risk', fg: colors.danger, bg: colors.dangerSoft, icon: 'warning-outline' as const },
  medium: { label: 'Medium risk', fg: '#A86A0B', bg: colors.warningSoft, icon: 'alert-circle-outline' as const },
  low: { label: 'Low risk', fg: colors.success, bg: colors.successSoft, icon: 'shield-checkmark-outline' as const },
}

/**
 * Nest Intelligence for one withdrawal: the risk score and signals the app computed, a briefing
 * worded by AI from those facts, and the app's recommended action.
 */
export function RiskBriefing({
  risk,
  facts,
  task,
  compact = false,
  onDemand = false,
}: {
  risk: WithdrawalRisk
  /** Facts for the AI, from riskFacts(). */
  facts: string
  /** What the AI should write, e.g. a guardian briefing or a pre-signing explanation. */
  task: string
  compact?: boolean
  /** Fetch the AI wording only when asked (for screens where the facts change as you type). */
  onDemand?: boolean
}) {
  const level = LEVEL[risk.level]
  const [asked, setAsked] = useState(!onDemand)
  const ai = useAiText('risk', task, facts, asked)
  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <View style={[styles.chip, { backgroundColor: level.bg }]}>
          <Ionicons name={level.icon} size={14} color={level.fg} />
          <Text style={[styles.chipText, { color: level.fg }]}>
            {level.label} · {risk.score}
          </Text>
        </View>
        <View style={styles.brand}>
          <Ionicons name="sparkles-outline" size={13} color={colors.primaryDark} />
          <Text style={styles.brandText}>Nest Intelligence</Text>
        </View>
      </View>

      {risk.signals.length ? (
        <View style={{ gap: 4 }}>
          {risk.signals.slice(0, compact ? 3 : 6).map((s) => (
            <Text key={s.key} style={styles.signal}>
              <Text style={styles.signalLabel}>{s.label}. </Text>
              {s.detail}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.signal}>Nothing unusual about this withdrawal.</Text>
      )}

      {ai.data ? <Text style={styles.ai}>{ai.data}</Text> : null}
      {ai.isFetching ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.fine}>Writing a briefing…</Text>
        </View>
      ) : null}
      {!ai.data && !ai.isFetching ? <Text style={styles.action}>{risk.action}</Text> : null}
      {ai.error ? <Text style={styles.fine}>{ai.error instanceof Error ? ai.error.message : ''}</Text> : null}
      {onDemand && aiAvailable() && !ai.data && !ai.isFetching ? (
        <Pressable onPress={() => (asked ? ai.refetch() : setAsked(true))} style={({ pressed }) => [styles.ask, pressed && { opacity: 0.6 }]}>
          <Ionicons name="sparkles-outline" size={15} color={colors.primaryDark} />
          <Text style={styles.askText}>Explain this transaction</Text>
        </Pressable>
      ) : null}
      <Text style={styles.fine}>
        {aiAvailable() && ai.data
          ? 'Score, signals and advice computed by the app; worded by AI. The program decides what is allowed.'
          : 'Score, signals and advice computed by the app. The program decides what is allowed.'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { gap: space.sm, backgroundColor: colors.background, borderRadius: radius.md, padding: space.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontFamily: fonts.bold, fontSize: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  brandText: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.primaryDark },
  signal: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
  signalLabel: { fontFamily: fonts.bold, color: colors.text },
  ai: { fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 20, color: colors.text },
  action: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 19, color: colors.text },
  loading: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  askText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primaryDark },
  fine: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.textSecondary },
})
