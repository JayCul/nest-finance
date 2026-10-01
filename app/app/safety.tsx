import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScoreRing } from '@/components/score-ring'
import { Card, PillButton, ScreenHeader } from '@/components/ui'
import { colors, fonts, radius, space } from '@/constants/theme'
import { useSafetyScore } from '@/features/vault/use-safety-score'

export default function SafetyScreen() {
  const safety = useSafetyScore()
  if (!safety) return null
  const todo = safety.checks.filter((c) => !c.ok)

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Safety score" />
      <ScrollView contentContainerStyle={styles.body}>
        <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <ScoreRing score={safety.score} size={150} />
          <Text style={styles.headline}>
            {safety.score >= 85 ? 'Well protected' : safety.score >= 60 ? 'Good, with gaps' : 'Needs attention'}
          </Text>
          <Text style={styles.lead}>
            {todo.length === 0 ? 'Everything is in place.' : `${todo.length} thing${todo.length === 1 ? '' : 's'} left to set up.`}
          </Text>
        </Card>

        <PillButton
          title="What if…? Play attacks against your setup"
          icon="sparkles-outline"
          style={{ flex: 0 }}
          onPress={() => router.push('/simulator')}
        />

        {safety.checks.map((c) => (
          <Pressable
            key={c.key}
            disabled={c.ok || !c.fix}
            onPress={() => c.fix && router.push(c.fix)}
            style={({ pressed }) => [styles.check, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.tick, { backgroundColor: c.ok ? colors.successSoft : colors.warningSoft }]}>
              <Ionicons name={c.ok ? 'checkmark' : 'alert'} size={16} color={c.ok ? colors.success : '#A86A0B'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkLabel}>{c.label}</Text>
              <Text style={styles.checkDetail}>{c.detail}</Text>
            </View>
            <Text style={[styles.points, { color: c.ok ? colors.success : colors.textSecondary }]}>+{c.weight}</Text>
            {!c.ok && c.fix ? <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} /> : null}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  headline: { fontFamily: fonts.display, fontSize: 20, color: colors.text, marginTop: space.md },
  lead: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
  },
  tick: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  checkDetail: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  points: { fontFamily: fonts.bold, fontSize: 13 },
})
