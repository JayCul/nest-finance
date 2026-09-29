import { DecoySettings } from '@/components/decoy'
import { useIsDuress } from '@/features/security/session'
import { Ionicons } from '@expo/vector-icons'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import * as Haptics from 'expo-haptics'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import React, { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Card, IconCircle, type IconName, Notice, PillButton, Screen } from '@/components/ui'
import { AppConfig } from '@/constants/app-config'
import { colors, fonts, space } from '@/constants/theme'
import { useChainNow, usePendingConfig, useVault, useVaultActions } from '@/features/vault/use-vault'
import { formatCountdown, formatDuration, formatWhen, shortAddress } from '@/utils/format'
import { useQuery } from '@tanstack/react-query'
import { InfoRow } from '@/components/ui'
import { readDuressLog } from '@/features/security/duress'
import { useSecurity } from '@/features/security/session'

function SettingRow({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: IconName
  label: string
  value?: string
  onPress?: () => void
  danger?: boolean
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.6 }]}>
      <IconCircle
        name={icon}
        size={34}
        color={danger ? colors.danger : colors.primary}
        bg={danger ? colors.dangerSoft : colors.primarySoft}
      />
      <Text style={[styles.settingLabel, danger && { color: colors.danger }]}>{label}</Text>
      {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} /> : null}
    </Pressable>
  )
}

