import { type Address, isAddress } from '@solana/kit'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card, Field, InfoRow, Notice, PillButton, ScreenHeader, Segmented } from '@/components/ui'
import { colors, fonts, radius, shadow, space } from '@/constants/theme'
import { friendlyError } from '@/features/errors'
import { RiskBriefing } from '@/components/risk-briefing'
import { assessWithdrawal, humanDuration, riskFacts } from '@/features/intel/withdrawal-risk'
import { useChainNow, usePendingWithdrawals, useSolPrice, useVault, useVaultActions, useVaultActivity } from '@/features/vault/use-vault'
import { formatDuration, formatSol, formatWhen, lamportsToSol, shortAddress, solToLamports, usd } from '@/utils/format'

type Mode = 'protected' | 'safe'

const EXPLAIN_TASK =
  'Explain this transaction to the owner before they sign it, in 2 or 3 sentences: what it does, when the money moves, who can stop it, and why the app scored the risk this way. End with the recommended action.'

export default function WithdrawScreen() {
  const { account } = useMobileWallet()
  const vault = useVault()
  const activity = useVaultActivity()
  const pending = usePendingWithdrawals()
  const price = useSolPrice()
  const now = useChainNow()
  const { requestWithdrawal, instantWithdraw } = useVaultActions()
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<Mode>('protected')
  const [destination, setDestination] = useState(account?.address ?? '')
  const [safeIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const v = vault.data
  if (!v) return null

  const lamports = solToLamports(amount)
  const tooMuch = lamports > v.available
  const safeAddress = v.safeList[safeIndex]
  const target = mode === 'safe' ? safeAddress : destination.trim()
  const validTarget = !!target && isAddress(target) && target !== v.address
  const unlockAt = now + v.delaySecs
  const risk = assessWithdrawal({
    amount: lamports,
    destination: (validTarget ? target : v.owner) as Address,
    available: v.available,
    safeList: v.safeList,
    ownerWallet: v.owner,
    history: activity.data ?? [],
    otherPending: (pending.data ?? []).filter((p) => !p.voided),
    viewer: 'owner',
    now,
  })
  const explainFacts = [
    `Transaction the owner is about to sign: ${mode === 'safe' ? 'an instant withdrawal to their own safe address' : 'a protected withdrawal request'} of ${formatSol(lamports)} to ${validTarget ? shortAddress(target) : 'an address'}.`,
    mode === 'safe'
      ? 'Safe-address withdrawals arrive at once and cannot be cancelled.'
      : `It waits a protection window of ${humanDuration(v.delaySecs)}; the owner or a guardian can cancel it until then, and the destination cannot be changed.`,
    riskFacts(risk, { amount: lamports, now, viewer: 'owner' }),
  ].join('\n')

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      if (mode === 'safe') {
        await instantWithdraw(lamports, safeAddress)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        router.back()
      } else {
        const { pending } = await requestWithdrawal(lamports, target)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        router.replace({ pathname: '/withdrawal/[address]', params: { address: pending } })
      }
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Withdraw" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.label}>Available balance</Text>
          <Text style={styles.available}>{formatSol(v.available)}</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountRow}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#C4C7CC"
              style={styles.amountInput}
            />
            <Text style={styles.unit}>SOL</Text>
          </View>
          <Text style={styles.hint}>≈ ${(usd(lamportsToSol(lamports), price.data) ?? 0).toFixed(2)}</Text>
        </Card>

        {v.safeList.length > 0 ? (
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { label: 'Any address', value: 'protected' },
              { label: 'Safe address', value: 'safe' },
            ]}
          />
        ) : null}

        {mode === 'protected' ? (
          <Field
            label="Destination"
            value={destination}
            onChangeText={setDestination}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Wallet address"
            hint={destination === account?.address ? 'Your spending wallet' : undefined}
          />
        ) : (
          <Card>
            <InfoRow label="Safe address" value={shortAddress(safeAddress, 6)} />
            <InfoRow label="Arrives" value="Instantly" valueColor={colors.success} />
          </Card>
        )}

        {mode === 'protected' ? (
          <View style={styles.protectCard}>
            <View style={styles.protectHead}>
              <Ionicons name="shield-checkmark" size={18} color={colors.textOnPrimary} />
              <Text style={styles.protectTitle}>Withdrawal protection</Text>
            </View>
            <Text style={styles.protectBody}>Your funds stay in the vault until</Text>
            <Text style={styles.protectWhen}>{formatWhen(unlockAt)}</Text>
            <Text style={styles.protectBody}>
              {formatDuration(v.delaySecs)} protection window. You or a guardian can cancel it until then.
            </Text>
          </View>
        ) : null}

        {lamports > 0n && !tooMuch && validTarget ? (
          <RiskBriefing
            risk={risk}
            facts={explainFacts}
            task={EXPLAIN_TASK}
            onDemand
          />
        ) : null}

        {tooMuch ? <Notice tone="warning">That is more than your savings hold.</Notice> : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}
      </ScrollView>

      <View style={styles.footer}>
        <PillButton
          title={mode === 'safe' ? 'Move now' : 'Request withdrawal'}
          icon={mode === 'safe' ? 'flash-outline' : 'time-outline'}
          haptic
          loading={busy}
          disabled={lamports === 0n || tooMuch || !validTarget}
          style={{ flex: 0, minHeight: 56 }}
          onPress={submit}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: space.lg, gap: space.lg },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary },
  available: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  amountInput: { flex: 1, fontFamily: fonts.display, fontSize: 34, color: colors.text, padding: 0 },
  unit: { fontFamily: fonts.bold, fontSize: 16, color: colors.textSecondary, marginBottom: 6 },
  hint: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textSecondary },
  protectCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 6,
    ...shadow.primary,
  },
  protectHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  protectTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.textOnPrimary },
  protectBody: { fontFamily: fonts.medium, fontSize: 13, color: colors.textOnPrimaryMuted, lineHeight: 19 },
  protectWhen: { fontFamily: fonts.display, fontSize: 22, color: colors.textOnPrimary },
  footer: { padding: space.lg },
})
