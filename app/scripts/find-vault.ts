// Dev helper: find vaults whose owner matches a shortened address (prefix…suffix) and print
// their recent program events. npx tsx scripts/find-vault.ts <prefix> <suffix>
import { createSolanaRpc, getBase58Decoder, getBase64Encoder, type Signature } from '@solana/kit'
import { getVaultDecoder, identifyNestVaultEvent, NEST_VAULT_PROGRAM_ADDRESS, NestVaultEvent, VAULT_DISCRIMINATOR } from '../generated/nest-vault'

const rpc = createSolanaRpc('https://api.devnet.solana.com')
async function main() {
  const [prefix, suffix] = process.argv.slice(2)
  const raw = await rpc
    .getProgramAccounts(NEST_VAULT_PROGRAM_ADDRESS, {
      encoding: 'base64',
      filters: [{ memcmp: { offset: 0n, bytes: getBase58Decoder().decode(VAULT_DISCRIMINATOR) as never, encoding: 'base58' } }],
    })
    .send()
  for (const { pubkey, account } of raw) {
    const v = getVaultDecoder().decode(new Uint8Array(getBase64Encoder().encode(account.data[0])))
    if (!v.owner.startsWith(prefix) || !v.owner.endsWith(suffix)) continue
    console.log(`vault ${pubkey} owner ${v.owner} sentinel ${v.sentinel} epoch ${v.epoch} lockdownUntil ${v.lockdownUntil}`)
    const sigs = await rpc.getSignaturesForAddress(pubkey, { limit: 20 }).send()
    for (const s of sigs.reverse()) {
      const t = await rpc.getTransaction(s.signature as Signature, { maxSupportedTransactionVersion: 0, encoding: 'json' }).send()
      const kinds = (t?.meta?.logMessages ?? [])
        .filter((l) => l.startsWith('Program data: '))
        .map((l) => { try { return NestVaultEvent[identifyNestVaultEvent(new Uint8Array(getBase64Encoder().encode(l.slice(14))))] } catch { return null } })
        .filter(Boolean)
      const signer = (t?.transaction.message.accountKeys ?? [])[0]
      console.log(`  ${new Date(Number(s.blockTime) * 1000).toISOString()} ${kinds.join(',') || '-'} feePayer=${signer} ${s.signature}`)
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
