import { Ionicons } from '@expo/vector-icons'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { router } from 'expo-router'
import React from 'react'
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BalanceCard } from '@/components/balance-card'
import { ListRow, Money, PillButton, SectionHeader } from '@/components/ui'
import { colors, fonts, radius, space } from '@/constants/theme'
import { useGuardedVaults } from '@/features/guardian/use-guardian'
import { useChainNow, useSolPrice, useWalletBalance } from '@/features/vault/use-vault'
import { formatSol, lamportsToSol, shortAddress, usd } from '@/utils/format'

/**
 * Home for a wallet without its own vault yet: a way in to protected savings, and the
 * vaults this wallet guards. Keeps guardian-only users inside the normal tab navigation.
 */
export function NoVaultHome() {
  const { account } = useMobileWallet()
  const wallet = useWalletBalance()
  const price = useSolPrice()
  const guarded = useGuardedVaults()
  const now = useChainNow()
  if (!account) return null

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={guarded.isRefetching} onRefresh={() => guarded.refetch()} tintColor={colors.primary} />}
      >
        <BalanceCard
          label="Wallet balance"
          header={
            <View style={styles.profile}>
              <Image source={require('@/assets/images/logo-mark.png')} style={styles.logo} />
              <View style={{ flex: 1 }}>
                <Text style={styles.hello}>Hi there</Text>
                <Text style={styles.handle}>{shortAddress(account.address)}</Text>
              </View>
            </View>
          }
          footer={
            <View style={{ flexDirection: 'row' }}>
              <PillButton title="Start protected savings" icon="shield-checkmark-outline" variant="white" onPress={() => router.push('/setup')} />
            </View>
          }
        >
          <Money usd={usd(lamportsToSol(wallet.data ?? 0n), price.data)} color={colors.textOnPrimary} size={34} />
          <Text style={styles.sub}>{formatSol(wallet.data ?? 0n)}</Text>
        </BalanceCard>

        <Pressable style={styles.explain} onPress={() => router.push('/setup')}>
          <Ionicons name="time-outline" size={20} color={colors.primaryDark} />
          <Text style={styles.explainText}>
            Savings in Nest leave only after a delay you choose, and someone you trust can stop a withdrawal in that window.
          </Text>
        </Pressable>

        <SectionHeader title="People you protect" action="Guardian view" onAction={() => router.push('/protect')} />
        {(guarded.data ?? []).map((g) => {
          const frozen = g.lockdownUntil > now
          return (
            <ListRow
              key={g.address}
              icon={frozen ? 'snow-outline' : 'shield-checkmark-outline'}
              iconColor={frozen ? '#A86A0B' : colors.primary}
              iconBg={frozen ? colors.warningSoft : colors.primarySoft}
              title={shortAddress(g.owner, 6)}
              subtitle={frozen ? 'Frozen' : 'Protected'}
              right={formatSol(g.available, 3)}
              rightSub="Savings"
              onPress={() => router.push({ pathname: '/guarded/[vault]', params: { vault: g.address } })}
            />
          )
        })}
        {guarded.data && guarded.data.length === 0 ? (
          <Text style={styles.empty}>Nobody has added you as a guardian yet.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: space.lg, paddingBottom: 130, gap: space.lg },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.sm },
  logo: { width: 40, height: 40, borderRadius: 12 },
  hello: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  handle: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textSecondary },
  sub: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.textOnPrimaryMuted },
  explain: { flexDirection: 'row', gap: 10, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: space.md },
  explainText: { flex: 1, fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18, color: colors.primaryDark },
  empty: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: space.md },
})
