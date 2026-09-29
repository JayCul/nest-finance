import { useQuery } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import * as Notifications from 'expo-notifications'
import { useEffect, useRef } from 'react'
import { Role } from '@/generated/nest-vault'
import { fetchPendingWithdrawals, fetchVaultEvents } from '@/features/vault/use-vault'
import { formatSol, shortAddress } from '@/utils/format'
import { useGuardedVaults } from './use-guardian'

/**
 * Alerts a guardian about vaults they protect: new withdrawal requests (so they can cancel
 * inside the window) and freezes. A freeze triggered by the owner's phone sentinel means
 * the backup PIN was used, and the alert says so.
 */
export function useGuardianWatcher(enabled: boolean) {
  const { client } = useMobileWallet()
  const vaults = useGuardedVaults()
  const seenPending = useRef<Set<string> | null>(null)
  const seenEpochs = useRef<Map<string, bigint> | null>(null)

  const snapshot = useQuery({
    queryKey: ['guardian-watch', vaults.data?.map((v) => `${v.address}:${v.epoch}`).join(',')],
    enabled: enabled && !!vaults.data?.length,
    refetchInterval: 15_000,
    queryFn: async () =>
      Promise.all(
        vaults.data!.map(async (v) => ({ vault: v, pending: await fetchPendingWithdrawals(client.rpc, v.address, v.epoch) })),
      ),
  })

  useEffect(() => {
    Notifications.setNotificationChannelAsync('guardian', {
      name: 'People you protect',
      importance: Notifications.AndroidImportance.MAX,
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!enabled || !snapshot.data) return
    const firstRun = seenPending.current === null
    seenPending.current ??= new Set()
    seenEpochs.current ??= new Map()

    for (const { vault, pending } of snapshot.data) {
      const who = shortAddress(vault.owner)

      const prevEpoch = seenEpochs.current.get(vault.address)
      seenEpochs.current.set(vault.address, vault.epoch)
      if (!firstRun && prevEpoch !== undefined && vault.epoch > prevEpoch && vault.lockdownUntil > Date.now() / 1000) {
        fetchVaultEvents(client.rpc, vault.address, 5)
          .then((events) => {
            const lock = events.find((e) => e.kind === 'lockdown')
            const backupPin = lock?.role === Role.Sentinel
            return notify(
              backupPin ? 'Emergency: backup PIN used' : 'Savings frozen',
              backupPin
                ? `${who} opened their wallet with their emergency PIN. They may not be safe. Their savings are frozen. Do not call them.`
                : `Savings you protect for ${who} were frozen.`,
              vault.address,
            )
          })
          .catch(() => {})
      }

      for (const p of pending) {
        if (p.voided || seenPending.current.has(p.address)) continue
        seenPending.current.add(p.address)
        if (firstRun) continue
        notify(
          'Withdrawal requested',
          `${formatSol(p.amount)} from savings you protect for ${who}. If they didn't ask for this, cancel it.`,
          vault.address,
        )
      }
    }
  }, [snapshot.data, enabled, client.rpc])
}

function notify(title: string, body: string, vault: string) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data: { guardedVault: vault } },
    trigger: { channelId: 'guardian' },
  }).catch(() => {})
}
