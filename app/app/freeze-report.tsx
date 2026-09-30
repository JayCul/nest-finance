import { Ionicons } from '@expo/vector-icons'
import { address } from '@solana/kit'
import { useQuery } from '@tanstack/react-query'
import * as Linking from 'expo-linking'
import { Redirect, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, InfoRow, Notice, PillButton, ScreenHeader } from '@/components/ui'
import { AppConfig } from '@/constants/app-config'
import { colors, fonts, radius, space } from '@/constants/theme'
import { askOnDevice, downloadModel, isModelReady, MODEL, releaseModel } from '@/features/ai/on-device'
import { UserError } from '@/features/errors'
import { useGuardedVault } from '@/features/guardian/use-guardian'
import { readDuressLog } from '@/features/security/duress'
import { useIsDuress } from '@/features/security/session'
import { buildFreezeReport, EXPLAIN_SYSTEM, reportFacts } from '@/features/vault/freeze-report'
import { useChainNow, usePendingWithdrawals, useVault, useVaultActivity } from '@/features/vault/use-vault'
import { formatCountdown, formatDuration, formatWhen } from '@/utils/format'

/** Why a vault is frozen: the on-chain facts, the backup-PIN record, and an on-device AI summary. */
export default function FreezeReportScreen() {
  const duress = useIsDuress()
  const { vault: vaultParam } = useLocalSearchParams<{ vault?: string }>()
  const asGuardian = !!vaultParam
  const guarded = useGuardedVault(vaultParam ? address(vaultParam) : undefined)
  const own = useVault()
  const ownPending = usePendingWithdrawals()
  const ownActivity = useVaultActivity()
  const duressLog = useQuery({ queryKey: ['duress-log'], queryFn: readDuressLog })
  const now = useChainNow()

  const vault = asGuardian ? guarded.data?.vault : own.data
  const report = useMemo(
    () =>
      vault
        ? buildFreezeReport({
            vault,
            events: (asGuardian ? guarded.data?.events : ownActivity.data) ?? [],
            pending: (asGuardian ? guarded.data?.pending : ownPending.data) ?? [],
            duressLog: duressLog.data ?? [],
            now,
            asGuardian,
          })
        : null,
    // `now` only matters for `frozen`; recompute each minute rather than every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vault, asGuardian, guarded.data, ownActivity.data, ownPending.data, duressLog.data, Math.floor(now / 60)],
  )

  // Never reachable from the ordinary-wallet view the backup PIN shows.
  if (duress) return <Redirect href="/" />

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Why is this frozen?" />
      <ScrollView contentContainerStyle={styles.body}>
        {!report ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : (
          <>
            <Card>
              <View style={styles.statusRow}>
                <View style={[styles.statusIcon, { backgroundColor: report.frozen ? colors.warningSoft : colors.successSoft }]}>
                  <Ionicons
                    name={report.frozen ? 'snow-outline' : 'lock-open-outline'}
                    size={22}
                    color={report.frozen ? '#A86A0B' : colors.success}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{report.frozen ? 'Savings frozen' : 'The freeze has ended'}</Text>
                  <Text style={styles.muted}>
                    {report.frozen ? `Ends in ${formatCountdown(report.until - now)}` : 'Withdrawals work normally again.'}
                  </Text>
                </View>
              </View>
              <InfoRow label="Frozen by" value={report.by?.short ?? 'Unknown'} />
              {report.at ? <InfoRow label="When" value={formatWhen(report.at)} /> : null}
              <InfoRow label="A freeze lasts" value={formatDuration(report.lockdownSecs)} />
              <InfoRow label="Withdrawals it cancelled" value={String(report.voided.length)} />
              {report.by ? <Text style={styles.muted}>{capitalize(report.by.label)}.</Text> : null}
              {report.frozen ? (
                <Text style={styles.fine}>
                  While frozen, nothing can leave these savings unless the owner and a guardian lift the freeze together.
                </Text>
              ) : null}
            </Card>

            {report.backupPin ? <BackupPinCard entry={report.backupPin} /> : null}

            <ExplainCard facts={reportFacts(report, now)} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function BackupPinCard({ entry }: { entry: NonNullable<ReturnType<typeof buildFreezeReport>['backupPin']> }) {
  const d = entry.device
  const c = d?.coords
  return (
    <Card>
      <Text style={styles.cardTitle}>When the backup PIN was used</Text>
      <Text style={styles.muted}>Recorded on this phone at that moment. It stays on this phone.</Text>
      <InfoRow label="Time" value={formatWhen(Math.floor(entry.at / 1000))} />
      <InfoRow label="Phone" value={[d?.manufacturer, d?.model].filter(Boolean).join(' ') || 'Not recorded'} />
      {d?.os ? <InfoRow label="System" value={d.os} /> : null}
      {d?.appVersion ? <InfoRow label="App version" value={d.appVersion} /> : null}
      <InfoRow label="Public IP" value={d?.publicIp ?? 'Not available'} />
      <InfoRow
        label="Location"
        value={c ? `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}${c.accuracyMeters ? ` (±${Math.round(c.accuracyMeters)} m)` : ''}` : 'Not available'}
      />
      <InfoRow
        label="Contacts texted"
        value={entry.smsError ? 'Text failed' : String(entry.smsSent)}
        valueColor={entry.smsError ? colors.danger : undefined}
      />
      <InfoRow
        label="Freeze"
        value={entry.lockdown === 'sent' ? 'Signed by this phone' : entry.lockdown === 'failed' ? 'Failed' : 'Skipped'}
        valueColor={entry.lockdown === 'failed' ? colors.danger : undefined}
      />
      <View style={styles.links}>
        {entry.location ? (
          <PillButton title="Open map" icon="map-outline" variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(entry.location!)} />
        ) : null}
        {entry.lockdownSignature ? (
          <PillButton
            title="View transaction"
            icon="open-outline"
            variant="outline"
            style={{ flex: 1 }}
            onPress={() =>
              Linking.openURL(`https://explorer.solana.com/tx/${entry.lockdownSignature}?cluster=${AppConfig.explorerCluster}`)
            }
          />
        ) : null}
      </View>
    </Card>
  )
}

type Phase = { kind: 'idle' } | { kind: 'downloading'; progress: number } | { kind: 'thinking' } | { kind: 'done' } | { kind: 'error'; message: string }

function ExplainCard({ facts }: { facts: string }) {
  const ready = useQuery({ queryKey: ['ai-model-ready'], queryFn: isModelReady })
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [text, setText] = useState('')

  useEffect(() => () => void releaseModel(), [])

  async function explain() {
    try {
      if (!(await isModelReady())) {
        setPhase({ kind: 'downloading', progress: 0 })
        await downloadModel((progress) => setPhase({ kind: 'downloading', progress }))
        ready.refetch()
      }
      setText('')
      setPhase({ kind: 'thinking' })
      const answer = await askOnDevice(EXPLAIN_SYSTEM, facts, setText)
      if (!answer) throw new UserError('The AI model returned an empty answer. Please try again.')
      setText(answer)
      setPhase({ kind: 'done' })
    } catch (e) {
      console.warn('[nest] on-device AI:', e)
      setPhase({
        kind: 'error',
        message: e instanceof UserError ? e.message : "The on-device AI couldn't run just now. Please try again.",
      })
    }
  }

  const busy = phase.kind === 'downloading' || phase.kind === 'thinking'
  const mb = Math.round(MODEL.bytes / 1e6)

  return (
    <Card>
      <View style={styles.statusRow}>
        <View style={[styles.statusIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="sparkles-outline" size={20} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Explain it in plain words</Text>
          <Text style={styles.muted}>On-device AI. Runs on this phone; nothing is sent anywhere.</Text>
        </View>
      </View>

      {text ? <Text style={styles.answer}>{text}</Text> : null}

      {phase.kind === 'downloading' ? (
        <View style={{ gap: 6 }}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(phase.progress * 100)}%` }]} />
          </View>
          <Text style={styles.muted}>
            Downloading the AI model: {Math.round(phase.progress * 100)}% of {mb} MB
          </Text>
        </View>
      ) : null}
      {phase.kind === 'thinking' && !text ? <Text style={styles.muted}>Reading the facts…</Text> : null}
      {phase.kind === 'error' ? <Notice tone="danger">{phase.message}</Notice> : null}

      {phase.kind !== 'done' ? (
        <PillButton
          title={
            busy
              ? 'Working…'
              : ready.data
                ? 'Explain with on-device AI'
                : `Download AI model (${mb} MB) and explain`
          }
          icon="sparkles-outline"
          loading={busy}
          style={{ flex: 0 }}
          onPress={explain}
        />
      ) : (
        <Text style={styles.fine}>
          Written by {MODEL.name} on this phone from the facts above. It can make mistakes; the facts above are what the
          program recorded.
        </Text>
      )}
      {!ready.data && phase.kind === 'idle' ? (
        <Text style={styles.fine}>One-time download from Hugging Face. Wi-Fi recommended.</Text>
      ) : null}
    </Card>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  statusIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  muted: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
  fine: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 16, color: colors.textSecondary },
  answer: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: colors.text },
  links: { flexDirection: 'row', gap: space.sm },
  track: { height: 8, borderRadius: radius.md, backgroundColor: colors.primarySoft, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.primary },
})
