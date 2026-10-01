// "What if…?" security simulator. Each scenario is played against the user's real configuration
// in code; the outcome, the exposure and the gaps come from here. The AI only narrates.

import type { Href } from 'expo-router'
import type { StipendInfo } from '@/features/stipend/use-stipend'
import type { VaultInfo } from '@/features/vault/use-vault'
import { formatSol } from '@/utils/format'
import { humanDuration } from './withdrawal-risk'

export type Outcome = 'protected' | 'attention' | 'exposed'
export type Step = { text: string; ok: boolean }
export type Gap = { text: string; fix?: Href }
export type Scenario = {
  id: string
  question: string
  outcome: Outcome
  /** What could be lost in this scenario. */
  exposure: string
  steps: Step[]
  gaps: Gap[]
}

export type SimInput = {
  vault: VaultInfo
  spendingLamports: bigint
  pinsEnabled: boolean
  contacts: number
  stipend?: StipendInfo | null
  now: number
}

const DAY = 86400

export function runScenarios(c: SimInput): Scenario[] {
  const v = c.vault
  const delay = humanDuration(v.delaySecs)
  const savings = formatSol(v.available)
  const spending = formatSol(c.spendingLamports)
  const guardians = v.guardians.length
  const longDelay = v.delaySecs >= DAY
  const activeGuardians = v.guardianLastSeen.filter((t) => t > 0 && c.now - t < 8 * DAY).length
  const delayGap: Gap = { text: `The delay is only ${delay}. Real savings should wait 24 hours or more, so there is time to notice.`, fix: '/settings-edit' }
  const guardianGap: Gap = { text: 'No guardian: nobody else is watching for withdrawals.', fix: '/settings-edit' }

  const scenarios: Scenario[] = []

  // 1. Forced to unlock (wrench attack).
  {
    const steps: Step[] = [
      { text: 'Someone forces you to open Nest', ok: true },
      c.pinsEnabled
        ? { text: 'You enter your backup PIN: an ordinary wallet opens', ok: true }
        : { text: 'No backup PIN is set up, so you must open the real app', ok: false },
      c.pinsEnabled ? { text: "Savings freeze on-chain, signed by this phone's key, with no prompt", ok: true } : { text: `They can request a withdrawal, which waits ${delay}`, ok: longDelay },
      c.contacts > 0 ? { text: `Your emergency contact${c.contacts > 1 ? 's get' : ' gets'} a text with your location`, ok: true } : { text: 'Nobody is texted: no emergency contact', ok: false },
      { text: `Savings stay locked; at most your spending wallet (${spending}) can be taken`, ok: true },
    ]
    const gaps: Gap[] = []
    if (!c.pinsEnabled) gaps.push({ text: 'Set up a backup PIN so a forced unlock shows nothing worth taking.', fix: '/security-setup' })
    if (c.contacts === 0) gaps.push({ text: 'Add an emergency contact so someone knows you may not be safe.', fix: '/security-setup' })
    if (!c.pinsEnabled && !longDelay) gaps.push(delayGap)
    scenarios.push({
      id: 'forced-unlock',
      question: 'What if someone forces me to unlock my phone?',
      outcome: c.pinsEnabled && c.contacts > 0 ? 'protected' : c.pinsEnabled || longDelay ? 'attention' : 'exposed',
      exposure: c.pinsEnabled ? `Spending wallet only (${spending})` : `Spending wallet now (${spending}); savings only if nobody cancels within ${delay}`,
      steps,
      gaps,
    })
  }

  // 2. Seed phrase or owner key stolen (remote attacker).
  {
    const watched = guardians > 0
    const steps: Step[] = [
      { text: 'An attacker gets your wallet key', ok: true },
      { text: `They request a withdrawal: it must wait ${delay}`, ok: longDelay },
      { text: 'They cannot skip the wait: instant withdrawals only go to your own safe addresses, not theirs', ok: true },
      watched ? { text: `Your guardian is alerted and can cancel it`, ok: true } : { text: 'Only you are alerted; nobody else can cancel', ok: false },
      { text: 'Adding their address to the safe list also waits the delay, and can be cancelled', ok: longDelay },
    ]
    const gaps: Gap[] = []
    if (!longDelay) gaps.push(delayGap)
    if (!watched) gaps.push(guardianGap)
    scenarios.push({
      id: 'key-stolen',
      question: 'What if someone steals my wallet key or seed phrase?',
      outcome: longDelay && watched ? 'protected' : longDelay || watched ? 'attention' : 'exposed',
      exposure: longDelay && watched ? 'Nothing, as long as you or your guardian cancel in time' : `Savings (${savings}) if nobody cancels within ${delay}`,
      steps,
      gaps,
    })
  }

  // 3. Malicious signature (drainer).
  scenarios.push({
    id: 'drainer',
    question: 'What if I sign a malicious transaction?',
    outcome: longDelay ? (guardians > 0 ? 'protected' : 'attention') : 'attention',
    exposure: longDelay ? 'Nothing from savings: a signature can only queue a delayed withdrawal' : `Savings could leave after ${delay} if nobody notices`,
    steps: [
      { text: 'A drainer gets you to approve a withdrawal request', ok: true },
      { text: 'The request is queued, not paid, and its destination is fixed', ok: true },
      { text: 'Your phone shows a "Was this you?" alert with a risk score', ok: true },
      { text: `You or your guardian cancel it within ${delay}`, ok: longDelay },
    ],
    gaps: longDelay ? (guardians > 0 ? [] : [guardianGap]) : [delayGap],
  })

  // 4. Phone lost or stolen.
  scenarios.push({
    id: 'phone-lost',
    question: 'What if I lose my phone?',
    outcome: 'protected',
    exposure: 'Nothing from savings',
    steps: [
      { text: 'The finder cannot open Nest without your PIN', ok: c.pinsEnabled },
      { text: 'The key on the phone can only freeze or cancel, never move money', ok: true },
      { text: 'Your wallet key stays in Seed Vault or your wallet app, restorable from your seed phrase', ok: true },
      guardians > 0 ? { text: 'Your guardian can freeze the savings if you ask', ok: true } : { text: 'With no guardian, nobody else can freeze for you', ok: false },
    ],
    gaps: guardians > 0 ? [] : [guardianGap],
  })

  // 5. Guardian unreachable.
  {
    const ok = activeGuardians >= 1 && guardians >= 2
    scenarios.push({
      id: 'guardian-unreachable',
      question: 'What if my guardian loses their phone or goes quiet?',
      outcome: guardians === 0 ? 'attention' : ok ? 'protected' : 'attention',
      exposure: 'Nothing directly; you lose a second pair of eyes',
      steps: [
        guardians === 0 ? { text: 'You have no guardian yet', ok: false } : { text: `${activeGuardians} of ${guardians} guardian${guardians > 1 ? 's have' : ' has'} checked in this week`, ok: activeGuardians > 0 },
        { text: 'Withdrawals still wait the delay; you can still cancel them yourself', ok: true },
        { text: 'Replacing a guardian waits the delay, like any settings change', ok: true },
        guardians >= 2 ? { text: 'Another guardian still covers you', ok: true } : { text: 'With one guardian, nobody else covers you meanwhile', ok: false },
        { text: c.stipend ? 'SKR rewards keep guardians checking in weekly' : 'No SKR rewards to encourage weekly check-ins', ok: !!c.stipend },
      ],
      gaps: [
        ...(guardians < 2 ? [{ text: 'Add a second guardian so one going quiet does not leave you alone.', fix: '/settings-edit' as Href }] : []),
        ...(!c.stipend && guardians > 0 ? [{ text: 'Fund guardian rewards so guardians keep checking in.', fix: '/guardians' as Href }] : []),
      ],
    })
  }

  // 6. Guardian turns against you.
  scenarios.push({
    id: 'guardian-malicious',
    question: 'What if a guardian turns against me?',
    outcome: 'protected',
    exposure: 'Nothing: a guardian can never move funds',
    steps: [
      { text: 'A guardian can cancel withdrawals or freeze the savings', ok: true },
      { text: 'A guardian can never move money on their own', ok: true },
      { text: `A freeze lasts ${humanDuration(v.lockdownSecs)}; lifting it early needs you and a guardian together`, ok: true },
      { text: 'You can replace them; the change waits the delay', ok: true },
    ],
    gaps: [],
  })

  // 7. Attacker changes settings.
  scenarios.push({
    id: 'settings-attack',
    question: 'What if someone tries to change my settings?',
    outcome: longDelay ? 'protected' : 'attention',
    exposure: longDelay ? 'Nothing, if the change is cancelled in time' : `Settings could change after ${delay}`,
    steps: [
      { text: 'They propose adding their address to your safe list, or a shorter delay', ok: true },
      { text: `The change waits ${delay} before it can apply`, ok: longDelay },
      { text: 'You or a guardian can cancel it until then', ok: true },
      { text: 'A freeze cancels pending changes too', ok: true },
    ],
    gaps: longDelay ? [] : [delayGap],
  })

  return scenarios
}

