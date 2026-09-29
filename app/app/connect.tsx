import { Ionicons } from '@expo/vector-icons'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { Redirect } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BalanceCard } from '@/components/balance-card'
import { Notice, PillButton } from '@/components/ui'
import { colors, fonts, radius, space } from '@/constants/theme'

const POINTS: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body: string }[] = [
  { icon: 'time-outline', title: 'Every withdrawal waits', body: 'Savings leave only after a delay you choose.' },
  { icon: 'people-outline', title: 'Guardians can step in', body: 'Someone you trust can stop a withdrawal in that window.' },
  { icon: 'lock-closed-outline', title: 'Freeze in one tap', body: 'Lock everything down if something feels wrong.' },
]

export default function ConnectScreen() {
  const { account, connect } = useMobileWallet()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (account) return <Redirect href="/" />

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Ionicons name="shield-checkmark" size={18} color={colors.textOnPrimary} />
          </View>
          <Text style={styles.brand}>Nest Finance</Text>
        </View>

        <BalanceCard label="Savings that can't be rushed">
          <Text style={styles.heroTitle}>Your money,{'\n'}on your schedule.</Text>
        </BalanceCard>

        <View style={{ gap: space.md }}>
          {POINTS.map((p) => (
            <View key={p.title} style={styles.point}>
              <View style={styles.pointIcon}>
                <Ionicons name={p.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pointTitle}>{p.title}</Text>
                <Text style={styles.pointBody}>{p.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <PillButton
          title="Connect wallet"
          icon="wallet-outline"
          loading={busy}
          haptic
          style={{ flex: 0, minHeight: 56 }}
          onPress={async () => {
            setBusy(true)
            setError(null)
            try {
              await connect()
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not connect to a wallet.')
            } finally {
              setBusy(false)
            }
          }}
        />
        <Text style={styles.fine}>Uses your Seed Vault wallet through Mobile Wallet Adapter.</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
  content: { padding: space.lg, gap: space.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: space.sm },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { fontFamily: fonts.display, fontSize: 17, color: colors.text },
  heroTitle: { fontFamily: fonts.display, fontSize: 28, lineHeight: 36, color: colors.textOnPrimary, marginTop: 4 },
  point: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  pointIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointTitle: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.text },
  pointBody: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
  footer: { padding: space.lg, gap: space.md },
  fine: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textSecondary, textAlign: 'center' },
})
