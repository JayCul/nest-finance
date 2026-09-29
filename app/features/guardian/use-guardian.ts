// Guardian side: find the vaults that list this wallet as a guardian and act on them.

import { type Address, type Base58EncodedBytes, getBase58Decoder, getBase64Encoder } from '@solana/kit'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import {
  fetchMaybeVault,
  getCancelWithdrawalInstruction,
  getGuardianHeartbeatInstruction,
  getLockdownInstruction,
  getVaultDecoder,
  NEST_VAULT_PROGRAM_ADDRESS,
  VAULT_DISCRIMINATOR,
} from '@/generated/nest-vault'
import {
  fetchPendingWithdrawals,
  fetchVaultEvents,
  toVaultInfo,
  useSend,
  type VaultInfo,
} from '@/features/vault/use-vault'

/**
 * Vault layout: 8 discriminator + 32 owner + 32 sentinel + 4 guardians length, then up to
 * three 32-byte guardian keys. A memcmp at each slot finds every vault guarding this wallet.
 */
const GUARDIAN_SLOT_OFFSETS = [76n, 108n, 140n]

export function useGuardedVaults() {
  const { account, client } = useMobileWallet()
  return useQuery({
    queryKey: ['guarded-vaults', account?.address],
    enabled: !!account,
    refetchInterval: 20_000,
    queryFn: async (): Promise<VaultInfo[]> => {
      const me = account!.address
      const discriminator = getBase58Decoder().decode(VAULT_DISCRIMINATOR) as Base58EncodedBytes
      const batches = await Promise.all(
        GUARDIAN_SLOT_OFFSETS.map((offset) =>
          client.rpc
            .getProgramAccounts(NEST_VAULT_PROGRAM_ADDRESS, {
              encoding: 'base64',
              filters: [
                { memcmp: { offset: 0n, bytes: discriminator, encoding: 'base58' } },
                { memcmp: { offset, bytes: me as unknown as Base58EncodedBytes, encoding: 'base58' } },
              ],
            })
            .send(),
        ),
      )
      const decoder = getVaultDecoder()
      const base64 = getBase64Encoder()
      const seen = new Map<string, VaultInfo>()
      for (const { pubkey, account: acc } of batches.flat()) {
        if (seen.has(pubkey)) continue
        const bytes = base64.encode(acc.data[0])
        const vault = decoder.decode(bytes)
        // A later slot can match bytes that are not a guardian key; confirm membership.
        if (!vault.guardians.includes(me)) continue
        const rentFloor = await client.rpc.getMinimumBalanceForRentExemption(BigInt(bytes.length)).send()
        seen.set(pubkey, toVaultInfo(pubkey, vault, BigInt(acc.lamports), BigInt(rentFloor)))
      }
      return [...seen.values()]
    },
  })
}

export function useGuardedVault(address: Address | undefined) {
  const { client } = useMobileWallet()
  return useQuery({
    queryKey: ['guarded-vault', address],
    enabled: !!address,
    refetchInterval: 15_000,
    queryFn: async () => {
      const account = await fetchMaybeVault(client.rpc, address!)
      if (!account.exists) return null
      const rentFloor = await client.rpc.getMinimumBalanceForRentExemption(BigInt(account.space)).send()
      const vault = toVaultInfo(account.address, account.data, BigInt(account.lamports), BigInt(rentFloor))
      const [pending, events] = await Promise.all([
        fetchPendingWithdrawals(client.rpc, vault.address, vault.epoch),
        fetchVaultEvents(client.rpc, vault.address, 10),
      ])
      return { vault, pending, events }
    },
  })
}

export function useGuardianActions() {
  const send = useSend()
  const queryClient = useQueryClient()
  const refresh = () =>
    Promise.all(
      ['guarded-vaults', 'guarded-vault', 'vault', 'pending'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    )
  const wrap = (fn: () => Promise<string>) =>
    fn().then(async (sig) => {
      await refresh()
      return sig
    })

  return {
    cancel: (vault: Address, pending: Address) =>
      wrap(() => send((authority) => [getCancelWithdrawalInstruction({ authority, vault, pending })])),
    freeze: (vault: Address) => wrap(() => send((authority) => [getLockdownInstruction({ authority, vault })])),
    checkIn: (vault: Address) => wrap(() => send((guardian) => [getGuardianHeartbeatInstruction({ guardian, vault })])),
  }
}

// Guardians see owners by address; a local nickname makes the list readable.
const nicknameKey = (vault: string) => `nest.nickname.${vault}`

export function useNickname(vault: string | undefined) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['nickname', vault],
    enabled: !!vault,
    queryFn: async () => (await AsyncStorage.getItem(nicknameKey(vault!))) ?? '',
  })
  const save = useMutation({
    mutationFn: async (name: string) => AsyncStorage.setItem(nicknameKey(vault!), name.trim()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nickname', vault] }),
  })
  return { nickname: query.data ?? '', save: save.mutateAsync }
}
