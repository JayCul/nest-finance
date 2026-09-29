import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { Redirect, Tabs } from 'expo-router'
import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { TabBar } from '@/components/tab-bar'
import { colors } from '@/constants/theme'
import { useVault } from '@/features/vault/use-vault'
import { useWithdrawalWatcher } from '@/features/vault/use-withdrawal-watcher'

export default function TabsLayout() {
  const { account } = useMobileWallet()
  const vault = useVault()
  useWithdrawalWatcher()

  if (!account) return <Redirect href="/connect" />
  if (vault.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }
  if (vault.isSuccess && !vault.data) return <Redirect href="/setup" />

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="guardians" />
      <Tabs.Screen name="settings" />
    </Tabs>
  )
}
