import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import React, { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Notice, PillButton, ScreenHeader } from '@/components/ui'
import { colors, fonts, radius, space } from '@/constants/theme'
import { decodeGuardianCode, setScannedGuardian } from '@/features/guardian/guardian-code'

/** Scans a guardian's code and hands the address back to the settings screen. */
export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [error, setError] = useState<string | null>(null)
  const done = useRef(false)

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Scan guardian code" />
      <View style={styles.body}>
        {permission?.granted ? (
          <View style={styles.frame}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => {
                if (done.current) return
                const address = decodeGuardianCode(data)
                if (!address) return setError('That QR code is not a Nest guardian code.')
                done.current = true
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                setScannedGuardian(address)
                router.back()
              }}
            />
          </View>
        ) : (
          <PillButton title="Allow camera" icon="camera-outline" style={{ flex: 0 }} onPress={requestPermission} />
        )}
        <Text style={styles.hint}>On their phone: Nest Finance → People → My guardian code.</Text>
        {error ? <Notice tone="warning">{error}</Notice> : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: space.lg, gap: space.lg },
  frame: { height: 340, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.dark },
  hint: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
})
