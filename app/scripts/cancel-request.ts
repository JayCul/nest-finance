// Dev/test helper: cancel a pending withdrawal as the owner or a guardian, outside the app.
// npx tsx scripts/cancel-request.ts <key-file> <vault> <pending>
// npx tsx scripts/cancel-request.ts <key-file> <vault> --voided   (closes every request voided by a freeze)

import { readFileSync } from 'node:fs'
import {
  address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from '@solana/kit'
import {
  fetchVault,
  getCancelWithdrawalInstruction,
  getPendingWithdrawalDecoder,
  NEST_VAULT_PROGRAM_ADDRESS,
  PENDING_WITHDRAWAL_DISCRIMINATOR,
} from '../generated/nest-vault'
import { getBase58Decoder, getBase64Encoder, type Address } from '@solana/kit'

async function main() {
  const [keyPath, vault, pending] = process.argv.slice(2)
  if (!keyPath || !vault || !pending) throw new Error('usage: npx tsx scripts/cancel-request.ts <key-file> <vault> <pending>')
  const rpc = createSolanaRpc('https://api.devnet.solana.com')
  const signer = await createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(readFileSync(keyPath, 'utf8'))))
  let targets: Address[] = pending === '--voided' ? [] : [address(pending)]
  if (pending === '--voided') {
    const vaultAcc = await fetchVault(rpc, address(vault), { commitment: 'confirmed' })
    const raw = await rpc
      .getProgramAccounts(NEST_VAULT_PROGRAM_ADDRESS, {
        encoding: 'base64',
        commitment: 'confirmed',
        filters: [
          { memcmp: { offset: 0n, bytes: getBase58Decoder().decode(PENDING_WITHDRAWAL_DISCRIMINATOR) as never, encoding: 'base58' } },
          { memcmp: { offset: 8n, bytes: vault as never, encoding: 'base58' } },
        ],
      })
      .send()
    targets = raw
      .filter(({ account }) => getPendingWithdrawalDecoder().decode(new Uint8Array(getBase64Encoder().encode(account.data[0]))).epoch !== vaultAcc.data.epoch)
      .map(({ pubkey }) => pubkey)
    console.log(`${targets.length} voided request(s)`)
    if (!targets.length) return
  }
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send()
  const tx = await signTransactionMessageWithSigners(
    pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(signer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) => appendTransactionMessageInstructions(targets.map((p) => getCancelWithdrawalInstruction({ authority: signer, vault: address(vault), pending: p })), m),
    ),
  )
  await rpc.sendTransaction(getBase64EncodedWireTransaction(tx), { encoding: 'base64', preflightCommitment: 'confirmed' }).send()
  console.log('cancelled:', getSignatureFromTransaction(tx))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
