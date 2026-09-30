// Everything known about why a vault is frozen: the on-chain lockdown event, what it voided, and,
// when the backup PIN was used on this phone, the device state recorded at that moment.

import { Role } from '@/generated/nest-vault'
import type { DuressLogEntry } from '@/features/security/duress'
import type { ActivityItem, PendingItem, VaultInfo } from '@/features/vault/use-vault'
import { formatSol, shortAddress } from '@/utils/format'

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

export const EXPLAIN_SYSTEM = [
  'You explain a savings freeze in Nest Finance to the person reading. Speak to them directly as "you".',
  'Use only the facts given, in the order given. Do not add times, names, places, amounts or reasons that are not in the facts.',
  'Write 3 short sentences in plain English: what happened, what the freeze did, and its current status.',
  'Then one final line that starts with "What to do:" and restates the suggested next step.',
  'No headings, no lists, no markdown.',
].join(' ')

const clock = (unix: number) => new Date(unix * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

/** The next step, decided here rather than by the model, which only rephrases it. */
function nextStep(r: FreezeReport): string {
  if (r.backupPin || r.by?.role === Role.Sentinel) {
    if (r.asGuardian) return 'check on the owner in a safe way and do not call them; contact local authorities if you think they are in danger.'
    return r.frozen
      ? 'once you are safe, let your emergency contact know you are okay; the freeze ends by itself, or you and a guardian can lift it together.'
      : 'let your emergency contact know you are okay; your savings are unchanged and work normally again.'
  }
  if (r.by?.role === Role.Guardian) {
    return r.asGuardian
      ? 'tell the owner why you froze the savings.'
      : 'ask your guardian why they froze your savings; if it was a mistake, you and a guardian can lift it together.'
  }
  return r.frozen ? 'wait for the freeze to end, or lift it together with a guardian.' : 'nothing, the savings work normally again.'
}

/** Time left in words the model can repeat: "about 9 minutes", "about 2 hours". */
function remaining(secs: number): string {
  if (secs < 90) return 'less than 2 minutes'
  if (secs < 5400) return `about ${Math.round(secs / 60)} minutes`
  if (secs < 172800) return `about ${Math.round(secs / 3600)} hours`
  return `about ${Math.round(secs / 86400)} days`
}

/** The facts the on-device model is given, one per line, only those true right now. */
export function reportFacts(r: FreezeReport, now: number): string {
  const who = r.asGuardian ? 'the owner' : 'you'
  const lines = [
    r.asGuardian ? 'You are a guardian of these savings; they belong to someone else, the owner.' : 'These are your savings.',
    r.by ? `The savings were frozen by ${r.by.label}${r.at ? ` at ${clock(r.at)}` : ''}.` : 'The savings were frozen.',
    r.backupPin
      ? `The backup PIN is an emergency PIN for when someone forces ${who} to open the app. It shows an ordinary wallet while the savings freeze quietly.`
      : undefined,
    r.backupPin
      ? r.backupPin.smsError
        ? 'The emergency text could not be sent.'
        : `The emergency contact was sent a text${r.backupPin.device?.coords ? ' with the location' : ''}.`
      : undefined,
    r.voided.length
      ? `The freeze cancelled ${r.voided.length} pending withdrawal${r.voided.length === 1 ? '' : 's'} (${r.voided.map((p) => formatSol(p.amount)).join(', ')}). No money left the savings.`
      : 'No money left the savings.',
    r.frozen
      ? `They are still frozen for ${remaining(r.until - now)}. Until then nothing can leave the savings, unless the owner and a guardian lift the freeze together.`
      : `The freeze ended at ${clock(r.until)}. The savings work normally again.`,
    `Next step for the reader: ${nextStep(r)}`,
  ]
  return lines.filter(Boolean).join('\n')
}
