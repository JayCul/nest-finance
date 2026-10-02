// Duress-mode screens: an ordinary wallet showing only the real spending wallet.
// Same design system, same navigation, no trace of savings or guardians.

import { Ionicons } from '@expo/vector-icons'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import React from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PullRefresh } from '@/components/pull-refresh'
import { BalanceCard } from '@/components/balance-card'
import { Card, IconCircle, type IconName, ListRow, Money, PillButton, Screen, SectionHeader } from '@/components/ui'
import { AppConfig } from '@/constants/app-config'
import { colors, fonts, radius, shadow, space } from '@/constants/theme'
import { useSecurity } from '@/features/security/session'
import { useSolPrice, useWalletBalance } from '@/features/vault/use-vault'
import { useUsdcBalance, useWalletActivity, type WalletActivityItem } from '@/features/wallet/use-wallet'
import { formatSol, formatWhen, lamportsToSol, shortAddress, usd } from '@/utils/format'

function activityRow(a: WalletActivityItem) {
  const received = a.lamports > 0n
  const amount = received ? a.lamports : -a.lamports
  return {
    icon: (received ? 'arrow-down' : 'arrow-up') as IconName,
    iconColor: received ? colors.success : colors.text,
    iconBg: received ? colors.successSoft : '#EEF0F2',
    title: received ? 'Received' : 'Sent',
    subtitle: formatWhen(a.blockTime),
    right: `${received ? '+' : '-'}${formatSol(amount, 3)}`,
    rightColor: received ? colors.success : colors.danger,
    rightSub: 'Wallet',
    onPress: () => Linking.openURL(`https://explorer.solana.com/tx/${a.signature}?cluster=${AppConfig.explorerCluster}`),
  }
}

export function DecoyHome() {
  const { account } = useMobileWallet()
  const wallet = useWalletBalance()
  const usdc = useUsdcBalance()
  const price = useSolPrice()
  const activity = useWalletActivity()
  const { drill } = useSecurity()
  if (!account) return null

  const sol = lamportsToSol(wallet.data ?? 0n)
  const solUsd = usd(sol, price.data)
  const total = solUsd == null ? null : solUsd + (usdc.data ?? 0)

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <PullRefresh onRefresh={() => Promise.all([wallet.refetch(), usdc.refetch(), activity.refetch()])} />
        }
      >
        {drill ? <Text style={styles.practice}>Practice mode · nothing was frozen</Text> : null}
        <BalanceCard
          label="Total Balance"
          header={
            <View style={styles.profile}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{account.address.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hello}>Hi there</Text>
                <Text style={styles.handle}>{shortAddress(account.address)}</Text>
              </View>
              <Pressable style={styles.headerIcon} onPress={() => router.push('/activity')}>
                <Ionicons name="notifications-outline" size={17} color={colors.primary} />
              </Pressable>
              <Pressable style={styles.headerIcon} onPress={() => router.push('/move')}>
                <Ionicons name="qr-code-outline" size={17} color={colors.primary} />
              </Pressable>
            </View>
          }
          footer={
            <View style={styles.pills}>
              <PillButton title="Send" icon="arrow-up" variant="white" onPress={() => router.push('/send')} />
              <PillButton title="Receive" icon="qr-code-outline" variant="glass" onPress={() => router.push('/move')} />
            </View>
          }
        >
          <Money usd={total} color={colors.textOnPrimary} size={36} />
          <Text style={styles.subOnPrimary}>{formatSol(wallet.data ?? 0n)}</Text>
        </BalanceCard>

        <SectionHeader title="Accounts" action="View All" onAction={() => router.push('/activity')} />
        <View style={styles.grid}>
          <Pressable style={styles.tile} onPress={() => router.push('/send')}>
            <IconCircle name="wallet-outline" size={36} color="#8B5CF6" bg="#F1EBFE" />
            <Text style={styles.tileLabel}>Main Wallet</Text>
            <Money usd={solUsd} size={19} />
            <Text style={styles.tileSub}>{formatSol(wallet.data ?? 0n, 3)}</Text>
          </Pressable>
          <View style={styles.tile}>
            <IconCircle name="logo-usd" size={36} color="#2775CA" bg="#E8F1FB" />
            <Text style={styles.tileLabel}>USDC</Text>
            <Money usd={usdc.data ?? 0} size={19} />
            <Text style={styles.tileSub}>{(usdc.data ?? 0).toFixed(2)} USDC</Text>
          </View>
        </View>

        <SectionHeader title="Recent Transactions" action="View All" onAction={() => router.push('/activity')} />
        {(activity.data ?? []).slice(0, 5).map((a) => (
          <ListRow key={a.signature} {...activityRow(a)} />
        ))}
        {activity.data && activity.data.length === 0 ? <Text style={styles.empty}>No transactions yet.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  )
}

