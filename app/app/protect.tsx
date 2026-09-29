import { router } from 'expo-router'
import React from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PullRefresh } from '@/components/pull-refresh'
import { Card, IconCircle, ListRow, Notice, PillButton, ScreenHeader } from '@/components/ui'
import { colors, fonts, space } from '@/constants/theme'
import { useGuardedVaults, useNickname } from '@/features/guardian/use-guardian'
import { useChainNow, type VaultInfo } from '@/features/vault/use-vault'
import { formatSol, shortAddress } from '@/utils/format'

function GuardedRow({ vault, now }: { vault: VaultInfo; now: number }) {
  const { nickname } = useNickname(vault.address)
  const frozen = vault.lockdownUntil > now
  return (
    <ListRow
      icon={frozen ? 'snow-outline' : 'shield-checkmark-outline'}
      iconColor={frozen ? '#A86A0B' : colors.primary}
      iconBg={frozen ? colors.warningSoft : colors.primarySoft}
      title={nickname || shortAddress(vault.owner, 6)}
      subtitle={frozen ? 'Frozen' : 'Protected'}
      right={formatSol(vault.available, 3)}
      rightSub="Savings"
      onPress={() => router.push({ pathname: '/guarded/[vault]', params: { vault: vault.address } })}
    />
  )
}

/** Everything a guardian needs: who they protect, and their code for being added. */
export default function ProtectScreen() {
  const vaults = useGuardedVaults()
  const now = useChainNow()

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="People you protect" />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<PullRefresh onRefresh={() => vaults.refetch()} />}
      >
        <Card>
          <IconCircle name="people" size={44} />
          <Text style={styles.cardTitle}>You're someone's guardian</Text>
          <Text style={styles.body2}>
            When they request a withdrawal you can cancel it. If they use their emergency PIN, you'll be alerted and their
            savings are already frozen. You can never take money out.
          </Text>
        </Card>

        {(vaults.data ?? []).map((v) => (
          <GuardedRow key={v.address} vault={v} now={now} />
        ))}
        {vaults.data && vaults.data.length === 0 ? (
          <Notice tone="info">Nobody has added you yet. Show them your guardian code so they can add you.</Notice>
        ) : null}

        <PillButton title="My guardian code" icon="qr-code-outline" style={{ flex: 0 }} onPress={() => router.push('/guardian-code')} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: space.lg, gap: space.md },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  body2: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
})
