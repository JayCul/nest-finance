// Devnet only: creates a 6-decimal token standing in for SKR (which doesn't exist on devnet)
// and mints some to a wallet. Prints the mint address for constants/app-config.ts.
//
// Usage: node scripts/create-test-skr.mjs <payer-keypair.json> <recipient> [amount] [rpcUrl]

import {
  AccountRole,
  address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  generateKeyPairSigner,
  getAddressEncoder,
  getBase64EncodedWireTransaction,
  getProgramDerivedAddress,
  getSignatureFromTransaction,
  getU32Encoder,
  getU64Encoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from '@solana/kit'
import { readFileSync } from 'node:fs'

const [keyPath, recipientArg, amountArg = '10000', rpcUrl = 'https://api.devnet.solana.com'] = process.argv.slice(2)
if (!keyPath || !recipientArg) {
  console.error('usage: node scripts/create-test-skr.mjs <payer-keypair.json> <recipient> [amount] [rpcUrl]')
  process.exit(1)
}

const SYSTEM = address('11111111111111111111111111111111')
const TOKEN = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ATA_PROGRAM = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
const DECIMALS = 6
const rpc = createSolanaRpc(rpcUrl)
const payer = await createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(readFileSync(keyPath, 'utf8'))))
const mint = await generateKeyPairSigner()
const recipient = address(recipientArg)
const enc = getAddressEncoder()
const bytes = (...parts) => new Uint8Array(parts.flatMap((p) => [...p]))

const rent = await rpc.getMinimumBalanceForRentExemption(82n).send()
const createMint = {
  programAddress: SYSTEM,
  accounts: [
    { address: payer.address, role: AccountRole.WRITABLE_SIGNER, signer: payer },
    { address: mint.address, role: AccountRole.WRITABLE_SIGNER, signer: mint },
  ],
  data: bytes(getU32Encoder().encode(0), getU64Encoder().encode(rent), getU64Encoder().encode(82n), enc.encode(TOKEN)),
}
const initMint = {
  programAddress: TOKEN,
  accounts: [{ address: mint.address, role: AccountRole.WRITABLE }],
  data: bytes([20, DECIMALS], enc.encode(payer.address), [0]), // InitializeMint2, no freeze authority
}
const [ata] = await getProgramDerivedAddress({
  programAddress: ATA_PROGRAM,
  seeds: [enc.encode(recipient), enc.encode(TOKEN), enc.encode(mint.address)],
})
const createAta = {
  programAddress: ATA_PROGRAM,
  accounts: [
    { address: payer.address, role: AccountRole.WRITABLE_SIGNER, signer: payer },
    { address: ata, role: AccountRole.WRITABLE },
    { address: recipient, role: AccountRole.READONLY },
    { address: mint.address, role: AccountRole.READONLY },
    { address: SYSTEM, role: AccountRole.READONLY },
    { address: TOKEN, role: AccountRole.READONLY },
  ],
  data: new Uint8Array([1]), // CreateIdempotent
}
const amount = BigInt(Math.round(Number(amountArg) * 10 ** DECIMALS))
const mintTo = {
  programAddress: TOKEN,
  accounts: [
    { address: mint.address, role: AccountRole.WRITABLE },
    { address: ata, role: AccountRole.WRITABLE },
    { address: payer.address, role: AccountRole.READONLY_SIGNER, signer: payer },
  ],
  data: bytes([7], getU64Encoder().encode(amount)), // MintTo
}

const { value: blockhash } = await rpc.getLatestBlockhash().send()
const message = pipe(
  createTransactionMessage({ version: 0 }),
  (m) => setTransactionMessageFeePayerSigner(payer, m),
  (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
  (m) => appendTransactionMessageInstructions([createMint, initMint, createAta, mintTo], m),
)
const signed = await signTransactionMessageWithSigners(message)
await rpc.sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: 'base64' }).send()
console.log(`mint ${mint.address}\nminted ${amountArg} to ${recipient}\nsig ${getSignatureFromTransaction(signed)}`)
