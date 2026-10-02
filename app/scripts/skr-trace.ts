// Runs one complete guardian-rewards cycle on devnet and writes docs/skr-trace.md: every
// transaction, token account and on-chain state change, with the accrual maths checked against
// what the program paid. Uses Circle devnet USDC as the SKR stand-in (same Token program, 6 decimals).
//
// npx tsx scripts/skr-trace.ts <owner-keypair.json> <guardian-keypair.json>

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  address,
  type Address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  generateKeyPairSigner,
  getAddressEncoder,
  getBase64EncodedWireTransaction,
  getProgramDerivedAddress,
  getSignatureFromTransaction,
  type Instruction,
  type KeyPairSigner,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from '@solana/kit'
import {
  fetchStipendPool,
  fetchVault,
  findPoolPda,
  findVaultPda,
  getClaimStipendInstructionAsync,
  getFundStipendInstructionAsync,
  getInitVaultInstructionAsync,
  getSetupStipendInstructionAsync,
} from '../generated/nest-vault'

const rpc = createSolanaRpc('https://api.devnet.solana.com')
const MINT = address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU') // Circle devnet USDC
const SKR_MAINNET = 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3'
const TOKEN = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ATA = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
const RATE = 1_000_000n // 1 token a week
const FUND = 5_000_000n // 5 tokens
const WEEK = 604_800n
const CAP = 8n * 86_400n

const ex = (kind: 'tx' | 'address', v: string) => `https://explorer.solana.com/${kind}/${v}?cluster=devnet`
const link = (kind: 'tx' | 'address', v: string, label = `${v.slice(0, 6)}…${v.slice(-6)}`) => `[\`${label}\`](${ex(kind, v)})`
const units = (u: bigint) => `${(Number(u) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 6 })}`
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function signer(file: string) {
  return createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(readFileSync(file, 'utf8'))))
}

async function ataOf(owner: Address) {
  const enc = getAddressEncoder()
  const [a] = await getProgramDerivedAddress({ programAddress: ATA, seeds: [enc.encode(owner), enc.encode(TOKEN), enc.encode(MINT)] })
  return a
}

async function balance(a: Address): Promise<bigint> {
  try {
    return BigInt((await rpc.getTokenAccountBalance(a, { commitment: 'confirmed' }).send()).value.amount)
  } catch {
    return 0n
  }
}

async function send(payer: KeyPairSigner, ixs: Instruction[]) {
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send()
  const msg = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstructions(ixs, m),
  )
  const signed = await signTransactionMessageWithSigners(msg)
  const sig = getSignatureFromTransaction(signed)
  await rpc.sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: 'base64', preflightCommitment: 'confirmed' }).send()
  for (let i = 0; i < 60; i++) {
    const { value } = await rpc.getSignatureStatuses([sig]).send()
    if (value[0]?.err) throw new Error(`failed: ${sig} ${JSON.stringify(value[0].err)}`)
    if (value[0]?.confirmationStatus === 'confirmed' || value[0]?.confirmationStatus === 'finalized') break
    await sleep(1000)
  }
  const tx = await rpc.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0, encoding: 'json' }).send()
  return { sig, blockTime: Number(tx?.blockTime ?? 0), logs: tx?.meta?.logMessages ?? [] }
}

