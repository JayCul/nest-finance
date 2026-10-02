// Dev/test helper: cancel a pending withdrawal as the owner or a guardian, outside the app.
// npx tsx scripts/cancel-request.ts <key-file> <vault> <pending>

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
import { getCancelWithdrawalInstruction } from '../generated/nest-vault'

async function main() {
  const [keyPath, vault, pending] = process.argv.slice(2)
  if (!keyPath || !vault || !pending) throw new Error('usage: npx tsx scripts/cancel-request.ts <key-file> <vault> <pending>')
  const rpc = createSolanaRpc('https://api.devnet.solana.com')
  const signer = await createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(readFileSync(keyPath, 'utf8'))))
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send()
  const tx = await signTransactionMessageWithSigners(
    pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(signer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) => appendTransactionMessageInstructions([getCancelWithdrawalInstruction({ authority: signer, vault: address(vault), pending: address(pending) })], m),
    ),
  )
  await rpc.sendTransaction(getBase64EncodedWireTransaction(tx), { encoding: 'base64', preflightCommitment: 'confirmed' }).send()
  console.log('cancelled:', getSignatureFromTransaction(tx))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
