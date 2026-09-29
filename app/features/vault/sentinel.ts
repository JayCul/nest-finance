// The sentinel is an app-held key registered on the vault that can only tighten:
// cancel withdrawals and trigger a lockdown. It lets the duress PIN act silently,
// because Seed Vault always needs the owner's fingerprint to sign.
//
// The 32-byte seed lives in expo-secure-store, which encrypts it with an Android Keystore key.
// Signing uses @noble/curves (pure JS): react-native-quick-crypto 0.7 has no Ed25519 in
// WebCrypto, so Kit's own keypair helpers can't run here.

import { ed25519 } from '@noble/curves/ed25519.js'
import { getAddressDecoder, type SignatureBytes, type TransactionPartialSigner } from '@solana/kit'
import * as SecureStore from 'expo-secure-store'
import { fromUint8Array, toUint8Array } from 'js-base64'

const keyFor = (owner: string) => `nest.sentinel.${owner}`

function signerFromSeed(seed: Uint8Array): TransactionPartialSigner {
  const address = getAddressDecoder().decode(ed25519.getPublicKey(seed))
  return Object.freeze({
    address,
    async signTransactions(transactions) {
      return transactions.map((tx) =>
        Object.freeze({ [address]: ed25519.sign(new Uint8Array(tx.messageBytes), seed) as SignatureBytes }),
      )
    },
  } satisfies TransactionPartialSigner)
}

export async function loadSentinel(owner: string): Promise<TransactionPartialSigner | null> {
  const stored = await SecureStore.getItemAsync(keyFor(owner))
  return stored ? signerFromSeed(toUint8Array(stored)) : null
}

/** Returns the existing sentinel for this owner, or creates and stores a new one. */
export async function getOrCreateSentinel(owner: string): Promise<TransactionPartialSigner> {
  const existing = await loadSentinel(owner)
  if (existing) return existing
  const seed = new Uint8Array(32)
  crypto.getRandomValues(seed)
  await SecureStore.setItemAsync(keyFor(owner), fromUint8Array(seed))
  return signerFromSeed(seed)
}
