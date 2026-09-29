import { useMobileWallet } from '@wallet-ui/react-native-kit'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, PillButton, ScreenHeader } from '@/components/ui'
import { colors, fonts, radius, space } from '@/constants/theme'
import { encodeGuardianCode } from '@/features/guardian/guardian-code'
import { shortAddress } from '@/utils/format'

/** The guardian shows this; the owner scans it to add them. */
export default function GuardianCodeScreen() {
  const { account } = useMobileWallet()
  const [copied, setCopied] = useState(false)
  if (!account) return null

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="My guardian code" />
      <View style={styles.body}>
        <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
          <View style={styles.qrFrame}>
            <QRCode value={encodeGuardianCode(account.address)} size={220} color={colors.text} backgroundColor={colors.surface} />
          </View>
          <Text style={styles.address}>{shortAddress(account.address, 8)}</Text>
          <Text style={styles.hint}>Ask the person you're protecting to scan this in Nest Finance: People → Add guardian.</Text>
        </Card>
        <PillButton
          title={copied ? 'Copied' : 'Copy code'}
          icon={copied ? 'checkmark' : 'copy-outline'}
          variant="outline"
          style={{ flex: 0 }}
          onPress={async () => {
            await Clipboard.setStringAsync(account.address)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            setCopied(true)
          }}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: space.lg, gap: space.lg },
  qrFrame: { padding: space.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  address: { fontFamily: fonts.display, fontSize: 15, color: colors.text, marginTop: space.md },
  hint: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
})
