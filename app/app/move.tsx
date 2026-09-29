import { Ionicons } from '@expo/vector-icons'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { IconCircle, type IconName } from '@/components/ui'
import { colors, fonts, radius, space } from '@/constants/theme'
import { shortAddress } from '@/utils/format'

/** Bottom sheet behind the centre tab button: the same three actions in every mode. */
export default function MoveSheet() {
  const insets = useSafeAreaInsets()
  const { account } = useMobileWallet()
  const [copied, setCopied] = useState(false)

  const go = (path: '/deposit' | '/withdraw') => {
    router.back()
    setTimeout(() => router.push(path), 50)
  }

  const Option = ({ icon, title, body, onPress }: { icon: IconName; title: string; body: string; onPress: () => void }) => (
    <Pressable style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <IconCircle name={icon} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionBody}>{body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  )

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <View style={styles.grabber} />
        <Text style={styles.title}>Move money</Text>
        <Option icon="arrow-down" title="Deposit" body="Move money into protected savings" onPress={() => go('/deposit')} />
        <Option icon="arrow-up" title="Withdraw" body="Start a protected withdrawal" onPress={() => go('/withdraw')} />
        <Option
          icon={copied ? 'checkmark' : 'qr-code-outline'}
          title={copied ? 'Address copied' : 'Receive'}
          body={account ? `Your wallet ${shortAddress(account.address, 6)}` : 'Connect a wallet first'}
          onPress={async () => {
            if (!account) return
            await Clipboard.setStringAsync(account.address)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            setCopied(true)
          }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(12,18,24,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    gap: space.md,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#D5D8DC', marginBottom: 4 },
  title: { fontFamily: fonts.bold, fontSize: 17, color: colors.text, marginBottom: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
  },
  optionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  optionBody: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
})
