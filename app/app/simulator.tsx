import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { Redirect, router } from 'expo-router'
import React, { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, PillButton, ScreenHeader } from '@/components/ui'
import { colors, fonts, radius, space } from '@/constants/theme'
import { aiAvailable, askAi, useAiText } from '@/features/ai/groq'
import { UserError } from '@/features/errors'
import { configFacts, type Outcome, runScenarios, type Scenario, scenarioFacts, summarise } from '@/features/intel/simulator'
import { useIsDuress, useSecurity } from '@/features/security/session'
import { loadContacts } from '@/features/security/security-store'
import { useStipend } from '@/features/stipend/use-stipend'
import { useChainNow, useVault, useWalletBalance } from '@/features/vault/use-vault'

const SUMMARY_TASK =
  'In 2 or 3 sentences, tell the owner how well their setup handles these scenarios, naming the most important thing to fix if there is one. Use the app\'s results; do not re-judge them.'
const WALK_TASK =
  'Walk the owner through this scenario as a short story in 3 to 4 sentences, step by step, using only the steps given, then say what to fix if anything.'
const ASK_TASK =
  'Answer the owner\'s "what if" question in 2 to 4 sentences using only the configuration, rules and scenario results given. If a related scenario needs attention, say so and give the fix the app suggests. If the facts do not cover it, say what the app can and cannot tell. Never promise outcomes the rules do not guarantee.'

const OUTCOME: Record<Outcome, { label: string; fg: string; bg: string; icon: 'shield-checkmark' | 'alert-circle' | 'warning' }> = {
  protected: { label: 'Protected', fg: colors.success, bg: colors.successSoft, icon: 'shield-checkmark' },
  attention: { label: 'Needs attention', fg: '#A86A0B', bg: colors.warningSoft, icon: 'alert-circle' },
  exposed: { label: 'Exposed', fg: colors.danger, bg: colors.dangerSoft, icon: 'warning' },
}

/** "What if…?": the owner's real setup played against common attacks, explained by AI. */
export default function SimulatorScreen() {
  const duress = useIsDuress()
  const vault = useVault()
  const wallet = useWalletBalance()
  const now = useChainNow()
  const { pinsEnabled } = useSecurity()
  const stipend = useStipend(vault.data?.address)
  const contacts = useQuery({ queryKey: ['emergency-contacts'], queryFn: loadContacts })

  const v = vault.data
  const input = useMemo(
    () =>
      v
        ? { vault: v, spendingLamports: wallet.data ?? 0n, pinsEnabled, contacts: contacts.data?.length ?? 0, stipend: stipend.data, now }
        : null,
    // Re-run when the setup changes, not every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [v, wallet.data, pinsEnabled, contacts.data, stipend.data, Math.floor(now / 3600)],
  )
  const scenarios = useMemo(() => (input ? runScenarios(input) : []), [input])
  const facts = useMemo(() => (input ? configFacts(input, scenarios) : null), [input, scenarios])
  const summary = useAiText('sim-summary', SUMMARY_TASK, facts)
  const [open, setOpen] = useState<string | null>(null)

  if (duress) return <Redirect href="/" />
  if (!v || !input) return null
  const counts = summarise(scenarios)

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="What if…?" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.row}>
            <View style={[styles.badge, { backgroundColor: counts.attention ? colors.warningSoft : colors.successSoft }]}>
              <Text style={[styles.badgeNum, { color: counts.attention ? '#A86A0B' : colors.success }]}>
                {counts.protected}/{scenarios.length}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Scenarios protected</Text>
              <Text style={styles.muted}>Played against your real settings and on-chain vault.</Text>
            </View>
          </View>
          <Brand />
          {summary.data ? <Text style={styles.ai}>{summary.data}</Text> : null}
          {summary.isFetching ? <Loading text="Reviewing your setup…" /> : null}
          {summary.error ? <Text style={styles.fine}>{(summary.error as Error).message}</Text> : null}
          <Text style={styles.fine}>{"Outcomes are decided by the app from the program's rules; AI only explains them."}</Text>
        </Card>

        {scenarios.map((s) => (
          <ScenarioCard key={s.id} s={s} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} />
        ))}

        {aiAvailable() ? <AskWhatIf facts={facts!} /> : null}
      </ScrollView>
    </SafeAreaView>
  )
}

