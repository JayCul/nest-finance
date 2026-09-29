import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useEffect } from 'react'

/** Opens the right screen when an alert is tapped. Mounted once at the app root. */
export function useNotificationRouting(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data
      if (typeof data?.address === 'string') router.push({ pathname: '/withdrawal/[address]', params: { address: data.address } })
      if (typeof data?.guardedVault === 'string')
        router.push({ pathname: '/guarded/[vault]', params: { vault: data.guardedVault } })
    })
    return () => sub.remove()
  }, [enabled])
}
