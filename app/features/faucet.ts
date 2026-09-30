// Devnet faucets are websites: the app copies the wallet address, says so, and opens the page.

import * as Clipboard from 'expo-clipboard'
import * as Linking from 'expo-linking'
import { useEffect, useRef } from 'react'
import { Alert, AppState, Platform, ToastAndroid } from 'react-native'

/** Returns an opener; `onReturn` runs when the app comes back to the foreground afterwards. */
export function useFaucet(onReturn: () => void) {
  const awaitingReturn = useRef(false)
  const latest = useRef(onReturn)
  latest.current = onReturn

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && awaitingReturn.current) {
        awaitingReturn.current = false
        latest.current()
      }
    })
    return () => sub.remove()
  }, [])

  return async (address: string, url: string, message: string) => {
    await Clipboard.setStringAsync(address)
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.LONG)
    else Alert.alert('Address copied', message)
    awaitingReturn.current = true
    // Give the toast a moment on screen before the browser takes over.
    setTimeout(() => Linking.openURL(url), 900)
  }
}
