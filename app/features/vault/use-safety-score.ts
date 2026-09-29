import { useQuery } from '@tanstack/react-query'
import type { Href } from 'expo-router'
import { loadContacts } from '@/features/security/security-store'
import { useSecurity } from '@/features/security/session'
import { type StipendInfo, useStipend } from '@/features/stipend/use-stipend'
import { useChainNow, useVault, type VaultInfo } from './use-vault'

export type SafetyCheck = {
  key: string
  label: string
  detail: string
  weight: number
  ok: boolean
  fix?: Href
}

const DAY = 86_400

export function computeSafety(input: {
  vault: VaultInfo
  now: number
  pinsEnabled: boolean
  contacts: number
  stipend: StipendInfo | null | undefined
}): { score: number; checks: SafetyCheck[] } {
  const { vault, now, pinsEnabled, contacts, stipend } = input
  const freshGuardians = vault.guardianLastSeen.filter((t) => now - t < 8 * DAY).length
  const weeklyCost = stipend ? stipend.ratePerWeek * BigInt(Math.max(vault.guardians.length, 1)) : 0n
  const checks: SafetyCheck[] = [
    {
      key: 'delay',
      label: 'Withdrawals wait at least 24 hours',
      detail: 'Long enough for you or a guardian to notice and cancel.',
      weight: 20,
      ok: vault.delaySecs >= DAY,
      fix: '/settings-edit',
    },
    {
      key: 'guardian',
      label: 'At least one guardian',
      detail: 'Someone who can cancel a withdrawal if you cannot.',
      weight: 20,
      ok: vault.guardians.length > 0,
      fix: '/settings-edit',
    },
    {
      key: 'pin',
      label: 'Backup PIN set up',
      detail: 'Opens a simple wallet view and freezes savings silently.',
      weight: 15,
      ok: pinsEnabled,
      fix: '/security-setup',
    },
    {
      key: 'contact',
      label: 'Emergency contact for alerts',
      detail: 'Gets a text with your location if the backup PIN is used.',
      weight: 10,
      ok: contacts > 0,
      fix: '/security-setup',
    },
    {
      key: 'checkins',
      label: 'Guardians checked in this week',
      detail: 'A guardian who has gone quiet may not see an alert in time.',
      weight: 15,
      ok: vault.guardians.length > 0 && freshGuardians === vault.guardians.length,
      fix: '/guardians',
    },
    {
      key: 'safe',
      label: 'A safe address for emergencies',
      detail: 'Lets you move savings instantly to a wallet only you control.',
      weight: 10,
      ok: vault.safeList.length > 0,
      fix: '/settings-edit',
    },
    {
      key: 'rewards',
      label: 'Guardian rewards funded for 2+ weeks',
      detail: 'Guardians collect SKR when they check in, which keeps them reachable.',
      weight: 10,
      ok: !!stipend && weeklyCost > 0n && stipend.balance >= weeklyCost * 2n,
      fix: '/guardians',
    },
  ]
  const score = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0)
  return { score, checks }
}

export function useSafetyScore() {
  const vault = useVault()
  const now = useChainNow()
  const { pinsEnabled } = useSecurity()
  const stipend = useStipend(vault.data?.address)
  const contacts = useQuery({ queryKey: ['emergency-contacts'], queryFn: loadContacts })
  if (!vault.data) return null
  return computeSafety({
    vault: vault.data,
    now,
    pinsEnabled,
    contacts: contacts.data?.length ?? 0,
    stipend: stipend.data,
  })
}
