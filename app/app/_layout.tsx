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
import { useEffect } from 'react'
import 'react-native-reanimated'
import { AppProviders } from '@/components/app-providers'
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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="connect" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="deposit" />
        <Stack.Screen name="withdraw" />
        <Stack.Screen name="withdrawal/[address]" />
        <Stack.Screen name="settings-edit" />
        <Stack.Screen
          name="move"
          options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
        />
      </Stack>
      <StatusBar style="dark" />
    </AppProviders>
  )
}
