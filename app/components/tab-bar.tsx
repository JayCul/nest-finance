import { Ionicons } from '@expo/vector-icons'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts, shadow } from '@/constants/theme'
import type { IconName } from '@/components/ui'

const TAB_META: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index: { label: 'Home', icon: 'home-outline', iconActive: 'home' },
  activity: { label: 'Activity', icon: 'receipt-outline', iconActive: 'receipt' },
  // "People" in every mode: the tab label must not change when opened with the backup PIN.
  guardians: { label: 'People', icon: 'people-outline', iconActive: 'people' },
  settings: { label: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
}

/**
 * Home · Activity · [Move] · Guardians · Settings.
 * The centre button opens the same Send / Receive sheet in every mode, so nothing about
 * the navigation changes when the app is opened with the duress PIN.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const routes = state.routes.filter((r) => TAB_META[r.name])
  const left = routes.slice(0, 2)
  const right = routes.slice(2)

  const renderTab = (route: (typeof routes)[number]) => {
    const meta = TAB_META[route.name]
    const focused = state.routes[state.index]?.key === route.key
    return (
      <Pressable
        key={route.key}
        style={styles.tab}
        onPress={() => {
          Haptics.selectionAsync()
          if (!focused) navigation.navigate(route.name)
        }}
      >
        <Ionicons name={focused ? meta.iconActive : meta.icon} size={21} color={focused ? colors.primary : '#9EA2AA'} />
        <Text style={[styles.label, focused && { color: colors.primary }]}>{meta.label}</Text>
      </Pressable>
    )
  }

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {left.map(renderTab)}
      <View style={styles.centerSlot}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            router.push('/move')
          }}
          style={({ pressed }) => [styles.center, pressed && { transform: [{ scale: 0.94 }] }]}
        >
          <Ionicons name="swap-vertical" size={26} color={colors.textOnPrimary} />
        </Pressable>
      </View>
      {right.map(renderTab)}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    paddingHorizontal: 8,
    ...shadow.card,
    shadowOffset: { width: 0, height: -4 },
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 },
  label: { fontFamily: fonts.semibold, fontSize: 10.5, color: '#9EA2AA' },
  centerSlot: { width: 76, alignItems: 'center' },
  center: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    borderWidth: 5,
    borderColor: colors.background,
    ...shadow.primary,
  },
})
