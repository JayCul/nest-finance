import { isAddress } from '@solana/kit'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import React, { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, Field, InfoRow, Notice, PillButton, ScreenHeader } from '@/components/ui'
import { colors, fonts, radius, space } from '@/constants/theme'
import { useSolPrice, useWalletBalance } from '@/features/vault/use-vault'
import { useSendSol } from '@/features/wallet/use-wallet'
import { formatSol, lamportsToSol, solToLamports, usd } from '@/utils/format'

const FEE_BUFFER = 5_000_000n

/** Sends from the spending wallet. Looks and works the same in every mode. */
export default function SendScreen() {
  const wallet = useWalletBalance()
  const price = useSolPrice()
  const sendSol = useSendSol()
  const [amount, setAmount] = useState('')
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const spendable = (wallet.data ?? 0n) > FEE_BUFFER ? (wallet.data ?? 0n) - FEE_BUFFER : 0n
  const lamports = solToLamports(amount)
  const tooMuch = lamports > spendable
  const validTo = isAddress(to.trim())

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Send" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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
            <Pressable
              style={styles.chip}
              onPress={() => setAmount(String(Math.floor(lamportsToSol(spendable) * 10_000) / 10_000))}
            >
              <Text style={styles.chipText}>Max</Text>
            </Pressable>
          </View>
          <View style={styles.divider} />
          <InfoRow label="From" value={`Main Wallet · ${formatSol(wallet.data ?? 0n, 3)}`} />
        </Card>

        <Field
          label="To"
          value={to}
          onChangeText={setTo}
          placeholder="Wallet address"
          autoCapitalize="none"
          autoCorrect={false}
          hint={to && !validTo ? 'That does not look like a Solana address.' : undefined}
        />

        {tooMuch ? <Notice tone="warning">That is more than your wallet holds after fees.</Notice> : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}
      </ScrollView>
      <View style={styles.footer}>
        <PillButton
          title="Send"
          icon="paper-plane-outline"
          haptic
          loading={busy}
          disabled={lamports === 0n || tooMuch || !validTo}
          style={{ flex: 0, minHeight: 56 }}
          onPress={async () => {
            setBusy(true)
            setError(null)
            try {
              await sendSol(lamports, to.trim())
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              router.back()
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e))
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
  body: { padding: space.lg, gap: space.lg },
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
