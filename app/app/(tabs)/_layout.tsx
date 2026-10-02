import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { Redirect, Tabs } from 'expo-router'
import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { TabBar } from '@/components/tab-bar'
import { colors } from '@/constants/theme'
import { useIsDuress, useSecurity } from '@/features/security/session'
import { useVault } from '@/features/vault/use-vault'
import { useWithdrawalWatcher } from '@/features/vault/use-withdrawal-watcher'

export default function TabsLayout() {
  const { account } = useMobileWallet()
  const vault = useVault()
  const duress = useIsDuress()
  const { mode, pinsEnabled } = useSecurity()
  useWithdrawalWatcher(!duress)

  if (!account) return <Redirect href="/connect" />
  // Onboarding: PINs come first, right after connecting a wallet.
  if (!duress && mode !== 'loading' && !pinsEnabled) return <Redirect href="/security-setup" />
  // Wait for the first answer about the vault. isLoading alone misses the moment before the vault
  // address resolves (the query is still disabled), which flashed the no-vault Home.
  if (!duress && vault.data === undefined && !vault.isError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="guardians" />
      <Tabs.Screen name="settings" />
    </Tabs>
  )
}