function RealSettings() {
  const { account, disconnect } = useMobileWallet()
  const vault = useVault()
  const pendingConfig = usePendingConfig()
  const now = useChainNow()
  const { lockdown, applyConfig, cancelConfig } = useVaultActions()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { pinsEnabled, startDrill, lock } = useSecurity()
  const duressLog = useQuery({ queryKey: ['duress-log'], queryFn: readDuressLog, refetchInterval: 15_000 })
  const lastDuress = duressLog.data?.[0]
  const v = vault.data
  if (!v) return <DecoySettings />

  const frozen = v.lockdownUntil > now
  const pc = pendingConfig.data

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key)
    setError(null)
    try {
      await fn()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const confirmFreeze = () =>
    Alert.alert(
      'Freeze savings?',
      `Nothing can leave your savings for ${formatDuration(v.lockdownSecs)}, and every pending withdrawal is cancelled for good. Only you and a guardian together can lift it early.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Freeze', style: 'destructive', onPress: () => run('freeze', lockdown) },
      ],
    )

  return (
    <Screen>
      <Text style={styles.title}>Settings</Text>

      {pc ? (
        <Card>
          <Text style={styles.cardTitle}>Settings change {pc.voided ? 'voided' : 'pending'}</Text>
          <Text style={styles.body}>
            {pc.voided
              ? 'A freeze cancelled this change. Clear it to propose a new one.'
              : pc.applyAt > now
                ? `Takes effect in ${formatCountdown(pc.applyAt - now)}. You or a guardian can cancel it until then.`
                : 'Ready to apply.'}
          </Text>
          <Text style={styles.body}>
            Delay {formatDuration(pc.params.delaySecs)} · {pc.params.guardians.length} guardian(s) ·{' '}
            {pc.params.safeList.length} safe address(es)
          </Text>
          <View style={styles.row}>
            {!pc.voided && pc.applyAt <= now ? (
              <PillButton title="Apply" loading={busy === 'apply'} onPress={() => run('apply', applyConfig)} />
            ) : null}
            <PillButton title={pc.voided ? 'Clear' : 'Cancel change'} variant="danger" loading={busy === 'cancel'} onPress={() => run('cancel', cancelConfig)} />
          </View>
        </Card>
      ) : null}

      {lastDuress ? (
        <Card>
          <Text style={styles.cardTitle}>{lastDuress.drill ? 'Last practice run' : 'Backup PIN was used'}</Text>
          <Text style={styles.body}>{formatWhen(Math.floor(lastDuress.at / 1000))}</Text>
          <InfoRow
            label="Savings freeze"
            value={
              lastDuress.drill ? 'Skipped (practice)' : lastDuress.lockdown === 'sent' ? 'Frozen by this phone' : 'Failed'
            }
            valueColor={lastDuress.lockdown === 'failed' ? colors.danger : undefined}
          />
          <InfoRow
            label="Contacts alerted"
            value={lastDuress.smsError ? 'Text failed' : String(lastDuress.smsSent)}
            valueColor={lastDuress.smsError ? colors.danger : undefined}
          />
          <InfoRow label="Location shared" value={lastDuress.location ? 'Yes' : 'No'} />
          {lastDuress.lockdownError || lastDuress.smsError ? (
            <Notice tone="danger">{[lastDuress.lockdownError, lastDuress.smsError].filter(Boolean).join(' · ')}</Notice>
          ) : null}
        </Card>
      ) : null}

      <Text style={styles.group}>Security</Text>
      <Card style={{ gap: 0, paddingVertical: space.sm }}>
        <SettingRow icon="time-outline" label="Withdrawal delay" value={formatDuration(v.delaySecs)} onPress={() => router.push('/settings-edit')} />
        <SettingRow icon="people-outline" label="Guardians" value={v.guardians.length ? `${v.guardians.length} connected` : 'None'} onPress={() => router.push('/settings-edit')} />
        <SettingRow icon="flash-outline" label="Safe addresses" value={String(v.safeList.length)} onPress={() => router.push('/settings-edit')} />
        <SettingRow
          icon="finger-print-outline"
          label="Backup PIN"
          value={pinsEnabled ? 'On' : 'Set up'}
          onPress={() => router.push('/security-setup')}
        />
        {pinsEnabled ? (
          <SettingRow
            icon="play-outline"
            label="Practice backup PIN"
            onPress={() =>
              Alert.alert(
                'Practice',
                'The app will lock. Enter your backup PIN to see what opens. Nothing is frozen, and your emergency contact gets a text marked as practice.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Start', onPress: startDrill },
                ],
              )
            }
          />
        ) : null}
        {pinsEnabled ? <SettingRow icon="lock-closed-outline" label="Lock app" onPress={lock} /> : null}
        <SettingRow icon="snow-outline" label="Freeze lasts" value={formatDuration(v.lockdownSecs)} />
      </Card>

      <Text style={styles.group}>Emergency</Text>
      <Card style={{ gap: space.md }}>
        {frozen ? (
          <Notice tone="warning">Frozen for another {formatCountdown(v.lockdownUntil - now)}.</Notice>
        ) : (
          <Text style={styles.body}>
            If something feels wrong, freeze your savings. Pending withdrawals are cancelled and nothing can leave until
            the freeze ends.
          </Text>
        )}
        <PillButton
          title={frozen ? 'Extend freeze' : 'Emergency freeze'}
          icon="snow-outline"
          variant="dark"
          haptic
          loading={busy === 'freeze'}
          style={{ flex: 0 }}
          onPress={confirmFreeze}
        />
      </Card>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <Text style={styles.group}>About</Text>
      <Card style={{ gap: 0, paddingVertical: space.sm }}>
        <SettingRow
          icon="document-text-outline"
          label="Vault on explorer"
          value={shortAddress(v.address)}
          onPress={() => Linking.openURL(`https://explorer.solana.com/address/${v.address}?cluster=${AppConfig.explorerCluster}`)}
        />
        <SettingRow icon="wallet-outline" label="Connected wallet" value={account ? shortAddress(account.address) : '—'} />
        <SettingRow icon="log-out-outline" label="Disconnect" danger onPress={() => disconnect()} />
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginVertical: space.sm },
  group: { fontFamily: fonts.bold, fontSize: 13, color: colors.textSecondary, marginTop: space.sm, marginLeft: 4 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  body: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  row: { flexDirection: 'row', gap: space.sm },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10 },
  settingLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  settingValue: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
})

/** Duress mode shows the ordinary-wallet version of this tab. */
export default function SettingsScreen() {
  return useIsDuress() ? <DecoySettings /> : <RealSettings />
}
