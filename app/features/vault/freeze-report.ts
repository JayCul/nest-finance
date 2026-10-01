// Everything known about why a vault is frozen: the on-chain lockdown event, what it voided, and,
// when the backup PIN was used on this phone, the device state recorded at that moment.

import { Role } from '@/generated/nest-vault'
import type { DuressLogEntry } from '@/features/security/duress'
import type { ActivityItem, PendingItem, VaultInfo } from '@/features/vault/use-vault'
import { shortAddress } from '@/utils/format'

export type FreezeReport = {
  frozen: boolean
  /** Who signed the lockdown, from the program's event. */
  by?: { role: Role; address?: string; label: string; short: string }
  at?: number
  until: number
  lockdownSecs: number
  voided: PendingItem[]
  /** Set when this phone's backup PIN caused the freeze. */
  backupPin?: DuressLogEntry
  /** The viewer is a guardian looking at someone else's savings. */
  asGuardian: boolean
}

export function buildFreezeReport(params: {
  vault: VaultInfo
  events: ActivityItem[]
  pending: PendingItem[]
  duressLog: DuressLogEntry[]
  now: number
  asGuardian: boolean
}): FreezeReport {
  const { vault, events, pending, duressLog, now, asGuardian } = params
  const lock = events.find((e) => e.kind === 'lockdown')
  const role = lock?.role
  const by =
    role == null
      ? undefined
      : {
          role,
          address: lock?.counterparty,
          label:
            role === Role.Sentinel
              ? asGuardian
                ? "the owner's phone (their backup PIN)"
                : 'this phone, because the backup PIN was entered'
              : role === Role.Guardian
                ? asGuardian
                  ? 'a guardian'
                  : `your guardian ${lock?.counterparty ? shortAddress(lock.counterparty) : ''}`.trim()
                : asGuardian
                  ? 'the owner'
                  : 'you',
          short:
            role === Role.Sentinel
              ? 'Backup PIN'
              : role === Role.Guardian
                ? `Guardian${lock?.counterparty ? ` ${shortAddress(lock.counterparty)}` : ''}`
                : asGuardian
                  ? 'Owner'
                  : 'You',
        }
  // Match the on-chain freeze to this phone's backup-PIN record by time (within 10 minutes).
  const backupPin =
    !asGuardian && role === Role.Sentinel && lock
      ? duressLog.find((d) => !d.drill && Math.abs(d.at / 1000 - lock.blockTime) < 600)
      : undefined
  return {
    frozen: vault.lockdownUntil > now,
    by,
    at: lock?.blockTime,
    until: vault.lockdownUntil,
    lockdownSecs: vault.lockdownSecs,
    // Each freeze bumps the epoch, so the requests this freeze voided are the ones from the epoch before it.
    voided: pending.filter((p) => p.voided && p.epoch + 1n === vault.epoch),
    backupPin,
    asGuardian,
  }
}
