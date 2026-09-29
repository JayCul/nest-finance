import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import React, { useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fonts, radius, space } from '@/constants/theme'

export const PIN_LENGTH = 4

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const

/**
 * Numeric PIN entry. `onComplete` returns false to reject (the dots shake and clear).
 */
export function PinPad({
  title,
  subtitle,
  onComplete,
  error,
}: {
  title: string
  subtitle?: string
  onComplete: (pin: string) => Promise<boolean> | boolean
  error?: string | null
}) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const shake = useRef(new Animated.Value(0)).current

  const runShake = () =>
    Animated.sequence(
      [12, -12, 8, -8, 0].map((toValue) => Animated.timing(shake, { toValue, duration: 55, useNativeDriver: true })),
    ).start()

  const press = async (key: (typeof KEYS)[number]) => {
    if (busy || key === '') return
    Haptics.selectionAsync()
    if (key === 'back') return setPin((p) => p.slice(0, -1))
    const next = (pin + key).slice(0, PIN_LENGTH)
    setPin(next)
    if (next.length === PIN_LENGTH) {
      setBusy(true)
      const ok = await onComplete(next)
      setBusy(false)
      if (!ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        runShake()
      }
      setPin('')
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <Animated.View style={[styles.dots, { transform: [{ translateX: shake }] }]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
        ))}
      </Animated.View>
      <Text style={styles.error}>{error ?? ' '}</Text>

      <View style={styles.grid}>
        {KEYS.map((key, i) => (
          <Pressable
            key={i}
            accessibilityLabel={key === 'back' ? 'Delete' : key || undefined}
            disabled={key === ''}
            onPress={() => press(key)}
            style={({ pressed }) => [styles.key, key === '' && { backgroundColor: 'transparent' }, pressed && styles.keyPressed]}
          >
            {key === 'back' ? (
              <Ionicons name="backspace-outline" size={24} color={colors.text} />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.lg, width: '100%' },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text, textAlign: 'center' },
  subtitle: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  dots: { flexDirection: 'row', gap: 18, marginTop: space.md },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.primary },
  dotFilled: { backgroundColor: colors.primary },
  error: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.danger, minHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 300, justifyContent: 'space-between', rowGap: 14 },
  key: {
    width: 88,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: colors.primarySoft, transform: [{ scale: 0.96 }] },
  keyText: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
})
