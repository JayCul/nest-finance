// Prints the exact Groq request Nest Intelligence sends for a guardian briefing on a real pending
// withdrawal, built from live devnet data with the same functions the app uses, and Groq's reply.
// npx tsx scripts/ai-payload.ts <vault-address>

import { readFileSync } from 'node:fs'
import { address, type Address, createSolanaRpc, getBase58Decoder, getBase64Encoder, type Signature } from '@solana/kit'
import {
  fetchVault,
  getPendingWithdrawalDecoder,
  identifyNestVaultEvent,
  NEST_VAULT_PROGRAM_ADDRESS,
  NestVaultEvent,
  parseLockdownTriggeredEvent,
  parseWithdrawalRequestedEvent,
  PENDING_WITHDRAWAL_DISCRIMINATOR,
} from '../generated/nest-vault'
import { assessWithdrawal, riskFacts } from '../features/intel/withdrawal-risk'
import type { ActivityItem } from '../features/vault/use-vault'

;(globalThis as { __DEV__?: boolean }).__DEV__ = false
const env = readFileSync('.env.local', 'utf8').split(/\r?\n/).find((l) => l.startsWith('EXPO_PUBLIC_GROQ_KEY_ENC='))
process.env.EXPO_PUBLIC_GROQ_KEY_ENC = env?.slice(env.indexOf('=') + 1)

const rpc = createSolanaRpc('https://api.devnet.solana.com')
const TASK =
  'Write a briefing for a guardian about this pending withdrawal in 2 or 3 sentences: what is leaving, how long they have, and why the app scored it this way. End with the recommended action.'

async function main() {
  const vaultAddr = address(process.argv[2])
  const vaultAcc = await fetchVault(rpc, vaultAddr, { commitment: 'confirmed' })
  const vault = vaultAcc.data
  const rentFloor = await rpc.getMinimumBalanceForRentExemption(BigInt(vaultAcc.space)).send()
  const available = vaultAcc.lamports - rentFloor
  const raw = await rpc
    .getProgramAccounts(NEST_VAULT_PROGRAM_ADDRESS, {
      encoding: 'base64',
      commitment: 'confirmed',
      filters: [
        { memcmp: { offset: 0n, bytes: getBase58Decoder().decode(PENDING_WITHDRAWAL_DISCRIMINATOR) as never, encoding: 'base58' } },
        { memcmp: { offset: 8n, bytes: vaultAddr as never, encoding: 'base58' } },
      ],
    })
    .send()
  const pending = raw
    .map(({ account }) => getPendingWithdrawalDecoder().decode(new Uint8Array(getBase64Encoder().encode(account.data[0]))))
    .filter((p) => p.epoch === vault.epoch)
  if (!pending.length) throw new Error('No live pending withdrawal on this vault.')
  const p = pending[pending.length - 1]

  const sigs = await rpc.getSignaturesForAddress(vaultAddr, { limit: 10, commitment: 'confirmed' }).send()
  const history: ActivityItem[] = []
  for (const s of sigs.filter((x) => !x.err)) {
    const t = await rpc.getTransaction(s.signature as Signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0, encoding: 'json' }).send()
    for (const line of t?.meta?.logMessages ?? []) {
      if (!line.startsWith('Program data: ')) continue
      const data = new Uint8Array(getBase64Encoder().encode(line.slice(14)))
      try {
        const kind = identifyNestVaultEvent(data)
        if (kind === NestVaultEvent.WithdrawalRequested) {
          const e = parseWithdrawalRequestedEvent(data)
          history.push({ signature: s.signature, blockTime: Number(s.blockTime), kind: 'withdrawal-requested', amount: e.amount, counterparty: e.destination })
        } else if (kind === NestVaultEvent.LockdownTriggered) {
          const e = parseLockdownTriggeredEvent(data)
          history.push({ signature: s.signature, blockTime: Number(s.blockTime), kind: 'lockdown', role: e.role })
        }
      } catch {}
    }
  }

  const now = Math.floor(Date.now() / 1000)
  const live = pending.map((x) => ({ amount: x.amount, requestedAt: Number(x.requestedAt) }))
  const risk = assessWithdrawal({
    amount: p.amount,
    destination: p.destination,
    requestedAt: Number(p.requestedAt),
    available,
    safeList: vault.safeList as Address[],
    ownerWallet: vault.owner,
    history,
    otherPending: live.filter((x) => x.requestedAt !== Number(p.requestedAt)),
    viewer: 'guardian',
    now,
  })
  const facts = riskFacts(risk, { amount: p.amount, unlockAt: Number(p.unlockAt), now, viewer: 'guardian' })
  const { askAi } = await import('../features/ai/groq')
  const RULES = (await import('../features/ai/groq')).RULES
  const body = {
    model: 'openai/gpt-oss-120b',
    temperature: 0.2,
    max_completion_tokens: 700,
    reasoning_effort: 'low',
    include_reasoning: false,
    messages: [
      { role: 'system', content: `${RULES} ${TASK}` },
      { role: 'user', content: facts },
    ],
  }
  console.log(JSON.stringify({ computedLocally: { score: risk.score, level: risk.level, signals: risk.signals, action: risk.action }, requestBody: body }, null, 2))
  console.log('\n--- Groq reply ---\n' + (await askAi(TASK, facts)))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
