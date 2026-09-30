import { useMobileWallet } from '@wallet-ui/react-native-kit'
import * as Clipboard from 'expo-clipboard'
import * as Linking from 'expo-linking'
import React, { useEffect, useRef } from 'react'
import { Alert, AppState, Platform, StyleSheet, Text, ToastAndroid } from 'react-native'
import { Card, PillButton } from '@/components/ui'
import { AppConfig } from '@/constants/app-config'
import { colors, fonts } from '@/constants/theme'
import { useWalletBalance } from '@/features/vault/use-vault'

/**
 * Devnet only. When the wallet is short of SOL, copies its address, says so, and opens the public
 * faucet so the address can be pasted there. The balance refreshes when the app comes back.
 */
export function TestSolCard() {
  const { account } = useMobileWallet()
  const wallet = useWalletBalance()
  const awaitingReturn = useRef(false)

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && awaitingReturn.current) {
        awaitingReturn.current = false
        wallet.refetch()
      }
    })
    return () => sub.remove()
  }, [wallet])

  if (!AppConfig.isDevnet || !account || wallet.data === undefined || wallet.data >= AppConfig.lowSolLamports) return null

  async function openFaucet() {
    await Clipboard.setStringAsync(account!.address)
    const message = 'Wallet address copied. Paste it on the faucet page, then come back.'
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.LONG)
    else Alert.alert('Address copied', message)
    awaitingReturn.current = true
    // Give the toast a moment on screen before the browser takes over.
    setTimeout(() => Linking.openURL(AppConfig.faucetUrl), 900)
  }

  return (
    <Card>
      <Text style={styles.title}>Get free test SOL</Text>
      <Text style={styles.body}>
        Nest Finance runs on Solana devnet for now, so everything uses test SOL with no real value. About 0.05 SOL
        is enough to create protected savings and try every feature.
      </Text>
      <PillButton title="Copy address and open faucet" icon="water-outline" style={{ flex: 0 }} onPress={openFaucet} />
    </Card>
  )
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  body: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
})