function ScenarioCard({ s, open, onToggle }: { s: Scenario; open: boolean; onToggle: () => void }) {
  const o = OUTCOME[s.outcome]
  const [asked, setAsked] = useState(false)
  const walk = useAiText('sim-walk', WALK_TASK, scenarioFacts(s), asked)
  return (
    <Card>
      <Pressable onPress={onToggle} style={styles.row}>
        <Ionicons name={o.icon} size={22} color={o.fg} />
        <View style={{ flex: 1 }}>
          <Text style={styles.question}>{s.question}</Text>
          <Text style={[styles.outcome, { color: o.fg }]}>
            {o.label} · <Text style={styles.muted}>{s.exposure}</Text>
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </Pressable>
      {open ? (
        <View style={{ gap: space.sm }}>
          {s.steps.map((st, i) => (
            <View key={i} style={styles.step}>
              <View style={[styles.dot, { backgroundColor: st.ok ? colors.successSoft : colors.warningSoft }]}>
                <Ionicons name={st.ok ? 'checkmark' : 'alert'} size={12} color={st.ok ? colors.success : '#A86A0B'} />
              </View>
              <Text style={styles.stepText}>{st.text}</Text>
            </View>
          ))}
          {s.gaps.map((g, i) => (
            <Pressable key={i} disabled={!g.fix} onPress={() => g.fix && router.push(g.fix)} style={styles.gap}>
              <Text style={styles.gapText}>{g.text}</Text>
              {g.fix ? <Ionicons name="chevron-forward" size={16} color="#A86A0B" /> : null}
            </Pressable>
          ))}
          {walk.data ? (
            <>
              <Brand />
              <Text style={styles.ai}>{walk.data}</Text>
            </>
          ) : null}
          {walk.isFetching ? <Loading text="Walking through it…" /> : null}
          {walk.error ? <Text style={styles.fine}>{(walk.error as Error).message}</Text> : null}
          {aiAvailable() && !walk.data && !walk.isFetching ? (
            <Pressable onPress={() => (asked ? walk.refetch() : setAsked(true))} style={styles.ask}>
              <Ionicons name="sparkles-outline" size={15} color={colors.primaryDark} />
              <Text style={styles.askText}>Walk me through it</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  )
}

function AskWhatIf({ facts }: { facts: string }) {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function ask() {
    const question = q.trim().slice(0, 240)
    if (!question) return
    setBusy(true)
    setError(null)
    setAnswer(null)
    try {
      setAnswer(await askAi(ASK_TASK, `${facts}\nThe owner asks: ${question}`))
    } catch (e) {
      setError(e instanceof UserError ? e.message : "Nest Intelligence couldn't answer just now.")
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card>
      <Brand />
      <Text style={styles.title}>Ask your own what-if</Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="What if my guardian is travelling for a month?"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        multiline
        maxLength={240}
      />
      <PillButton title="Ask" icon="sparkles-outline" loading={busy} disabled={!q.trim()} style={{ flex: 0 }} onPress={ask} />
      {answer ? <Text style={styles.ai}>{answer}</Text> : null}
      {error ? <Text style={styles.fine}>{error}</Text> : null}
      <Text style={styles.fine}>{"Answered from your settings and the program's rules. Only the facts on this screen are sent, never keys, addresses or location."}</Text>
    </Card>
  )
}

function Brand() {
  return (
    <View style={styles.brand}>
      <Ionicons name="sparkles-outline" size={13} color={colors.primaryDark} />
      <Text style={styles.brandText}>Nest Intelligence</Text>
    </View>
  )
}

function Loading({ text }: { text: string }) {
  return (
    <View style={styles.row}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.fine}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  badgeNum: { fontFamily: fonts.display, fontSize: 18 },
  title: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  question: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, lineHeight: 19 },
  outcome: { fontFamily: fonts.bold, fontSize: 12.5, marginTop: 2 },
  muted: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
  fine: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.textSecondary },
  ai: { fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 20, color: colors.text },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  brandText: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.primaryDark },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  dot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.text },
  gap: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: space.md },
  gapText: { flex: 1, fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 18, color: '#A86A0B' },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  askText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primaryDark },
  input: {
    minHeight: 64,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    padding: space.md,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
  },
})
