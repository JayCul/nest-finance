import { Ionicons } from '@expo/vector-icons'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { router } from 'expo-router'
import React from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BalanceCard } from '@/components/balance-card'
import { Card, IconCircle, InfoRow, ListRow, Money, Notice, PillButton, SectionHeader, StatusDot } from '@/components/ui'
import { colors, fonts, radius, shadow, space } from '@/constants/theme'
import { activityRowProps } from '@/features/vault/activity-row'
import {
  useChainNow,
  usePendingWithdrawals,
  useSolPrice,
  useVault,
  useVaultActivity,
  useWalletBalance,
} from '@/features/vault/use-vault'
import { formatCountdown, formatDuration, formatDurationShort, formatSol, lamportsToSol, shortAddress, usd } from '@/utils/format'

export default function HomeScreen() {
  const { account } = useMobileWallet()
  const vault = useVault()
  const pending = usePendingWithdrawals()
  const wallet = useWalletBalance()
  const price = useSolPrice()
  const activity = useVaultActivity()
  const now = useChainNow()

  const v = vault.data
  if (!v || !account) return null

  const savingsSol = lamportsToSol(v.available)
  const walletSol = lamportsToSol(wallet.data ?? 0n)
  const frozen = v.lockdownUntil > now
  const live = (pending.data ?? []).filter((p) => !p.voided)

  const refreshing = vault.isRefetching || pending.isRefetching || wallet.isRefetching
  const refresh = () => {
    vault.refetch()
    pending.refetch()
    wallet.refetch()
    activity.refetch()
    price.refetch()
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <BalanceCard
          label="Protected Balance"
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
              <PillButton title="Deposit" icon="add" variant="white" onPress={() => router.push('/deposit')} />
              <PillButton
                title="Withdraw"
                icon="arrow-up"
                variant="glass"
                subtitle={`${formatDurationShort(v.delaySecs)} protection`}
                disabled={frozen}
                onPress={() => router.push('/withdraw')}
              />
            </View>
          }
        >
          <Money usd={usd(savingsSol, price.data)} color={colors.textOnPrimary} size={36} />
          <View style={styles.row}>
            <Text style={styles.subOnPrimary}>{formatSol(v.available)}</Text>
            <View style={styles.chip}>
              <Ionicons name={frozen ? 'snow-outline' : 'shield-checkmark'} size={11} color={colors.textOnPrimary} />
              <Text style={styles.chipText}>{frozen ? 'Frozen' : `Protected · ${formatDurationShort(v.delaySecs)}`}</Text>
            </View>
          </View>
        </BalanceCard>

        {frozen ? (
          <Notice tone="warning">
            Savings are frozen for {formatCountdown(v.lockdownUntil - now)}. Nothing can leave until then unless you
            and a guardian lift it together.
          </Notice>
        ) : null}

        <SectionHeader title="Accounts" action="View All" onAction={() => router.push('/activity')} />
        <View style={styles.grid}>
          <Pressable style={styles.tile} onPress={() => router.push('/move')}>
            <IconCircle name="wallet-outline" size={36} color="#8B5CF6" bg="#F1EBFE" />
            <View style={styles.row}>
              <Text style={styles.tileLabel}>Spending</Text>
              <Ionicons name="information-circle-outline" size={13} color={colors.textSecondary} />
            </View>
            <Money usd={usd(walletSol, price.data)} size={19} />
            <Text style={styles.tileSub}>{formatSol(wallet.data ?? 0n, 3)}</Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => router.push('/settings')}>
            <IconCircle name="shield-checkmark-outline" size={36} color={colors.primary} bg={colors.primarySoft} />
            <View style={styles.row}>
              <Text style={styles.tileLabel}>Protected Savings</Text>
            </View>
            <Money usd={usd(savingsSol, price.data)} size={19} />
            <Text style={styles.tileSub}>{formatSol(v.available, 3)}</Text>
          </Pressable>
        </View>

        {live.length > 0 ? (
          <>
            <SectionHeader title="Pending withdrawals" />
            {live.map((p) => {
              const left = p.unlockAt - now
              return (
                <ListRow
                  key={p.address}
                  icon={left > 0 ? 'time-outline' : 'checkmark-circle-outline'}
                  iconColor={left > 0 ? '#A86A0B' : colors.success}
                  iconBg={left > 0 ? colors.warningSoft : colors.successSoft}
                  title={`To ${shortAddress(p.destination)}`}
                  subtitle={left > 0 ? `Available in ${formatCountdown(left)}` : 'Ready to complete'}
                  right={formatSol(p.amount, 3)}
                  rightSub={left > 0 ? 'Protected' : 'Unlocked'}
                  onPress={() => router.push({ pathname: '/withdrawal/[address]', params: { address: p.address } })}
                />
              )
            })}
          </>
        ) : null}

        <SectionHeader title="Protection" />
        <Card>
          <View style={styles.protectionHead}>
            <IconCircle name="shield-checkmark" size={38} />
            <View style={{ flex: 1 }}>
              <Text style={styles.protectionTitle}>Savings protection</Text>
              <StatusDot color={frozen ? colors.warning : colors.success} label={frozen ? 'Frozen' : 'Active'} />
            </View>
          </View>
          <View style={styles.divider} />
          <InfoRow label="Withdrawal delay" value={formatDuration(v.delaySecs)} />
          <InfoRow
            label="Guardians"
            value={v.guardians.length ? `${v.guardians.length} connected` : 'None yet'}
            valueColor={v.guardians.length ? undefined : colors.warning}
          />
          <InfoRow label="Safe addresses" value={String(v.safeList.length)} />
          <InfoRow label="Duress protection" value="Coming soon" valueColor={colors.textSecondary} />
        </Card>

        <SectionHeader title="Recent Activity" action="View All" onAction={() => router.push('/activity')} />
        {(activity.data ?? []).slice(0, 4).map((a) => (
          <ListRow key={a.signature} {...activityRowProps(a)} />
        ))}
        {activity.data && activity.data.length === 0 ? (
          <Text style={styles.empty}>No activity yet. Deposits and withdrawals show up here.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: space.lg, paddingBottom: 130, gap: space.lg },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.sm,
    paddingRight: space.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.display, fontSize: 13, color: colors.textOnPrimary },
  hello: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  handle: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textSecondary },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subOnPrimary: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.textOnPrimaryMuted },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryGlass,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textOnPrimary },
  pills: { flexDirection: 'row', gap: space.md },
  grid: { flexDirection: 'row', gap: space.md },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 6,
    ...shadow.card,
  },
  tileLabel: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textSecondary, marginTop: 6 },
  tileSub: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textSecondary },
  protectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  protectionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border },
  empty: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: space.lg },
})
