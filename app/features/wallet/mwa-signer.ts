// Mobile Wallet Adapter signer that works with wallets on the legacy protocol, such as Phantom.
//
// wallet-ui's signer re-authorizes with the saved auth token. On a legacy session the protocol
// turns that into `reauthorize`, which carries no chain, and Phantom refuses it (-1). The library
// means to fall back to a fresh `authorize`, but the fallback never runs on React Native, so
// signing stops. (Phantom logs why: it only re-authorizes dApps whose identity it has verified.)
// This signer retries in a new session with a fresh `authorize` (no token), and remembers on the
// phone which wallets refuse saved tokens, so later transactions go straight to one approval.

import type { Address, SignatureBytes, TransactionSendingSigner } from '@solana/kit'
import { MobileWalletProviderContext, transact } from '@wallet-ui/react-native-kit'
import * as SecureStore from 'expo-secure-store'
import { useContext } from 'react'

/** Accounts whose wallet refused a saved token; they get a fresh authorize instead. */
const REFUSED_KEY = 'nest.mwa.token-refused.v1'
let tokenRefused: Set<string> | null = null
async function refusedSet() {
  if (!tokenRefused) {
    const saved = await SecureStore.getItemAsync(REFUSED_KEY).catch(() => null)
    tokenRefused = new Set<string>(saved ? JSON.parse(saved) : [])
  }
  return tokenRefused
}
async function markRefused(address: string) {
  const set = await refusedSet()
  set.add(address)
  await SecureStore.setItemAsync(REFUSED_KEY, JSON.stringify([...set])).catch(() => {})
}
/** The wallet needs a moment to close its first session before it accepts a new one. */
const RETRY_DELAY_MS = 1500

function isAuthorizationRefused(e: unknown) {
  const err = e as { code?: unknown; message?: unknown }
  return String(err?.code) === '-1' || /authorization (request )?failed/i.test(String(err?.message ?? ''))
}

export function useMwaSigner() {
  const ctx = useContext(MobileWalletProviderContext)
  return function signer(address: Address, minContextSlot?: bigint): TransactionSendingSigner {
    if (!ctx) throw new Error('MobileWalletProvider is missing.')
    const { chain, identity, store } = ctx

    const session = (withToken: boolean, transactions: Parameters<TransactionSendingSigner['signAndSendTransactions']>[0]) =>
      transact(async (wallet) => {
        const authToken = withToken ? store.$authToken.get() : undefined
        const result = await wallet.authorize(authToken ? { auth_token: authToken, chain, identity } : { chain, identity })
        if (result.auth_token !== store.$authToken.get()) {
          await store.persist({
            accounts: store.$accounts.get(),
            authToken: result.auth_token,
            selectedAccount: store.$selectedAccount.get(),
          } as Parameters<typeof store.persist>[0])
        }
        return (await wallet.signAndSendTransactions({
          ...(minContextSlot == null ? {} : { minContextSlot: Number(minContextSlot) }),
          transactions: [...transactions],
        })) as SignatureBytes[]
      })

    return Object.freeze({
      address,
      async signAndSendTransactions(transactions, config) {
        config?.abortSignal?.throwIfAborted()
        if (store.$authToken.get() && !(await refusedSet()).has(address)) {
          try {
            return await session(true, transactions)
          } catch (e) {
            if (!isAuthorizationRefused(e)) throw e
            console.warn('[nest] wallet refused the saved authorization; authorizing again')
            await markRefused(address)
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
          }
        }
        config?.abortSignal?.throwIfAborted()
        return await session(false, transactions)
      },
    } satisfies TransactionSendingSigner)
  }
}
