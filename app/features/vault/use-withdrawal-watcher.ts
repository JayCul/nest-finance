import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useEffect, useRef } from 'react'
import { formatSol, shortAddress } from '@/utils/format'
import { isLocalWithdrawal } from './local-withdrawals'
import { usePendingWithdrawals } from './use-vault'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/**
 * Raises a "Was this you?" notification when a withdrawal appears that this phone did not
 * request. That is what a drainer signature or a coerced request looks like from here.
 * Runs while the app is open; background delivery comes with guardian push in Phase 4.
 */
export function useWithdrawalWatcher() {
  const pending = usePendingWithdrawals()
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => {})
    Notifications.setNotificationChannelAsync('withdrawals', {
      name: 'Withdrawal alerts',
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => {})
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const address = response.notification.request.content.data?.address
      if (typeof address === 'string') router.push({ pathname: '/withdrawal/[address]', params: { address } })
    })
    return () => sub.remove()
  }, [])

  useEffect(() => {
    if (!pending.data) return
    const live = pending.data.filter((p) => !p.voided)
    // First load: remember what already exists, alert only on what shows up later.
    if (seen.current === null) {
      seen.current = new Set(live.map((p) => p.address))
      return
    }
    for (const p of live) {
      if (seen.current.has(p.address)) continue
      seen.current.add(p.address)
      if (isLocalWithdrawal(p.address)) continue
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Withdrawal requested',
          body: `${formatSol(p.amount)} to ${shortAddress(p.destination)}. Was this you? Tap to review or cancel.`,
          data: { address: p.address },
        },
        trigger: { channelId: 'withdrawals' },
      }).catch(() => {})
    }
  }, [pending.data])
}
