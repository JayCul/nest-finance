import * as Haptics from 'expo-haptics'
import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { Card, Field, IconCircle, InfoRow, Notice, PillButton } from '@/components/ui'
import { AppConfig } from '@/constants/app-config'
import { colors, fonts, space } from '@/constants/theme'
import { friendlyError } from '@/features/errors'
import { useFaucet } from '@/features/faucet'
import { skrMint, toSkr, useSkrBalance, useStipend, useStipendActions } from '@/features/stipend/use-stipend'
import type { VaultInfo } from '@/features/vault/use-vault'

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })
// Sized so one Circle faucet request (20 test USDC at the time of writing) covers setup and top-ups.
const TOP_UP = 5

/** Owner side: pay guardians in SKR for staying reachable. */
export function GuardianRewards({ vault }: { vault: VaultInfo }) {
  const { account } = useMobileWallet()
  const stipend = useStipend(vault.address)
  const mint = stipend.data?.mint ?? skrMint
  const skr = useSkrBalance(mint)
  const actions = useStipendActions()
  const openFaucet = useFaucet(() => skr.refetch())
  const [rate, setRate] = useState('1')
  const [fund, setFund] = useState('5')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  const s = stipend.data
  const guardians = Math.max(vault.guardians.length, 1)
  const held = toSkr(skr.data ?? 0n)
  // Devnet: the stand-in token comes from Circle's faucet. Offer it when there isn't enough to go on.
  const needed = s ? TOP_UP : Number(fund) || 0
  const showFaucet = AppConfig.isDevnet && mint === skrMint && skr.data !== undefined && held < needed

  return (
    <Card>
      <View style={styles.head}>
        <IconCircle name="gift-outline" size={42} color="#8B5CF6" bg="#F1EBFE" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Guardian rewards</Text>
          <Text style={styles.body}>
            Pay guardians in SKR for staying reachable. They collect when they check in each week. Miss a week and that
            week is forfeited.
          </Text>
        </View>
      </View>

      {s ? (
        <>
          <InfoRow label="Each guardian earns" value={`${fmt(toSkr(s.ratePerWeek))} SKR / week`} />
          <InfoRow label="Rewards pool" value={`${fmt(toSkr(s.balance))} SKR`} />
          <InfoRow
            label="Covers"
            value={`${Math.floor(toSkr(s.balance) / (toSkr(s.ratePerWeek) * guardians))} weeks`}
          />
          <PillButton
            title={`Top up ${TOP_UP} SKR`}
            icon="add"
            variant="outline"
            loading={busy}
            style={{ flex: 0 }}
            onPress={() => run(() => actions.topUp(vault.address, mint, TOP_UP))}
          />
        </>
      ) : (
        <>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="SKR per week" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Fund with" value={fund} onChangeText={setFund} keyboardType="decimal-pad" />
            </View>
          </View>
          <Text style={styles.body}>You have {fmt(held)} SKR.</Text>
          <PillButton
            title="Start guardian rewards"
            icon="gift-outline"
            haptic
            loading={busy}
            disabled={!(Number(rate) > 0) || !(Number(fund) > 0) || vault.guardians.length === 0}
            style={{ flex: 0 }}
            onPress={() => run(() => actions.setup(vault.address, Number(rate), Number(fund)))}
          />
          {vault.guardians.length === 0 ? <Notice tone="warning">Add a guardian first.</Notice> : null}
        </>
      )}
      {AppConfig.isDevnet && mint === skrMint ? (
        <Text style={styles.fine}>{"On devnet, rewards use Circle's test USDC as a stand-in for SKR."}</Text>
      ) : null}
      {showFaucet && account ? (
        <PillButton
          title="Get free test tokens"
          icon="water-outline"
          variant="outline"
          style={{ flex: 0 }}
          onPress={() =>
            openFaucet(
              account.address,
              AppConfig.skrFaucetUrl,
              'Wallet address copied. On the Circle faucet, choose Solana Devnet and paste it, then come back.',
            )
          }
        />
      ) : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  title: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  body: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18, color: colors.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', gap: space.md },
  fine: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 16, color: colors.textSecondary },
})
