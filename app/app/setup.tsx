import { isAddress } from '@solana/kit'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { Redirect, router } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Card, Field, InfoRow, Notice, PillButton, Screen, Segmented } from '@/components/ui'
import { colors, fonts, space } from '@/constants/theme'
import { useVault, useVaultActions } from '@/features/vault/use-vault'
import { formatDuration } from '@/utils/format'

type DelayChoice = 'demo' | '24h' | '48h' | '7d'

const DELAYS: Record<DelayChoice, { delay: number; lockdown: number }> = {
  demo: { delay: 120, lockdown: 600 },
  '24h': { delay: 86_400, lockdown: 604_800 },
  '48h': { delay: 172_800, lockdown: 604_800 },
  '7d': { delay: 604_800, lockdown: 1_209_600 },
}

export default function SetupScreen() {
  const { account } = useMobileWallet()
  const vault = useVault()
  const { createVault } = useVaultActions()
  const [choice, setChoice] = useState<DelayChoice>('48h')
  const [guardian, setGuardian] = useState('')
  const [safe, setSafe] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!account) return <Redirect href="/connect" />
  if (vault.data) return <Redirect href="/" />

  const guardianOk = guardian.trim() === '' || isAddress(guardian.trim())
  const safeOk = safe.trim() === '' || isAddress(safe.trim())
  const { delay, lockdown } = DELAYS[choice]

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await createVault({
        delaySecs: delay,
        lockdownSecs: lockdown,
        guardians: guardian.trim() ? [guardian.trim()] : [],
        safeList: safe.trim() ? [safe.trim()] : [],
      })
      router.replace('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <View style={{ gap: 6, marginTop: space.md }}>
        <Text style={styles.title}>Set up your savings</Text>
        <Text style={styles.body}>
          Choose how long withdrawals wait. You can change these later, and changes wait the same amount of time.
        </Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Withdrawal delay</Text>
        <Segmented
          value={choice}
          onChange={setChoice}
          options={[
            { label: 'Demo', value: 'demo' },
            { label: '24h', value: '24h' },
            { label: '48h', value: '48h' },
            { label: '7 days', value: '7d' },
          ]}
        />
        <InfoRow label="Withdrawals wait" value={formatDuration(delay)} />
        <InfoRow label="Emergency freeze lasts" value={formatDuration(lockdown)} />
        {choice === 'demo' ? (
          <Notice tone="warning">Demo mode uses short timers for testing. Use 24 hours or more for real savings.</Notice>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Guardian</Text>
        <Text style={styles.body}>
          A person you trust who can stop a withdrawal or freeze your savings. Add them now: adding one later waits the
          full delay.
        </Text>
        <Field
          label="Guardian wallet address"
          placeholder="Optional"
          autoCapitalize="none"
          autoCorrect={false}
          value={guardian}
          onChangeText={setGuardian}
          hint={guardianOk ? undefined : 'That does not look like a Solana address.'}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Safe address</Text>
        <Text style={styles.body}>
          A wallet only you control, such as a hardware wallet. Money can move here instantly, and nowhere else.
        </Text>
        <Field
          label="Safe wallet address"
          placeholder="Optional"
          autoCapitalize="none"
          autoCorrect={false}
          value={safe}
          onChangeText={setSafe}
          hint={safeOk ? undefined : 'That does not look like a Solana address.'}
        />
      </Card>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <PillButton
        title="Create protected savings"
        icon="shield-checkmark-outline"
        haptic
        loading={busy}
        disabled={!guardianOk || !safeOk}
        onPress={submit}
        style={{ flex: 0, minHeight: 56 }}
      />
      <Text style={styles.fine}>Your wallet will ask you to approve one transaction.</Text>
      <PillButton
        title="Here to protect someone? Open guardian view"
        icon="people-outline"
        variant="outline"
        style={{ flex: 0 }}
        onPress={() => router.push('/protect')}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  body: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  fine: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textSecondary, textAlign: 'center' },
})