async function main() {
  const [ownerFile, guardianFile] = process.argv.slice(2)
  const owner = await signer(ownerFile)
  const guardian = await signer(guardianFile)
  const sentinel = await generateKeyPairSigner()
  const [vault] = await findVaultPda({ owner: owner.address })
  const [pool] = await findPoolPda({ vault })
  const poolToken = await ataOf(pool)
  const ownerToken = await ataOf(owner.address)
  const guardianToken = await ataOf(guardian.address)
  const out: string[] = []
  const log = (s = '') => {
    out.push(s)
    console.log(s)
  }

  // 1. Vault with one guardian.
  const init = await send(owner, [
    await getInitVaultInstructionAsync({
      owner,
      params: { sentinel: sentinel.address, guardians: [guardian.address], safeList: [], delaySecs: 120n, lockdownSecs: 600n },
    }),
  ])

  // 2. Rewards pool: setup + fund in one transaction, as the app sends it.
  const ownerBefore = await balance(ownerToken)
  const setup = await send(owner, [
    await getSetupStipendInstructionAsync({ owner, vault, mint: MINT, ratePerWeek: RATE }),
    await getFundStipendInstructionAsync({ funder: owner, pool, mint: MINT, funderToken: ownerToken, amount: FUND }),
  ])
  const afterSetup = { owner: await balance(ownerToken), pool: await balance(poolToken) }
  const poolState0 = (await fetchStipendPool(rpc, pool, { commitment: 'confirmed' })).data

  // 3. First check-in: pays one week.
  const g0 = await balance(guardianToken)
  const claim1 = await send(guardian, [await getClaimStipendInstructionAsync({ guardian, vault, mint: MINT })])
  const after1 = { guardian: await balance(guardianToken), pool: await balance(poolToken) }
  const pool1 = (await fetchStipendPool(rpc, pool, { commitment: 'confirmed' })).data
  const vault1 = (await fetchVault(rpc, vault, { commitment: 'confirmed' })).data

  // 4. Second check-in a few minutes later: pays pro rata for the time since the first.
  await sleep(150_000)
  const claim2 = await send(guardian, [await getClaimStipendInstructionAsync({ guardian, vault, mint: MINT })])
  const after2 = { guardian: await balance(guardianToken), pool: await balance(poolToken) }
  const pool2 = (await fetchStipendPool(rpc, pool, { commitment: 'confirmed' })).data
  const vault2 = (await fetchVault(rpc, vault, { commitment: 'confirmed' })).data

  const last1 = pool1.claims.find((c) => c.guardian === guardian.address)!.lastClaim
  const last2 = pool2.claims.find((c) => c.guardian === guardian.address)!.lastClaim
  const elapsed = last2 - last1
  const expected2 = (RATE * (elapsed < CAP ? elapsed : CAP)) / WEEK
  const paid1 = after1.guardian - g0
  const paid2 = after2.guardian - after1.guardian

  log('# SKR rewards: on-chain trace')
  log()
  log(`One complete guardian-rewards cycle, run on Solana devnet on ${new Date(setup.blockTime * 1000).toUTCString()} by \`app/scripts/skr-trace.ts\`, which also wrote this page. Every number below was read back from the chain after each transaction.`)
  log()
  log(`The reward token here is Circle devnet USDC (${link('address', MINT)}), the stand-in for SKR on devnet: same Token program, same 6 decimals. On mainnet the same instructions run with SKR (\`${SKR_MAINNET}\`); the test \`guardian_rewards_work_with_mainnet_skr\` runs this exact cycle against SKR's real mainnet mint account ([skr.md](skr.md)).`)
  log()
  log('## Accounts')
  log()
  log('| Account | Address | What it is |')
  log('|---|---|---|')
  log(`| Owner | ${link('address', owner.address)} | Test owner wallet |`)
  log(`| Guardian | ${link('address', guardian.address)} | Demo guardian wallet |`)
  log(`| Vault | ${link('address', vault)} | PDA \`["vault", owner]\` |`)
  log(`| Rewards pool | ${link('address', pool)} | PDA \`["stipend", vault]\`, a \`StipendPool\` account |`)
  log(`| Pool token account | ${link('address', poolToken)} | Associated token account of the pool PDA; only the pool can sign for it |`)
  log(`| Owner token account | ${link('address', ownerToken)} | Funds the pool |`)
  log(`| Guardian token account | ${link('address', guardianToken)} | Receives rewards; created on the first claim if needed |`)
  log()
  log('## 1. Vault created with one guardian')
  log()
  log(`\`init_vault\`: ${link('tx', init.sig)}. Guardian \`${guardian.address}\`, 2-minute demo delay.`)
  log()
  log('## 2. Pool created and funded (one transaction)')
  log()
  log(`\`setup_stipend\` + \`fund_stipend\`: ${link('tx', setup.sig)}`)
  log()
  log(`- Pool state: \`mint = ${poolState0.mint}\`, \`rate_per_week = ${poolState0.ratePerWeek}\` (${units(poolState0.ratePerWeek)} tokens a week), \`claims = []\`.`)
  log(`- Owner token account: ${units(ownerBefore)} → ${units(afterSetup.owner)} tokens.`)
  log(`- Pool token account: 0 → ${units(afterSetup.pool)} tokens.`)
  log()
  log('## 3. First check-in: one week paid, heartbeat recorded')
  log()
  log(`\`claim_stipend\` signed by the guardian: ${link('tx', claim1.sig)}`)
  log()
  log(`- Rule: a guardian's first claim counts as one week, so \`rate × 604800 / 604800 = ${units(RATE)}\`.`)
  log(`- Paid: **${units(paid1)}** tokens (guardian ${units(g0)} → ${units(after1.guardian)}; pool ${units(afterSetup.pool)} → ${units(after1.pool)}).`)
  log(`- Pool state: \`claims = [{ guardian: ${guardian.address.slice(0, 6)}…, last_claim: ${last1} }]\`.`)
  log(`- Heartbeat: vault \`guardian_last_seen[0] = ${vault1.guardianLastSeen[0]}\`, the same time as the claim.`)
  log()
  log('## 4. Second check-in: pro-rata accrual, with the 8-day cap')
  log()
  log(`\`claim_stipend\` again, ${elapsed} seconds later: ${link('tx', claim2.sig)}`)
  log()
  log('- Rule (`StipendPool::accrued` in `programs/nest_vault/src/state.rs`): `paid = rate_per_week × min(now − last_claim, 8 days) / 1 week`, never more than the pool holds.')
  log(`- Expected: \`${RATE} × min(${elapsed}, ${CAP}) / ${WEEK} = ${expected2}\` base units.`)
  log(`- Paid: **${paid2}** base units (${units(paid2)} tokens) ${paid2 === expected2 ? '— matches the formula exactly' : `(differs from ${expected2})`}.`)
  log(`- Pool state: \`last_claim: ${last1} → ${last2}\`. Pool token account: ${units(after1.pool)} → ${units(after2.pool)}.`)
  log(`- Heartbeat: \`guardian_last_seen[0]: ${vault1.guardianLastSeen[0]} → ${vault2.guardianLastSeen[0]}\`.`)
  log()
  log('The cap is why a missed week is forfeited: a guardian who checks in after 30 days is paid for 8. Waiting 8 days on devnet is not practical, so the cap is shown by the program test `stipend_accrues_pro_rata_and_caps_at_eight_days`, which advances the clock 30 days and checks the payout is exactly 8 days\' worth.')
  log()
  log('## Program log of the second claim')
  log()
  log('```text')
  for (const l of claim2.logs) log(l)
  log('```')
  log()
  log('## Switching to SKR on mainnet')
  log()
  log(`Set \`skrMint = '${SKR_MAINNET}'\` in \`app/constants/app-config.ts\` (decimals stay 6) and deploy the same program to mainnet. No program change: the pool stores its mint and every transfer is \`transfer_checked\` against it. Details: [skr.md](skr.md).`)
  writeFileSync(path.resolve(__dirname, '../../docs/skr-trace.md'), out.join('\n') + '\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
