// Spending-wallet data shown in both modes. In duress mode this is all that shows, so it
// must be real: an attacker can check the address on any explorer.

import { address, type Address } from '@solana/kit'
import { useQuery } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { AppConfig } from '@/constants/app-config'
import { transferSol, useSend } from '@/features/vault/use-vault'

export type WalletActivityItem = {
  signature: string
  blockTime: number
  /** Positive = received, negative = sent (fees excluded for sends). */
  lamports: bigint
}

export function useUsdcBalance() {
  const { account, client } = useMobileWallet()
  return useQuery({
    queryKey: ['usdc-balance', account?.address],
    enabled: !!account,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { value } = await client.rpc
        .getTokenAccountsByOwner(account!.address, { mint: address(AppConfig.usdcMint) }, { encoding: 'jsonParsed' })
        .send()
      return value.reduce((sum, a) => sum + Number(a.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0)
    },
  })
}

export function useWalletActivity() {
  const { account, client } = useMobileWallet()
  return useQuery({
    queryKey: ['wallet-activity', account?.address],
    enabled: !!account,
    refetchInterval: 30_000,
    queryFn: async (): Promise<WalletActivityItem[]> => {
      const owner = account!.address
      const signatures = await client.rpc.getSignaturesForAddress(owner, { limit: 15 }).send()
      const txs = await Promise.all(
        signatures
          .filter((s) => !s.err)
          .map((s) =>
            client.rpc
              .getTransaction(s.signature, { maxSupportedTransactionVersion: 0, encoding: 'json' })
              .send()
              .then((tx) => ({ s, tx })),
          ),
      )
      const items: WalletActivityItem[] = []
      for (const { s, tx } of txs) {
        if (!tx?.meta) continue
        const keys = tx.transaction.message.accountKeys as readonly Address[]
        const i = keys.indexOf(owner)
        if (i < 0) continue
        let delta = BigInt(tx.meta.postBalances[i]) - BigInt(tx.meta.preBalances[i])
        if (i === 0 && delta < 0n) delta += BigInt(tx.meta.fee)
        if (delta === 0n) continue
        items.push({ signature: s.signature, blockTime: Number(s.blockTime ?? 0), lamports: delta })
      }
      return items
    },
  })
}

export function useSendSol() {
  const send = useSend()
  return (lamports: bigint, destination: string) => send((owner) => [transferSol(owner, address(destination), lamports)])
}
