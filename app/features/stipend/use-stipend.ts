// Guardian rewards in SKR: the owner funds a stipend pool, guardians collect it when they
// check in. The program caps each claim at 8 days, so missing weekly check-ins forfeits pay.
// New pools use AppConfig.skrMint (a devnet stand-in on devnet); each pool records its own token,
// and top-ups, claims and balances follow that.

import { address, type Address, getAddressEncoder, getProgramDerivedAddress } from '@solana/kit'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { AppConfig } from '@/constants/app-config'
import {
  fetchMaybeStipendPool,
  findPoolPda,
  getClaimStipendInstructionAsync,
  getFundStipendInstructionAsync,
  getSetupStipendInstructionAsync,
} from '@/generated/nest-vault'
import { refreshAfterSend, useSend } from '@/features/vault/use-vault'

const TOKEN_PROGRAM = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ATA_PROGRAM = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
const WEEK_SECS = 7 * 24 * 60 * 60
const MAX_ACCRUAL_SECS = 8 * 24 * 60 * 60

/** Token for new pools. */
export const skrMint = address(AppConfig.skrMint)
export const toSkr = (units: bigint | number) => Number(units) / 10 ** AppConfig.skrDecimals
export const fromSkr = (skr: number) => BigInt(Math.round(skr * 10 ** AppConfig.skrDecimals))

export async function ataOf(owner: Address, mint: Address = skrMint) {
  const enc = getAddressEncoder()
  const [ata] = await getProgramDerivedAddress({
    programAddress: ATA_PROGRAM,
    seeds: [enc.encode(owner), enc.encode(TOKEN_PROGRAM), enc.encode(mint)],
  })
  return ata
}

export type StipendInfo = {
  pool: Address
  mint: Address
  ratePerWeek: bigint
  balance: bigint
  claims: { guardian: Address; lastClaim: number }[]
}

export function useStipend(vault: Address | undefined) {
  const { client } = useMobileWallet()
  return useQuery({
    queryKey: ['stipend', vault],
    enabled: !!vault,
    refetchInterval: 30_000,
    queryFn: async (): Promise<StipendInfo | null> => {
      const [pool] = await findPoolPda({ vault: vault! })
      const account = await fetchMaybeStipendPool(client.rpc, pool)
      if (!account.exists) return null
      const poolToken = await ataOf(pool, account.data.mint)
      const balance = await client.rpc
        .getTokenAccountBalance(poolToken)
        .send()
        .then((r) => BigInt(r.value.amount))
        .catch(() => 0n)
      return {
        pool,
        mint: account.data.mint,
        ratePerWeek: account.data.ratePerWeek,
        balance,
        claims: account.data.claims.map((c) => ({ guardian: c.guardian, lastClaim: Number(c.lastClaim) })),
      }
    },
  })
}

/** What a guardian would collect now, mirroring the program's rule. */
export function accruedFor(stipend: StipendInfo, guardian: Address, now: number): bigint {
  const claim = stipend.claims.find((c) => c.guardian === guardian)
  const elapsed = claim ? Math.min(Math.max(now - claim.lastClaim, 0), MAX_ACCRUAL_SECS) : WEEK_SECS
  const accrued = (stipend.ratePerWeek * BigInt(elapsed)) / BigInt(WEEK_SECS)
  return accrued < stipend.balance ? accrued : stipend.balance
}

/** The connected wallet's balance of a reward token (new pools' token by default). */
export function useSkrBalance(mint: Address = skrMint) {
  const { account, client } = useMobileWallet()
  return useQuery({
    queryKey: ['skr-balance', account?.address, mint],
    enabled: !!account,
    refetchInterval: 30_000,
    queryFn: async () =>
      client.rpc
        .getTokenAccountBalance(await ataOf(account!.address, mint))
        .send()
        .then((r) => BigInt(r.value.amount))
        .catch(() => 0n),
  })
}

export function useStipendActions() {
  const send = useSend()
  const queryClient = useQueryClient()
  const refresh = () => refreshAfterSend(queryClient, ['stipend', 'skr-balance', 'guarded-vault', 'guarded-vaults', 'vault'])

  return {
    /** Creates the pool and funds it in one approval. */
    async setup(vault: Address, ratePerWeekSkr: number, fundSkr: number) {
      const sig = await send(async (owner) => {
        const setup = await getSetupStipendInstructionAsync({ owner, vault, mint: skrMint, ratePerWeek: fromSkr(ratePerWeekSkr) })
        const [pool] = await findPoolPda({ vault })
        const fund = await getFundStipendInstructionAsync({
          funder: owner,
          pool,
          mint: skrMint,
          funderToken: await ataOf(owner.address),
          amount: fromSkr(fundSkr),
        })
        return [setup, fund]
      })
      await refresh()
      return sig
    },

    async topUp(vault: Address, mint: Address, amountSkr: number) {
      const sig = await send(async (funder) => {
        const [pool] = await findPoolPda({ vault })
        return [
          await getFundStipendInstructionAsync({
            funder,
            pool,
            mint,
            funderToken: await ataOf(funder.address, mint),
            amount: fromSkr(amountSkr),
          }),
        ]
      })
      await refresh()
      return sig
    },

    /** Guardian: check in and collect. */
    async claim(vault: Address, mint: Address) {
      const sig = await send(async (guardian) => [await getClaimStipendInstructionAsync({ guardian, vault, mint })])
      await refresh()
      return sig
    },
  }
}
