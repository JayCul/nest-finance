import * as Haptics from 'expo-haptics'
import * as Location from 'expo-location'
import { router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { PermissionsAndroid, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PinPad } from '@/components/pin-pad'
import { Card, Field, IconCircle, type IconName, InfoRow, Notice, PillButton, ScreenHeader } from '@/components/ui'
import { colors, fonts, space } from '@/constants/theme'
import { friendlyError } from '@/features/errors'
import { type GuardianContact, loadContacts, saveContacts, savePins } from '@/features/security/security-store'
import { useSecurity } from '@/features/security/session'
import { NestSms } from '@/modules/nest-sms'

type Step = 'intro' | 'pin' | 'pinConfirm' | 'backup' | 'backupConfirm' | 'contacts' | 'done'

const POINTS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'keypad-outline', title: 'Your PIN', body: 'Opens Nest Finance as usual.' },
  {
    icon: 'shield-half-outline',
    title: 'Your backup PIN',
    body: 'Opens a simple view with only your main wallet. Behind the scenes your savings freeze and your emergency contact gets a text with your location.',
  },
  { icon: 'eye-off-outline', title: 'Nothing looks different', body: 'Both PINs open the same app in the same way.' },
]

export default function SecuritySetupScreen() {
  const { refresh, startDrill } = useSecurity()
  const [step, setStep] = useState<Step>('intro')
  const [pin, setPin] = useState('')
  const [backup, setBackup] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [smsOk, setSmsOk] = useState(false)
  const [locationOk, setLocationOk] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadContacts().then((c) => {
      if (c[0]) {
        setName(c[0].name)
        setPhone(c[0].phone)
      }
    })
    setSmsOk(NestSms.canSend())
    Location.getForegroundPermissionsAsync().then((p) => setLocationOk(p.status === 'granted'))
  }, [])

  const requestPermissions = async () => {
    const sms = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS)
    setSmsOk(sms === PermissionsAndroid.RESULTS.GRANTED)
    const loc = await Location.requestForegroundPermissionsAsync()
    setLocationOk(loc.status === 'granted')
    // Ask Android to switch on accurate location now, while it's safe to show a dialog.
    // The backup-PIN path never shows one.
    if (loc.status === 'granted') await Location.enableNetworkProviderAsync().catch(() => {})
  }

  const finish = async () => {
    setBusy(true)
    setError(null)
    try {
      await savePins(pin, backup)
      const contacts: GuardianContact[] = phone.trim() ? [{ name: name.trim() || 'Emergency contact', phone: phone.trim() }] : []
      await saveContacts(contacts)
      await refresh()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setStep('done')
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  if (step === 'pin' || step === 'pinConfirm' || step === 'backup' || step === 'backupConfirm') {
    const copy = {
      pin: { title: 'Create your PIN', subtitle: 'You will use this to open Nest Finance.' },
      pinConfirm: { title: 'Confirm your PIN', subtitle: 'Enter it once more.' },
      backup: { title: 'Create a backup PIN', subtitle: 'A different PIN for when you cannot safely open your savings.' },
      backupConfirm: { title: 'Confirm your backup PIN', subtitle: 'Enter it once more.' },
    }[step]
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title="Quick Security Setup" />
        <View style={styles.padWrap}>
          <PinPad
            key={step}
            title={copy.title}
            subtitle={copy.subtitle}
            error={error}
            onComplete={(value) => {
              setError(null)
              if (step === 'pin') {
                setPin(value)
                setStep('pinConfirm')
                return true
              }
              if (step === 'pinConfirm') {
                if (value !== pin) return setError('PINs did not match. Try again.'), false
                setStep('backup')
                return true
              }
              if (step === 'backup') {
                if (value === pin) return setError('Use a different PIN from your main one.'), false
                setBackup(value)
                setStep('backupConfirm')
                return true
              }
              if (value !== backup) return setError('PINs did not match. Try again.'), false
              setStep('contacts')
              return true
            }}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Quick Security Setup" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {step === 'intro' ? (
          <>
            <Text style={styles.title}>Two PINs, one app</Text>
            <Text style={styles.lead}>Set up a second way in, for moments when you cannot say no.</Text>
            <Card>
              {POINTS.map((p) => (
                <View key={p.title} style={styles.point}>
                  <IconCircle name={p.icon} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pointTitle}>{p.title}</Text>
                    <Text style={styles.pointBody}>{p.body}</Text>
                  </View>
                </View>
              ))}
            </Card>
            <Notice tone="info">If you ever use the backup PIN, hand over what the app shows and let the moment pass. Your savings stay locked on-chain.</Notice>
          </>
        ) : null}

        {step === 'contacts' ? (
          <>
            <Text style={styles.title}>Emergency contact</Text>
            <Text style={styles.lead}>When the backup PIN is used, this person gets a text with your location. Use someone who will act calmly.</Text>
            <Card>
              <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Ada" />
              <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="+234 800 000 0000" keyboardType="phone-pad" />
            </Card>
            <Card>
              <InfoRow label="Send texts" value={smsOk ? 'Allowed' : 'Not allowed'} valueColor={smsOk ? colors.success : colors.warning} />
              <InfoRow label="Share location" value={locationOk ? 'Allowed' : 'Not allowed'} valueColor={locationOk ? colors.success : colors.warning} />
              {!smsOk || !locationOk ? (
                <PillButton title="Allow texts and location" variant="outline" style={{ flex: 0 }} onPress={requestPermissions} />
              ) : null}
            </Card>
            {error ? <Notice tone="danger">{error}</Notice> : null}
          </>
        ) : null}

        {step === 'done' ? (
          <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
            <IconCircle name="shield-checkmark" size={60} />
            <Text style={styles.doneTitle}>You're set</Text>
            <Text style={styles.pointBody}>Try the backup PIN once in practice mode. Nothing is frozen and your contact gets a text marked as practice.</Text>
          </Card>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step === 'intro' ? <PillButton title="Start" style={{ flex: 0, minHeight: 56 }} onPress={() => setStep('pin')} /> : null}
        {step === 'contacts' ? (
          <PillButton title="Finish setup" haptic loading={busy} style={{ flex: 0, minHeight: 56 }} onPress={finish} />
        ) : null}
        {step === 'done' ? (
          <>
            <PillButton title="Practice now" icon="play-outline" style={{ flex: 0, minHeight: 56 }} onPress={() => startDrill()} />
            <PillButton title="Done" variant="outline" style={{ flex: 0 }} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  padWrap: { flex: 1, justifyContent: 'center', paddingBottom: space.xxl },
  body: { padding: space.lg, gap: space.lg },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  lead: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.textSecondary, lineHeight: 20 },
  point: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: 4 },
  pointTitle: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.text },
  pointBody: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18, marginTop: 2, textAlign: 'left' },
  doneTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text, marginTop: space.sm },
  footer: { padding: space.lg, gap: space.sm },
})