export function DecoyActivity() {
  const activity = useWalletActivity()
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { gap: space.md }]}
        refreshControl={<PullRefresh onRefresh={() => activity.refetch()} />}
      >
        <Text style={styles.title}>Activity</Text>
        <SectionHeader title="History" />
        {(activity.data ?? []).map((a) => (
          <ListRow key={a.signature} {...activityRow(a)} />
        ))}
        {activity.data && activity.data.length === 0 ? <Text style={styles.empty}>Nothing here yet.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  )
}

export function DecoyPeople() {
  return (
    <Screen>
      <Text style={styles.title}>People</Text>
      <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
        <IconCircle name="people" size={56} />
        <Text style={styles.emptyTitle}>Pay the people you know</Text>
        <Text style={styles.emptyBody}>Save a contact once and send to them without copying addresses.</Text>
        <PillButton title="Send money" icon="arrow-up" style={{ flex: 0, alignSelf: 'stretch' }} onPress={() => router.push('/send')} />
      </Card>
    </Screen>
  )
}

/** Also the Settings screen before any savings exist (`noSavings`), where PINs aren't set up yet. */
export function DecoySettings({ noSavings = false }: { noSavings?: boolean }) {
  const { account, disconnect } = useMobileWallet()
  const { lock, pinsEnabled } = useSecurity()
  const Row = ({ icon, label, value, onPress, danger }: { icon: IconName; label: string; value?: string; onPress?: () => void; danger?: boolean }) => (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.6 }]}>
      <IconCircle name={icon} size={34} color={danger ? colors.danger : colors.primary} bg={danger ? colors.dangerSoft : colors.primarySoft} />
      <Text style={[styles.settingLabel, danger && { color: colors.danger }]}>{label}</Text>
      {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} /> : null}
    </Pressable>
  )
  return (
    <Screen>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.group}>Account</Text>
      <Card style={{ gap: 0, paddingVertical: space.sm }}>
        <Row icon="wallet-outline" label="Connected wallet" value={account ? shortAddress(account.address) : '—'} />
        <Row icon="globe-outline" label="Network" value="Devnet" />
        <Row icon="cash-outline" label="Currency" value="USD" />
      </Card>
      <Text style={styles.group}>Security</Text>
      <Card style={{ gap: 0, paddingVertical: space.sm }}>
        <Row
          icon="keypad-outline"
          label={noSavings ? 'Set up PINs' : 'Change PIN'}
          onPress={() =>
            noSavings
              ? Alert.alert('Set up PINs', 'Create your protected savings on Home first. Your PIN and backup PIN come right after.')
              : Alert.alert('Change PIN', 'Unlock with your current PIN from the lock screen first.')
          }
        />
        {pinsEnabled ? <Row icon="lock-closed-outline" label="Lock app" onPress={lock} /> : null}
      </Card>
      <Text style={styles.group}>About</Text>
      <Card style={{ gap: 0, paddingVertical: space.sm }}>
        <Row icon="information-circle-outline" label="Version" value="1.0.0" />
        <Row icon="log-out-outline" label="Disconnect" danger onPress={() => disconnect()} />
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: space.lg, paddingBottom: 130, gap: space.lg },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginVertical: space.sm },
  practice: {
    alignSelf: 'center',
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#A86A0B',
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.sm,
    paddingRight: space.md,
  },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display, fontSize: 13, color: colors.textOnPrimary },
  hello: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  handle: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textSecondary },
  headerIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  subOnPrimary: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.textOnPrimaryMuted },
  pills: { flexDirection: 'row', gap: space.md },
  grid: { flexDirection: 'row', gap: space.md },
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: 6, ...shadow.card },
  tileLabel: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textSecondary, marginTop: 6 },
  tileSub: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textSecondary },
  empty: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: space.lg },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, marginTop: space.sm },
  emptyBody: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  group: { fontFamily: fonts.bold, fontSize: 13, color: colors.textSecondary, marginTop: space.sm, marginLeft: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10 },
  settingLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  settingValue: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
})
