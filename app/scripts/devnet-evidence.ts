// Writes docs/devnet-evidence.md: every Nest Finance event on the demo vaults, read from devnet
// and decoded with the generated client, each linked to its transaction on the explorer.
// Run: npx tsx scripts/devnet-evidence.ts

import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { address, type Address, createSolanaRpc, getBase64Encoder, type Signature } from '@solana/kit'
import {
  identifyNestVaultEvent,
  NestVaultEvent,
  parseConfigAppliedEvent,
  parseConfigCancelledEvent,
  parseConfigProposedEvent,
  parseDepositedEvent,
  parseGuardianCheckedInEvent,
  parseInstantWithdrawalEvent,
  parseLockdownLiftedEvent,
  parseLockdownTriggeredEvent,
  parseStipendClaimedEvent,
  parseStipendFundedEvent,
  parseStipendSetupEvent,
  parseVaultCreatedEvent,
  parseWithdrawalCancelledEvent,
  parseWithdrawalExecutedEvent,
  parseWithdrawalRequestedEvent,
  Role,
} from '../generated/nest-vault'

const rpc = createSolanaRpc('https://api.devnet.solana.com')
const PROGRAM = 'EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ'
const VAULTS: { label: string; vault: Address; owner: string }[] = [
  { label: 'Demo owner (the video)', vault: address('CCYNF26y9AfyxZ5D1azdw31D1HzrGKtnEpbKHsDLjXJa'), owner: 'HGqR25WMRx2hnLFstth6JGdb6TK3cXmxFsZGuhjobHR3' },
  { label: 'Judge-style test wallet (fresh wallet, faucet funded)', vault: address('BDH7qXJKCg9bfwkDPzNba6hcTbbxb74r5XZHyK7WFtvR'), owner: 'BmNSTgy4NkoMvt573tvEeRsecWbzUCMhU7WD8vFAwHmV' },
]

