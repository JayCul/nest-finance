import { PullRefresh } from '@/components/pull-refresh'
import { DecoyActivity } from '@/components/decoy'
import { useIsDuress } from '@/features/security/session'
import { router } from 'expo-router'
import React from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ListRow, SectionHeader } from '@/components/ui'
import { colors, fonts, space } from '@/constants/theme'
import { activityRowProps } from '@/features/vault/activity-row'
import { useChainNow, usePendingWithdrawals, useVaultActivity } from '@/features/vault/use-vault'
import { formatCountdown, formatSol, shortAddress } from '@/utils/format'

function RealActivity() {
  const activity = useVaultActivity()
  const pending = usePendingWithdrawals()
  const now = useChainNow()
  const open = pending.data ?? []

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <PullRefresh onRefresh={() => Promise.all([activity.refetch(), pending.refetch()])} />
        }
      >
        <Text style={styles.title}>Activity</Text>

        {open.length > 0 ? (
          <>
            <SectionHeader title="Open requests" />
            {open.map((p) => {
              const left = p.unlockAt - now
              return (
                <ListRow
                  key={p.address}
                  icon={p.voided ? 'ban-outline' : left > 0 ? 'time-outline' : 'checkmark-circle-outline'}
                  iconColor={p.voided ? colors.textSecondary : left > 0 ? '#A86A0B' : colors.success}
                  iconBg={p.voided ? '#EEF0F2' : left > 0 ? colors.warningSoft : colors.successSoft}
                  title={`Withdrawal to ${shortAddress(p.destination)}`}
                  subtitle={p.voided ? 'Voided by a freeze' : left > 0 ? `Pending security window · ${formatCountdown(left)}` : 'Ready to complete'}
                  right={formatSol(p.amount, 3)}
                  onPress={() => router.push({ pathname: '/withdrawal/[address]', params: { address: p.address } })}
                />
              )
            })}
          </>
        ) : null}

        <SectionHeader title="History" />
        {(activity.data ?? []).map((a) => (
          <ListRow key={`${a.signature}-${a.kind}`} {...activityRowProps(a)} />
        ))}
        {activity.data && activity.data.length === 0 ? <Text style={styles.empty}>Nothing here yet.</Text> : null}
        {activity.isError ? <Text style={styles.empty}>Could not load history. Pull down to retry.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: space.lg, paddingBottom: 130, gap: space.md },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginVertical: space.sm },
  empty: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: space.lg },
})

/** Duress mode shows the ordinary-wallet version of this tab. */
export default function ActivityScreen() {
  return useIsDuress() ? <DecoyActivity /> : <RealActivity />
}
