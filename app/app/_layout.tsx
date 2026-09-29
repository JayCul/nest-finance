import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans'
import { Unbounded_500Medium, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { PropsWithChildren, useEffect } from 'react'
import 'react-native-reanimated'
import { AppProviders } from '@/components/app-providers'
import { LockScreen } from '@/components/lock-screen'
import { useGuardianWatcher } from '@/features/guardian/use-guardian-watcher'
import { useNotificationRouting } from '@/features/notification-routing'
import { useSecurity } from '@/features/security/session'
import { colors } from '@/constants/theme'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Unbounded_500Medium,
    Unbounded_600SemiBold,
  })

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync()
  }, [loaded])

  if (!loaded) return null

  return (
    <AppProviders>
      <SecurityGate>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="connect" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="deposit" />
        <Stack.Screen name="withdraw" />
        <Stack.Screen name="withdrawal/[address]" />
        <Stack.Screen name="settings-edit" />
        <Stack.Screen name="security-setup" />
        <Stack.Screen name="send" />
        <Stack.Screen name="protect" />
        <Stack.Screen name="guarded/[vault]" />
        <Stack.Screen name="guardian-code" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="safety" />
        <Stack.Screen
          name="move"
          options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
        />
      </Stack>
      </SecurityGate>
      <StatusBar style="dark" />
    </AppProviders>
  )
}

/** Shows the PIN screen while locked. Both PINs lead into the same navigation. */
function SecurityGate({ children }: PropsWithChildren) {
  const { mode } = useSecurity()
  if (mode === 'loading') return null
  if (mode === 'locked') return <LockScreen />
  return (
    <>
      {children}
      <GuardianWatcher enabled={mode === 'real'} />
    </>
  )
}

/** Alerts about vaults this wallet protects. Silent while the duress view is showing. */
function GuardianWatcher({ enabled }: { enabled: boolean }) {
  useGuardianWatcher(enabled)
  useNotificationRouting(enabled)
  return null
}
