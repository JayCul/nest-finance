import { isAddress } from '@solana/kit'
import * as Haptics from 'expo-haptics'
import { router, useFocusEffect } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { friendlyError } from '@/features/errors'
import { takeScannedGuardian } from '@/features/guardian/guardian-code'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, Field, Notice, PillButton, ScreenHeader, Segmented } from '@/components/ui'
import { colors, fonts, space } from '@/constants/theme'
import { usePendingConfig, useVault, useVaultActions } from '@/features/vault/use-vault'
import { formatDuration } from '@/utils/format'

const DELAY_OPTIONS = [
  { label: 'Demo', value: '120' },
  { label: '24h', value: '86400' },
  { label: '48h', value: '172800' },
  { label: '7 days', value: '604800' },
]

const splitList = (s: string) =>
  s
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean)

export default function SettingsEditScreen() {
  const vault = useVault()
  const pendingConfig = usePendingConfig()
  const { proposeConfig } = useVaultActions()
  const v = vault.data
  const [delay, setDelay] = useState(String(v?.delaySecs ?? 172800))
  const [guardians, setGuardians] = useState((v?.guardians ?? []).join('\n'))
  const [safe, setSafe] = useState((v?.safeList ?? []).join('\n'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pick up a code scanned on the scanner screen.
  useFocusEffect(
    useCallback(() => {
      const scanned = takeScannedGuardian()
      if (scanned) setGuardians((g) => (splitList(g).includes(scanned) ? g : [...splitList(g), scanned].join('\n')))
    }, []),
  )
  if (!v) return null

  const guardianList = splitList(guardians)
  const safeList = splitList(safe)
  const invalid = [...guardianList, ...safeList].some((a) => !isAddress(a))
  const tooMany = guardianList.length > 3 || safeList.length > 5
  const blocked = !!pendingConfig.data

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Change settings" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Notice tone="info">
          Changes wait {formatDuration(v.delaySecs)} before they take effect, and you or a guardian can cancel them. This
          stops anyone forcing a change on the spot.
        </Notice>

        <Card>
          <Text style={styles.cardTitle}>Withdrawal delay</Text>
          <Segmented
            value={DELAY_OPTIONS.some((o) => o.value === delay) ? delay : '172800'}
            onChange={setDelay}
            options={DELAY_OPTIONS}
          />
        </Card>

        <Card>
          <Field
            label="Guardians (up to 3, one per line)"
            value={guardians}
            onChangeText={setGuardians}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Guardian wallet address"
            style={[styles.multi]}
          />
          <PillButton
            title="Scan guardian code"
            icon="scan-outline"
            variant="outline"
            style={{ flex: 0 }}
            onPress={() => router.push('/scan')}
          />
          <Field
            label="Safe addresses (up to 5, one per line)"
            value={safe}
            onChangeText={setSafe}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Your own cold wallet"
            style={[styles.multi]}
          />
        </Card>

        {invalid ? <Notice tone="warning">One of those is not a valid Solana address.</Notice> : null}
        {tooMany ? <Notice tone="warning">Up to 3 guardians and 5 safe addresses.</Notice> : null}
        {blocked ? <Notice tone="warning">A change is already pending. Cancel or apply it in Settings first.</Notice> : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}
      </ScrollView>
      <View style={styles.footer}>
        <PillButton
          title="Propose change"
          icon="time-outline"
          haptic
          loading={busy}
          disabled={invalid || tooMany || blocked}
          style={{ flex: 0, minHeight: 56 }}
          onPress={async () => {
            setBusy(true)
            setError(null)
            try {
              await proposeConfig(v, { delaySecs: Number(delay), guardians: guardianList, safeList })
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              router.back()
            } catch (e) {
              setError(friendlyError(e))
            } finally {
              setBusy(false)
            }
          }}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: space.lg, gap: space.lg },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  multi: { minHeight: 84, textAlignVertical: 'top' },
  footer: { padding: space.lg },
})
