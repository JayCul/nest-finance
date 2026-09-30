import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BalanceCard } from '@/components/balance-card'
import { Card, InfoRow, Money, Notice, PillButton, ScreenHeader } from '@/components/ui'
import { colors, fonts, radius, space } from '@/constants/theme'
import { friendlyError } from '@/features/errors'
import { useSolPrice, useVault, useVaultActions, useWalletBalance } from '@/features/vault/use-vault'
import { formatDuration, formatSol, lamportsToSol, solToLamports, usd } from '@/utils/format'

/** Keep a little SOL in the spending wallet for fees. */
const FEE_BUFFER = 5_000_000n

export default function DepositScreen() {
  const vault = useVault()
  const wallet = useWalletBalance()
  const price = useSolPrice()
  const { depositSol } = useVaultActions()
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const v = vault.data
  const spendable = (wallet.data ?? 0n) > FEE_BUFFER ? (wallet.data ?? 0n) - FEE_BUFFER : 0n
  const lamports = solToLamports(amount)
  const tooMuch = lamports > spendable

  const setFraction = (f: number) => {
    Haptics.selectionAsync()
    setAmount(String(Math.floor(lamportsToSol(spendable) * f * 10_000) / 10_000))
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Deposit" />
      <View style={styles.body}>
        <BalanceCard label="Protected Savings">
          <Money usd={usd(lamportsToSol(v?.available ?? 0n), price.data)} color={colors.textOnPrimary} size={30} />
          <Text style={styles.sub}>{formatSol(v?.available ?? 0n)}</Text>
        </BalanceCard>

        <Card>
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
          <View style={styles.chips}>
            {[0.25, 0.5, 1].map((f) => (
              <Pressable key={f} style={styles.chip} onPress={() => setFraction(f)}>
                <Text style={styles.chipText}>{f === 1 ? 'Max' : `${f * 100}%`}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.divider} />
          <InfoRow label="From" value={`Spending · ${formatSol(wallet.data ?? 0n, 3)}`} />
          <InfoRow label="Withdrawals from savings wait" value={v ? formatDuration(v.delaySecs) : '—'} />
        </Card>

        {tooMuch ? <Notice tone="warning">That is more than your spending wallet holds after fees.</Notice> : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}
      </View>

      <View style={styles.footer}>
        <PillButton
          title="Move to savings"
          icon="shield-checkmark-outline"
          haptic
          loading={busy}
          disabled={lamports === 0n || tooMuch}
          style={{ flex: 0, minHeight: 56 }}
          onPress={async () => {
            setBusy(true)
            setError(null)
            try {
              await depositSol(lamports)
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              router.back()
            } catch (e) {
              setError(friendlyError(e))
            } finally {
              setBusy(false)
            }
          }}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, padding: space.lg, gap: space.lg },
  sub: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.textOnPrimaryMuted },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  amountInput: { flex: 1, fontFamily: fonts.display, fontSize: 34, color: colors.text, padding: 0 },
  unit: { fontFamily: fonts.bold, fontSize: 16, color: colors.textSecondary, marginBottom: 6 },
  hint: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textSecondary },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.primaryDark },
  divider: { height: 1, backgroundColor: colors.border },
  footer: { padding: space.lg },
})