const role = (r: Role) => (r === Role.Owner ? 'owner' : r === Role.Guardian ? 'guardian' : 'sentinel (backup PIN)')
const sol = (l: bigint) => `${(Number(l) / 1e9).toLocaleString('en-US', { maximumFractionDigits: 4 })} SOL`
const units = (a: bigint) => (Number(a) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 })
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`
const tx = (s: string) => `[${short(s)}](https://explorer.solana.com/tx/${s}?cluster=devnet)`
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function describe(data: Uint8Array): { what: string; detail: string } | null {
  let kind: NestVaultEvent
  try {
    kind = identifyNestVaultEvent(data)
  } catch {
    return null
  }
  switch (kind) {
    case NestVaultEvent.VaultCreated: {
      const e = parseVaultCreatedEvent(data)
      return { what: 'Vault created', detail: `withdrawal delay ${Number(e.delaySecs)} s` }
    }
    case NestVaultEvent.Deposited: {
      const e = parseDepositedEvent(data)
      return { what: 'Deposit', detail: sol(e.amount) }
    }
    case NestVaultEvent.WithdrawalRequested: {
      const e = parseWithdrawalRequestedEvent(data)
      return { what: 'Withdrawal requested', detail: `${sol(e.amount)} to ${short(e.destination)}, unlocks after the delay` }
    }
    case NestVaultEvent.WithdrawalExecuted: {
      const e = parseWithdrawalExecutedEvent(data)
      return { what: e.expedited ? 'Withdrawal released early (owner + guardian)' : 'Withdrawal completed after the delay', detail: sol(e.amount) }
    }
    case NestVaultEvent.WithdrawalCancelled: {
      const e = parseWithdrawalCancelledEvent(data)
      return { what: 'Withdrawal cancelled', detail: `by the ${role(e.role)}` }
    }
    case NestVaultEvent.InstantWithdrawal: {
      const e = parseInstantWithdrawalEvent(data)
      return { what: 'Instant withdrawal to a safe address', detail: `${sol(e.amount)} to ${short(e.destination)}` }
    }
    case NestVaultEvent.LockdownTriggered: {
      const e = parseLockdownTriggeredEvent(data)
      return { what: 'Savings frozen', detail: `by the ${role(e.role)}; pending withdrawals voided` }
    }
    case NestVaultEvent.LockdownLifted: {
      parseLockdownLiftedEvent(data)
      return { what: 'Freeze lifted early', detail: 'owner + guardian' }
    }
    case NestVaultEvent.ConfigProposed: {
      parseConfigProposedEvent(data)
      return { what: 'Settings change proposed', detail: 'waits the delay' }
    }
    case NestVaultEvent.ConfigApplied: {
      parseConfigAppliedEvent(data)
      return { what: 'Settings change applied', detail: 'after the delay' }
    }
    case NestVaultEvent.ConfigCancelled: {
      parseConfigCancelledEvent(data)
      return { what: 'Settings change cancelled', detail: '' }
    }
    case NestVaultEvent.GuardianCheckedIn: {
      parseGuardianCheckedInEvent(data)
      return { what: 'Guardian check-in', detail: '' }
    }
    case NestVaultEvent.StipendSetup: {
      const e = parseStipendSetupEvent(data)
      return { what: 'Guardian rewards pool created', detail: `${units(e.ratePerWeek)} tokens / week` }
    }
    case NestVaultEvent.StipendFunded: {
      const e = parseStipendFundedEvent(data)
      return { what: 'Rewards pool funded', detail: `${units(e.amount)} tokens` }
    }
    case NestVaultEvent.StipendClaimed: {
      const e = parseStipendClaimedEvent(data)
      return { what: 'Guardian collected rewards', detail: `${units(e.amount)} tokens` }
    }
    default:
      return null
  }
}

async function eventsFor(vault: Address) {
  const sigs: { signature: Signature; blockTime: bigint | null; err: unknown }[] = []
  let before: Signature | undefined
  for (;;) {
    const page = await rpc.getSignaturesForAddress(vault, { limit: 1000, before }).send()
    sigs.push(...page)
    if (page.length < 1000) break
    before = page[page.length - 1].signature
  }
  const rows: { time: number; signature: string; what: string; detail: string }[] = []
  for (const s of sigs.filter((s) => !s.err).reverse()) {
    let t = null
    for (let attempt = 0; attempt < 5 && !t; attempt++) {
      try {
        t = await rpc.getTransaction(s.signature, { maxSupportedTransactionVersion: 0, encoding: 'json' }).send()
      } catch {
        await sleep(1500 * (attempt + 1))
      }
    }
    await sleep(120)
    for (const line of t?.meta?.logMessages ?? []) {
      if (!line.startsWith('Program data: ')) continue
      const d = describe(new Uint8Array(getBase64Encoder().encode(line.slice(14))))
      if (d) rows.push({ time: Number(s.blockTime ?? 0), signature: s.signature, ...d })
    }
  }
  return rows
}

async function main() {
  const out: string[] = [
    '# Devnet evidence',
    '',
    `Every Nest Finance event on the demo vaults, read from Solana devnet and decoded with the program's generated client (\`app/scripts/devnet-evidence.ts\`, generated ${new Date().toISOString().slice(0, 10)}). Each row links to its transaction on the Solana Explorer, where the program's log shows the same event.`,
    '',
    `Program: [\`${PROGRAM}\`](https://explorer.solana.com/address/${PROGRAM}?cluster=devnet). The deployed binary matches this repository byte for byte ([verify.md](verify.md)).`,
    '',
    'Reading the roles: **owner** is the wallet (via Mobile Wallet Adapter), **guardian** is a second wallet, **sentinel (backup PIN)** is the tighten-only key in the phone\'s Android Keystore that signs the silent freeze when the backup PIN is entered.',
  ]
  const counts = new Map<string, number>()
  for (const v of VAULTS) {
    const rows = await eventsFor(v.vault)
    for (const r of rows) counts.set(r.what, (counts.get(r.what) ?? 0) + 1)
    out.push(
      '',
      `## ${v.label}`,
      '',
      `Vault [\`${v.vault}\`](https://explorer.solana.com/address/${v.vault}?cluster=devnet), owner \`${v.owner}\`. ${rows.length} events.`,
      '',
      '| When (UTC) | Event | Detail | Transaction |',
      '|---|---|---|---|',
      ...rows.map(
        (r) => `| ${new Date(r.time * 1000).toISOString().slice(0, 16).replace('T', ' ')} | ${r.what} | ${r.detail} | ${tx(r.signature)} |`,
      ),
    )
  }
  const summary = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `| ${k} | ${n} |`)
  out.splice(7, 0, '', '## Summary', '', '| Event | Count |', '|---|---|', ...summary)
  writeFileSync(path.resolve(__dirname, '../../docs/devnet-evidence.md'), out.join('\n') + '\n')
  console.log('events:', [...counts.values()].reduce((a, b) => a + b, 0))
  console.log([...counts.entries()].map(([k, n]) => `${n}  ${k}`).join('\n'))
}

main()
