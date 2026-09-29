import * as Haptics from 'expo-haptics'
import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Card, Field, IconCircle, InfoRow, Notice, PillButton } from '@/components/ui'
import { colors, fonts, space } from '@/constants/theme'
import { toSkr, useSkrBalance, useStipend, useStipendActions } from '@/features/stipend/use-stipend'
import type { VaultInfo } from '@/features/vault/use-vault'

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })

/** Owner side: pay guardians in SKR for staying reachable. */
export function GuardianRewards({ vault }: { vault: VaultInfo }) {
  const stipend = useStipend(vault.address)
  const skr = useSkrBalance()
  const actions = useStipendActions()
  const [rate, setRate] = useState('10')
  const [fund, setFund] = useState('100')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const s = stipend.data
  const guardians = Math.max(vault.guardians.length, 1)

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
            title="Top up 50 SKR"
            icon="add"
            variant="outline"
            loading={busy}
            style={{ flex: 0 }}
            onPress={() => run(() => actions.topUp(vault.address, 50))}
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
          <Text style={styles.body}>You have {fmt(toSkr(skr.data ?? 0n))} SKR.</Text>
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
      {error ? <Notice tone="danger">{error}</Notice> : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  title: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  body: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18, color: colors.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', gap: space.md },
})
