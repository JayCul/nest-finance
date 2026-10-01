// Risk scoring for a withdrawal, computed in code from on-chain state. The AI only words the
// briefing; the score, the signals and the recommended action come from here.

import type { Address } from '@solana/kit'
import type { ActivityItem } from '@/features/vault/use-vault'
import { formatSol, shortAddress } from '@/utils/format'

export type RiskLevel = 'low' | 'medium' | 'high'
export type RiskSignal = { key: string; label: string; detail: string; points: number }
export type WithdrawalRisk = {
  score: number
  level: RiskLevel
  signals: RiskSignal[]
  /** The next step, chosen here, for the person looking at it. */
  action: string
}

export type WithdrawalInput = {
  amount: bigint
  destination: Address
  /** Unix seconds; omit for a withdrawal that is being drafted. */
  requestedAt?: number
  /** Spendable savings, before this withdrawal leaves. */
  available: bigint
  safeList: Address[]
  /** The vault owner's own wallet. */
  ownerWallet: Address
  /** Recent vault events, newest first, as the app reads them. */
  history: ActivityItem[]
  /** Other live requests on the vault, with their request time. */
  otherPending: { amount: bigint; requestedAt: number }[]
  /** True when this phone made the request; undefined when that cannot be known here. */
  fromThisPhone?: boolean
  viewer: 'owner' | 'guardian'
  now: number
}

const HOUR = 3600

export function assessWithdrawal(w: WithdrawalInput): WithdrawalRisk {
  const signals: RiskSignal[] = []
  const add = (key: string, points: number, label: string, detail: string) => signals.push({ key, points, label, detail })

  const safe = w.safeList.includes(w.destination)
  // A destination counts as familiar only if it was used at least a day before this request, so
  // an attacker repeating requests to their own address cannot make it look trusted.
  const at0 = w.requestedAt ?? w.now
  const pastDestinations = new Set(
    w.history
      .filter((e) => e.kind === 'withdrawal-requested' || e.kind === 'instant-withdrawal')
      .filter((e) => e.blockTime < at0 - 24 * HOUR)
      .map((e) => e.counterparty),
  )
  if (w.destination === w.ownerWallet) {
    add('own-wallet', -20, "The owner's own wallet", `${shortAddress(w.destination)} is the wallet that owns these savings.`)
  } else if (safe) {
    add('safe-address', -20, 'Your own safe address', `${shortAddress(w.destination)} is on the safe list the owner set up.`)
  } else if (!pastDestinations.has(w.destination)) {
    add('new-destination', 30, 'New destination', `${shortAddress(w.destination)} has not been used by these savings before today.`)
  }

  const share = w.available > 0n ? Number(w.amount) / Number(w.available) : 1
  if (share >= 0.8) add('most-of-savings', 30, 'Most of the savings', `${Math.round(share * 100)}% of what is in the vault.`)
  else if (share >= 0.5) add('half-of-savings', 20, 'Half or more of the savings', `${Math.round(share * 100)}% of what is in the vault.`)
  else if (share >= 0.25) add('large-share', 10, 'A large share', `${Math.round(share * 100)}% of what is in the vault.`)

  const pastAmounts = w.history
    .filter((e) => (e.kind === 'withdrawal-requested' || e.kind === 'instant-withdrawal') && e.amount != null)
    .filter((e) => (w.requestedAt == null ? true : e.blockTime < w.requestedAt - 60))
    .map((e) => e.amount!)
  const largest = pastAmounts.reduce((m, a) => (a > m ? a : m), 0n)
  if (pastAmounts.length >= 2 && w.amount > largest * 3n) {
    add('unusually-large', 15, 'Unusually large', `More than three times the largest recent withdrawal (${formatSol(largest)}).`)
  }

  const at = w.requestedAt ?? w.now
  const burst = w.otherPending.filter((p) => Math.abs(p.requestedAt - at) < HOUR).length
  if (burst >= 2) add('burst', 15, 'Several requests at once', `${burst + 1} withdrawals requested within an hour.`)

  const recentFreeze = w.history.find((e) => (e.kind === 'lockdown' || e.kind === 'lockdown-lifted') && at - e.blockTime < 24 * HOUR)
  if (recentFreeze) {
    add('after-freeze', 10, 'Right after a freeze', 'The savings were frozen or unfrozen in the last 24 hours.')
  }

  if (w.fromThisPhone === false) {
    add('other-device', 25, 'Not requested from this phone', "The owner's app on this phone did not make this request.")
  }

  const score = Math.max(0, Math.min(100, signals.reduce((s, x) => s + x.points, 0)))
  const level: RiskLevel = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low'
  return { score, level, signals: signals.sort((a, b) => b.points - a.points), action: actionFor(level, w.viewer, w.requestedAt == null) }
}

function actionFor(level: RiskLevel, viewer: 'owner' | 'guardian', drafting: boolean): string {
  if (drafting) {
    if (level === 'high') return 'Check the address character by character before you request this. A new address taking most of the savings is how drainers work.'
    if (level === 'medium') return 'Make sure you recognise the destination. You can still cancel during the protection window.'
    return 'Looks routine. It waits the protection window, and you can cancel until then.'
  }
  if (viewer === 'guardian') {
    if (level === 'high') return 'Confirm with the owner through a channel you trust before it unlocks. If you cannot, cancel it: cancelling moves no money.'
    if (level === 'medium') return 'Check with the owner before it unlocks. Cancel it if they did not ask for it.'
    return 'Looks routine. No action needed unless the owner says it was not them.'
  }
  if (level === 'high') return 'If you did not request this, cancel it now and freeze your savings.'
  if (level === 'medium') return 'Make sure this was you. Cancel it if not.'
  return 'Looks routine. You can cancel until it unlocks.'
}

/** One line per fact, for the AI. Short addresses only. */
export function riskFacts(r: WithdrawalRisk, w: { amount: bigint; unlockAt?: number; now: number; viewer: 'owner' | 'guardian' }): string {
  return [
    `Reader: ${w.viewer === 'guardian' ? 'a guardian of these savings (not the owner)' : 'the owner'}.`,
    `Withdrawal: ${formatSol(w.amount)}.`,
    w.unlockAt
      ? w.unlockAt <= w.now
        ? 'Its protection window has ended, so anyone can now complete it to the stored destination; it can still be cancelled until someone does.'
        : `It unlocks in ${timeBucket(w.unlockAt - w.now)} and can be cancelled until then; cancelling moves no money.` : 'It has not been requested yet; once requested it waits the protection window and can be cancelled until then.',
    `Risk score (computed by the app): ${r.score}/100, ${r.level}.`,
    r.signals.length ? `Signals: ${r.signals.map((s) => `${s.label} (${s.detail})`).join('; ')}.` : 'Signals: none.',
    `Recommended action (decided by the app): ${r.action}`,
  ].join('\n')
}

/** Coarse, so the facts (and the cached AI wording) stay the same while a countdown ticks. */
function timeBucket(secs: number): string {
  if (secs < 3600) return 'less than an hour'
  if (secs < 172800) return `about ${Math.round(secs / 3600)} hours`
  return `about ${Math.round(secs / 86400)} days`
}

export function humanDuration(secs: number): string {
  if (secs <= 0) return 'no time (it can complete now)'
  if (secs < 90) return 'about a minute'
  if (secs < 5400) return `about ${Math.round(secs / 60)} minutes`
  if (secs < 172800) return `about ${Math.round(secs / 3600)} hours`
  return `about ${Math.round(secs / 86400)} days`
}
