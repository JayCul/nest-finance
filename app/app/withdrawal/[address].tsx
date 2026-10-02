import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import * as Linking from 'expo-linking'
import { router, useLocalSearchParams } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, InfoRow, Notice, PillButton, ScreenHeader } from '@/components/ui'
import { AppConfig } from '@/constants/app-config'
import { colors, fonts, radius, shadow, space } from '@/constants/theme'
import { friendlyError } from '@/features/errors'
import { RiskBriefing } from '@/components/risk-briefing'
import { assessWithdrawal, riskFacts } from '@/features/intel/withdrawal-risk'
import { madeOnThisPhone } from '@/features/vault/local-withdrawals'
import { useChainNow, usePendingWithdrawals, useVault, useVaultActions, useVaultActivity } from '@/features/vault/use-vault'
import { formatCountdown, formatDuration, formatSol, formatWhen, shortAddress } from '@/utils/format'

const OWNER_TASK =
  'Write a short check for the owner about this pending withdrawal in 2 or 3 sentences: what is leaving, how long until it can complete, and why the app scored it this way. End with the recommended action.'

export default function PendingWithdrawalScreen() {
  const { address } = useLocalSearchParams<{ address: string }>()
  const vault = useVault()
  const pending = usePendingWithdrawals()
  const activity = useVaultActivity()
  const now = useChainNow()
  const { cancelWithdrawal, executeWithdrawal } = useVaultActions()
  const [busy, setBusy] = useState<'cancel' | 'execute' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const item = pending.data?.find((p) => p.address === address)
  const v = vault.data

  if (!item || !v) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title="Withdrawal" />
        <View style={styles.body}>
          {pending.isLoading ? null : (
            <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
              <Ionicons name="checkmark-done-circle-outline" size={42} color={colors.primary} />
              <Text style={styles.closedTitle}>This withdrawal is closed</Text>
              <Text style={styles.closedBody}>It was completed or cancelled. Check Activity for the details.</Text>
              <PillButton title="Go to Activity" variant="outline" style={{ flex: 0, alignSelf: 'stretch' }} onPress={() => router.replace('/activity')} />
            </Card>
          )}
        </View>
      </SafeAreaView>
    )
  }

  const left = item.unlockAt - now
  const frozen = v.lockdownUntil > now
  const ready = left <= 0 && !frozen && !item.voided
  const risk = assessWithdrawal({
    amount: item.amount,
    destination: item.destination,
    requestedAt: item.requestedAt,
    available: v.available, // pending withdrawals stay in the vault until executed
    safeList: v.safeList,
    ownerWallet: v.owner,
    history: activity.data ?? [],
    otherPending: (pending.data ?? []).filter((p) => !p.voided && p.address !== item.address),
    fromThisPhone: madeOnThisPhone(item.address, item.requestedAt),
    viewer: 'owner',
    now,
  })

  const act = async (kind: 'cancel' | 'execute') => {
    setBusy(kind)
    setError(null)
    try {
      if (kind === 'cancel') await cancelWithdrawal(item.address)
      else await executeWithdrawal(item)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={item.voided ? 'Withdrawal voided' : ready ? 'Withdrawal Ready' : 'Withdrawal Pending'} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={{ alignItems: 'center', gap: 4, marginVertical: space.sm }}>
          <Text style={styles.amount}>{formatSol(item.amount)}</Text>
          <Text style={styles.dest}>To {shortAddress(item.destination, 6)}</Text>
        </View>

        <View style={[styles.timerCard, (ready || item.voided) && { backgroundColor: item.voided ? colors.dark : colors.success }]}>
          <Text style={styles.timerLabel}>
            {item.voided ? 'Voided by a freeze' : ready ? 'Protection window has ended' : 'Withdrawal available in'}
          </Text>
          {!item.voided && !ready ? <Text style={styles.timer}>{formatCountdown(left)}</Text> : null}
          {ready ? <Text style={styles.timer}>Ready</Text> : null}
          {item.voided ? <Text style={styles.timerSmall}>This request can never complete. Clear it to tidy up.</Text> : null}
          {!item.voided ? <Text style={styles.timerSmall}>Unlocks {formatWhen(item.unlockAt)}</Text> : null}
        </View>

        {frozen && !item.voided ? (
          <Notice tone="warning">Savings are frozen. This withdrawal cannot complete while the freeze lasts.</Notice>
        ) : null}

        <Card>
          <InfoRow label="Requested" value={formatWhen(item.requestedAt)} />
          <InfoRow label="Protection window" value={formatDuration(v.delaySecs)} />
          <InfoRow label="Destination" value={shortAddress(item.destination, 6)} />
          <InfoRow label="Can be cancelled by" value={v.guardians.length ? 'You or your guardian' : 'You'} />
        </Card>

        {!item.voided ? (
          <RiskBriefing
            risk={risk}
            facts={riskFacts(risk, { amount: item.amount, unlockAt: item.unlockAt, now, viewer: 'owner' })}
            task={OWNER_TASK}
          />
        ) : null}

        {error ? <Notice tone="danger">{error}</Notice> : null}
      </ScrollView>

      <View style={styles.footer}>
        {ready ? (
          <PillButton
            title="Complete withdrawal"
            icon="arrow-up"
            haptic
            loading={busy === 'execute'}
            disabled={!!busy}
            style={{ flex: 0, minHeight: 54 }}
            onPress={() => act('execute')}
          />
        ) : null}
        <PillButton
          title={item.voided ? 'Clear request' : 'Cancel withdrawal'}
          icon="close-circle-outline"
          variant="danger"
          haptic
          loading={busy === 'cancel'}
          disabled={!!busy}
          style={{ flex: 0, minHeight: 54 }}
          onPress={() => act('cancel')}
        />
        <PillButton
          title="View on explorer"
          variant="outline"
          style={{ flex: 0 }}
          onPress={() =>
            Linking.openURL(`https://explorer.solana.com/address/${item.address}?cluster=${AppConfig.explorerCluster}`)
          }
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: space.lg, gap: space.lg },
  amount: { fontFamily: fonts.display, fontSize: 32, color: colors.text },
  dest: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  timerCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    gap: 6,
    ...shadow.primary,
  },
  timerLabel: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.textOnPrimaryMuted },
  timer: { fontFamily: fonts.display, fontSize: 40, color: colors.textOnPrimary, letterSpacing: 1 },
  timerSmall: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textOnPrimaryMuted, textAlign: 'center' },
  closedTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, marginTop: space.sm },
  closedBody: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  footer: { padding: space.lg, gap: space.sm },
})
