import { DecoyPeople } from '@/components/decoy'
import { useIsDuress } from '@/features/security/session'
import { router } from 'expo-router'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Card, IconCircle, ListRow, Notice, PillButton, Screen, SectionHeader } from '@/components/ui'
import { colors, fonts, space } from '@/constants/theme'
import { useChainNow, useVault } from '@/features/vault/use-vault'
import { formatWhen, shortAddress } from '@/utils/format'

function RealGuardians() {
  const vault = useVault()
  const now = useChainNow()
  const v = vault.data

  return (
    <Screen>
      <Text style={styles.title}>Guardians</Text>
      <Card>
        <View style={styles.head}>
          <IconCircle name="people" size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headTitle}>People who protect your savings</Text>
            <Text style={styles.body}>A guardian can stop a withdrawal or freeze your savings. They can never take money out.</Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="Your guardians" />
      {v?.guardians.length ? (
        v.guardians.map((g, i) => {
          const last = v.guardianLastSeen[i]
          const stale = now - last > 8 * 86400
          return (
            <ListRow
              key={g}
              icon="person-outline"
              title={shortAddress(g, 6)}
              subtitle={`Last check-in ${formatWhen(last)}`}
              right={stale ? 'Check in due' : 'Active'}
              rightColor={stale ? colors.warning : colors.success}
            />
          )
        })
      ) : (
        <Notice tone="warning">No guardian yet. Without one, only you can cancel a withdrawal.</Notice>
      )}

      <PillButton
        title="Add or change guardians"
        icon="person-add-outline"
        variant="outline"
        style={{ flex: 0 }}
        onPress={() => router.push('/settings-edit')}
      />
      <Text style={styles.fine}>Guardian changes take effect after your withdrawal delay.</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginVertical: space.sm },
  head: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  headTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  body: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18, color: colors.textSecondary, marginTop: 2 },
  fine: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textSecondary, textAlign: 'center' },
})

/** Duress mode shows the ordinary-wallet version of this tab. */
export default function GuardiansScreen() {
  return useIsDuress() ? <DecoyPeople /> : <RealGuardians />
}