export function summarise(s: Scenario[]) {
  return {
    protected: s.filter((x) => x.outcome === 'protected').length,
    attention: s.filter((x) => x.outcome !== 'protected').length,
  }
}

/** Facts for the AI about one scenario. */
export function scenarioFacts(s: Scenario): string {
  return [
    `Question: ${s.question}`,
    `Outcome (decided by the app): ${s.outcome === 'protected' ? 'protected' : s.outcome === 'attention' ? 'needs attention' : 'exposed'}.`,
    `What could be lost: ${s.exposure}.`,
    `What happens, in order: ${s.steps.map((x, i) => `${i + 1}) ${x.text}${x.ok ? '' : ' [weak point]'}`).join('; ')}.`,
    s.gaps.length ? `What to fix (decided by the app): ${s.gaps.map((g) => g.text).join(' ')}` : 'Nothing to fix for this scenario.',
  ].join('\n')
}

/** Facts for the AI about the whole configuration, for free-form "what if" questions. */
export function configFacts(c: SimInput, scenarios: Scenario[]): string {
  const v = c.vault
  return [
    `Savings in the vault: ${formatSol(v.available)}. Spending wallet: ${formatSol(c.spendingLamports)}.`,
    `Withdrawal delay: ${humanDuration(v.delaySecs)}. A freeze lasts ${humanDuration(v.lockdownSecs)}.`,
    `Guardians: ${v.guardians.length}. Safe addresses: ${v.safeList.length}. Backup PIN: ${c.pinsEnabled ? 'set up' : 'not set up'}. Emergency contacts: ${c.contacts}. SKR guardian rewards: ${c.stipend ? 'funded' : 'not set up'}.`,
    `Currently frozen: ${v.lockdownUntil > c.now ? 'yes' : 'no'}.`,
    'Rules the program enforces: every withdrawal waits the delay and the owner or a guardian can cancel it; instant withdrawals only go to safe addresses; settings changes wait the delay; a freeze voids pending withdrawals and lifting it early needs owner and guardian together; guardians and the phone key can never move money; the backup PIN shows an ordinary wallet, freezes savings and texts emergency contacts.',
    'Scenario results computed by the app:',
    ...scenarios.map((s) => `- ${s.question} ${s.outcome === 'protected' ? 'Protected' : 'Needs attention'}. Could lose: ${s.exposure}.${s.gaps.length ? ` Fix: ${s.gaps.map((g) => g.text).join(' ')}` : ''}`),
  ].join('\n')
}
