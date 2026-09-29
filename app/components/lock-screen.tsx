import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PinPad } from '@/components/pin-pad'
import { colors, fonts, space } from '@/constants/theme'
import { useSecurity } from '@/features/security/session'

/**
 * The same screen for both PINs. Nothing here hints that a second PIN exists; during a
 * drill the only difference is a small "Practice" label, which the user started themselves.
 */
export function LockScreen() {
  const { unlock, drill } = useSecurity()
  const [error, setError] = useState<string | null>(null)

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name="shield-checkmark" size={20} color={colors.textOnPrimary} />
        </View>
        <Text style={styles.brandText}>Nest Finance</Text>
        {drill ? <Text style={styles.practice}>Practice</Text> : null}
      </View>
      <PinPad
        title="Enter your PIN"
        subtitle="Unlock to see your accounts"
        error={error}
        onComplete={async (pin) => {
          const result = await unlock(pin)
          setError(result === 'wrong' ? 'Wrong PIN. Try again.' : null)
          return result === 'ok'
        }}
      />
      <View style={{ height: space.xl }} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.xl },
  brand: { alignItems: 'center', gap: 10, marginTop: space.xxl },
  logo: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  practice: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#A86A0B',
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
})
