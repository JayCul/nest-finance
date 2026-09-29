// Dev/test helper: request a withdrawal from a vault as its owner, outside the app.
// Simulates what a drainer or a coerced signature elsewhere would do, so the guardian's
// alerts and cancel flow can be tested.
//
// Usage: node scripts/owner-request.mjs <owner-keypair.json> <amountSol> <destination> [rpcUrl]

import {
  AccountRole,
  address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  getAddressEncoder,
  getBase64EncodedWireTransaction,
  getProgramDerivedAddress,
  getSignatureFromTransaction,
  getU64Encoder,
  getUtf8Encoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from '@solana/kit'
import { readFileSync } from 'node:fs'

const [keyPath, amountSol, destination, rpcUrl = 'https://api.devnet.solana.com'] = process.argv.slice(2)
if (!keyPath || !amountSol || !destination) {
  console.error('usage: node scripts/owner-request.mjs <owner-keypair.json> <amountSol> <destination> [rpcUrl]')
  process.exit(1)
}

const PROGRAM = address('EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ')
const REQUEST_WITHDRAWAL = [251, 85, 121, 205, 56, 201, 12, 177]
const rpc = createSolanaRpc(rpcUrl)
const owner = await createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(readFileSync(keyPath, 'utf8'))))
const addr = getAddressEncoder()
const [vault] = await getProgramDerivedAddress({ programAddress: PROGRAM, seeds: [getUtf8Encoder().encode('vault'), addr.encode(owner.address)] })

// Read next_withdrawal_id: walk the Vault layout past its three Vec fields.
const { value } = await rpc.getAccountInfo(vault, { encoding: 'base64' }).send()
const data = Buffer.from(value.data[0], 'base64')
let o = 8 + 32 + 32
const g = data.readUInt32LE(o); o += 4 + 32 * g
const ls = data.readUInt32LE(o); o += 4 + 8 * ls
const s = data.readUInt32LE(o); o += 4 + 32 * s
o += 8 * 4 // delay, lockdown_secs, lockdown_until, epoch
const nextId = data.readBigUInt64LE(o)

const [pending] = await getProgramDerivedAddress({
  programAddress: PROGRAM,
  seeds: [getUtf8Encoder().encode('withdrawal'), addr.encode(vault), getU64Encoder().encode(nextId)],
})

const lamports = BigInt(Math.round(Number(amountSol) * 1e9))
const ixData = new Uint8Array([
  ...REQUEST_WITHDRAWAL,
  ...new Uint8Array(32), // mint: all zeros = native SOL
  ...getU64Encoder().encode(lamports),
  ...addr.encode(address(destination)),
])
const ix = {
  programAddress: PROGRAM,
  accounts: [
    { address: owner.address, role: AccountRole.WRITABLE_SIGNER, signer: owner },
    { address: vault, role: AccountRole.WRITABLE },
    { address: pending, role: AccountRole.WRITABLE },
    { address: address('11111111111111111111111111111111'), role: AccountRole.READONLY },
  ],
  data: ixData,
}

const { value: blockhash } = await rpc.getLatestBlockhash().send()
const message = pipe(
  createTransactionMessage({ version: 0 }),
  (m) => setTransactionMessageFeePayerSigner(owner, m),
  (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
  (m) => appendTransactionMessageInstructions([ix], m),
)
const signed = await signTransactionMessageWithSigners(message)
await rpc.sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: 'base64' }).send()
console.log(`requested ${amountSol} SOL -> ${destination}\nvault ${vault}\npending ${pending}\nsig ${getSignatureFromTransaction(signed)}`)
