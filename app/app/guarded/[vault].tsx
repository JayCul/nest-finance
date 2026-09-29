import { address } from '@solana/kit'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BalanceCard } from '@/components/balance-card'
import { Card, InfoRow, ListRow, Notice, PillButton, ScreenHeader, SectionHeader } from '@/components/ui'
import { colors, fonts, radius, space } from '@/constants/theme'
import { Role } from '@/generated/nest-vault'
import { useGuardedVault, useGuardianActions, useNickname } from '@/features/guardian/use-guardian'
import { useChainNow, useSolPrice } from '@/features/vault/use-vault'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { Money } from '@/components/ui'
import { formatCountdown, formatDuration, formatSol, formatWhen, lamportsToSol, shortAddress, usd } from '@/utils/format'

/** What a guardian sees for one vault they protect, and what they can do about it. */
export default function GuardedVaultScreen() {
  const { vault: vaultParam } = useLocalSearchParams<{ vault: string }>()
  const { account } = useMobileWallet()
  const data = useGuardedVault(vaultParam ? address(vaultParam) : undefined)
  const price = useSolPrice()
  const now = useChainNow()
  const actions = useGuardianActions()
  const { nickname, save } = useNickname(vaultParam)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setName(nickname), [nickname])

  const d = data.data
  if (!d) return <SafeAreaView style={styles.screen}><ScreenHeader title="Protected savings" /></SafeAreaView>
  const { vault, pending, events } = d
  const frozen = vault.lockdownUntil > now
  const live = pending.filter((p) => !p.voided)
  const myIndex = account ? vault.guardians.indexOf(account.address) : -1
  const lastCheckIn = myIndex >= 0 ? vault.guardianLastSeen[myIndex] : 0
  const lastLock = events.find((e) => e.kind === 'lockdown')
  const backupPinUsed = frozen && lastLock?.role === Role.Sentinel

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

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={nickname || 'Protected savings'} />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={data.isRefetching} onRefresh={() => data.refetch()} tintColor={colors.primary} />}
      >
        {backupPinUsed ? (
          <Notice tone="danger">
            They opened their wallet with their emergency PIN at {formatWhen(lastLock!.blockTime)}. They may not be safe. Don't
            call them. Check in safely or contact local authorities.
          </Notice>
        ) : null}

        <BalanceCard label={`${nickname || shortAddress(vault.owner, 6)}'s savings`}>
          <Money usd={usd(lamportsToSol(vault.available), price.data)} color={colors.textOnPrimary} size={32} />
          <Text style={styles.sub}>
            {formatSol(vault.available)} · {frozen ? `Frozen ${formatCountdown(vault.lockdownUntil - now)}` : 'Protected'}
          </Text>
        </BalanceCard>

        <SectionHeader title="Withdrawal requests" />
        {live.length === 0 ? <Text style={styles.empty}>No open requests.</Text> : null}
        {live.map((p) => {
          const left = p.unlockAt - now
          return (
            <Card key={p.address}>
              <ListRow
                icon="time-outline"
                iconColor="#A86A0B"
                iconBg={colors.warningSoft}
                title={`${formatSol(p.amount, 3)} to ${shortAddress(p.destination)}`}
                subtitle={left > 0 ? `Leaves in ${formatCountdown(left)}` : 'Can complete now'}
              />
              <PillButton
                title="Cancel this withdrawal"
                icon="close-circle-outline"
                variant="danger"
                haptic
                loading={busy === p.address}
                style={{ flex: 0 }}
                onPress={() => run(p.address, () => actions.cancel(vault.address, p.address))}
              />
            </Card>
          )
        })}

        <SectionHeader title="Protect" />
        <Card>
          <InfoRow label="Withdrawal delay" value={formatDuration(vault.delaySecs)} />
          <InfoRow label="Your last check-in" value={lastCheckIn ? formatWhen(lastCheckIn) : '—'} />
          <PillButton
            title="Check in"
            icon="checkmark-done-outline"
            variant="outline"
            loading={busy === 'checkin'}
            style={{ flex: 0 }}
            onPress={() => run('checkin', () => actions.checkIn(vault.address))}
          />
          <PillButton
            title={frozen ? 'Extend freeze' : 'Freeze their savings'}
            icon="snow-outline"
            variant="dark"
            haptic
            loading={busy === 'freeze'}
            style={{ flex: 0 }}
            onPress={() =>
              Alert.alert(
                'Freeze their savings?',
                `Nothing can leave for ${formatDuration(vault.lockdownSecs)} and every pending withdrawal is cancelled. Use this if something seems wrong.`,
                [
                  { text: 'Not now', style: 'cancel' },
                  { text: 'Freeze', style: 'destructive', onPress: () => run('freeze', () => actions.freeze(vault.address)) },
                ],
              )
            }
          />
        </Card>

        <SectionHeader title="Name" />
        <View style={styles.nameRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Who is this? (only on your phone)"
            placeholderTextColor={colors.textSecondary}
            style={styles.nameInput}
            onEndEditing={() => save(name)}
          />
        </View>

        {error ? <Notice tone="danger">{error}</Notice> : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  sub: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.textOnPrimaryMuted },
  empty: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  nameRow: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  nameInput: { paddingHorizontal: space.lg, paddingVertical: 14, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
})
