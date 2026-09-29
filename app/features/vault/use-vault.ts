import {
  AccountRole,
  address,
  appendTransactionMessageInstructions,
  type Address,
  type Base58EncodedBytes,
  createTransactionMessage,
  getAddressEncoder,
  getBase58Decoder,
  getBase64Encoder,
  getProgramDerivedAddress,
  getU32Encoder,
  getU64Encoder,
  getUtf8Encoder,
  type Instruction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  type Signature,
  type TransactionSigner,
} from '@solana/kit'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { useEffect, useState } from 'react'
import {
  fetchMaybePendingConfig,
  fetchMaybeVault,
  findPendingConfigPda,
  findVaultPda,
  getApplyConfigInstruction,
  getCancelConfigInstruction,
  getCancelWithdrawalInstruction,
  getDepositSolInstruction,
  getExecuteWithdrawalInstruction,
  getInitVaultInstructionAsync,
  getInstantWithdrawInstruction,
  getLockdownInstruction,
  getPendingWithdrawalDecoder,
  getProposeConfigInstruction,
  getRequestWithdrawalInstruction,
  identifyNestVaultEvent,
  NEST_VAULT_PROGRAM_ADDRESS,
  NestVaultEvent,
  parseDepositedEvent,
  parseInstantWithdrawalEvent,
  parseLockdownLiftedEvent,
  parseLockdownTriggeredEvent,
  parseWithdrawalCancelledEvent,
  parseWithdrawalExecutedEvent,
  parseWithdrawalRequestedEvent,
  PENDING_WITHDRAWAL_DISCRIMINATOR,
  Role,
  type Vault,
} from '@/generated/nest-vault'
import { AppConfig } from '@/constants/app-config'
import { getOrCreateSentinel } from './sentinel'
import { markLocalWithdrawal } from './local-withdrawals'

export const NATIVE_SOL = address('11111111111111111111111111111111')
const SYSTEM_PROGRAM = address('11111111111111111111111111111111')
const NATIVE_MINT_ARG = address('11111111111111111111111111111111')

// The program marks native SOL with the all-zero key, which is the System Program address.
// NATIVE_SOL above is therefore the same bytes; kept as a named constant for readability.

export type VaultInfo = {
  address: Address
  owner: Address
  sentinel: Address
  guardians: Address[]
  guardianLastSeen: number[]
  safeList: Address[]
  delaySecs: number
  lockdownSecs: number
  lockdownUntil: number
  epoch: bigint
  nextWithdrawalId: bigint
  lamports: bigint
  /** Spendable SOL: balance minus the rent the vault account must keep. */
  available: bigint
}

export type PendingItem = {
  address: Address
  id: bigint
  mint: Address
  amount: bigint
  destination: Address
  requestedAt: number
  unlockAt: number
  epoch: bigint
  voided: boolean
}

export type ActivityKind =
  | 'deposit'
  | 'withdrawal-requested'
  | 'withdrawal-completed'
  | 'withdrawal-cancelled'
  | 'instant-withdrawal'
  | 'lockdown'
  | 'lockdown-lifted'

export type ActivityItem = {
  signature: string
  blockTime: number
  kind: ActivityKind
  amount?: bigint
  counterparty?: Address
  role?: Role
  expedited?: boolean
}

export type VaultSettings = {
  delaySecs: number
  lockdownSecs: number
  guardians: string[]
  safeList: string[]
}

// ---------------------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------------------

export function useVaultAddress() {
  const { account } = useMobileWallet()
  return useQuery({
    queryKey: ['vault-address', account?.address],
    enabled: !!account,
    staleTime: Infinity,
    queryFn: async () => (await findVaultPda({ owner: account!.address }))[0],
  })
}

export function useVault() {
  const { client } = useMobileWallet()
  const vaultAddress = useVaultAddress()
  return useQuery({
    queryKey: ['vault', vaultAddress.data],
    enabled: !!vaultAddress.data,
    refetchInterval: 20_000,
    queryFn: async (): Promise<VaultInfo | null> => {
      const account = await fetchMaybeVault(client.rpc, vaultAddress.data!)
      if (!account.exists) return null
      const rentFloor = await client.rpc.getMinimumBalanceForRentExemption(BigInt(account.space)).send()
      return toVaultInfo(account.address, account.data, BigInt(account.lamports), BigInt(rentFloor))
    },
  })
}

export function toVaultInfo(address: Address, v: Vault, lamports: bigint, rentFloor: bigint): VaultInfo {
  return {
    address,
    owner: v.owner,
    sentinel: v.sentinel,
    guardians: v.guardians,
    guardianLastSeen: v.guardianLastSeen.map(Number),
    safeList: v.safeList,
    delaySecs: Number(v.delaySecs),
    lockdownSecs: Number(v.lockdownSecs),
    lockdownUntil: Number(v.lockdownUntil),
    epoch: v.epoch,
    nextWithdrawalId: v.nextWithdrawalId,
    lamports,
    available: lamports > rentFloor ? lamports - rentFloor : 0n,
  }
}

export function usePendingWithdrawals() {
  const { client } = useMobileWallet()
  const vault = useVault()
  const vaultAddress = vault.data?.address
  return useQuery({
    queryKey: ['pending', vaultAddress, vault.data?.epoch?.toString()],
    enabled: !!vaultAddress,
    refetchInterval: 15_000,
    queryFn: () => fetchPendingWithdrawals(client.rpc, vaultAddress!, vault.data!.epoch),
  })
}

type NestRpc = ReturnType<typeof useMobileWallet>['client']['rpc']

/** Pending withdrawals for any vault. Used by the owner view and the guardian view. */
export async function fetchPendingWithdrawals(rpc: NestRpc, vault: Address, epoch: bigint): Promise<PendingItem[]> {
  const discriminator = getBase58Decoder().decode(PENDING_WITHDRAWAL_DISCRIMINATOR) as Base58EncodedBytes
  const accounts = await rpc
    .getProgramAccounts(NEST_VAULT_PROGRAM_ADDRESS, {
      encoding: 'base64',
      filters: [
        { memcmp: { offset: 0n, bytes: discriminator, encoding: 'base58' } },
        { memcmp: { offset: 8n, bytes: vault as unknown as Base58EncodedBytes, encoding: 'base58' } },
      ],
    })
    .send()
  const decoder = getPendingWithdrawalDecoder()
  const base64 = getBase64Encoder()
  return accounts
    .map(({ pubkey, account }) => {
      const p = decoder.decode(base64.encode(account.data[0]))
      return {
        address: pubkey,
        id: p.id,
        mint: p.mint,
        amount: p.amount,
        destination: p.destination,
        requestedAt: Number(p.requestedAt),
        unlockAt: Number(p.unlockAt),
        epoch: p.epoch,
        voided: p.epoch !== epoch,
      }
    })
    .sort((a, b) => Number(b.id - a.id))
}

/** Decoded vault events from its recent transactions, newest first. */
export async function fetchVaultEvents(rpc: NestRpc, vault: Address, limit = 15): Promise<ActivityItem[]> {
  const signatures = await rpc.getSignaturesForAddress(vault, { limit }).send()
  const txs = await Promise.all(
    signatures
      .filter((s) => !s.err)
      .map((s) =>
        rpc
          .getTransaction(s.signature, { maxSupportedTransactionVersion: 0, encoding: 'json' })
          .send()
          .then((tx) => ({ signature: s.signature, blockTime: Number(s.blockTime ?? 0), logs: tx?.meta?.logMessages ?? [] })),
      ),
  )
  const items: ActivityItem[] = []
  for (const tx of txs) {
    for (const line of tx.logs) {
      if (!line.startsWith('Program data: ')) continue
      const item = parseEventLine(line.slice('Program data: '.length))
      if (item) items.push({ signature: tx.signature, blockTime: tx.blockTime, ...item })
    }
  }
  return items.sort((a, b) => b.blockTime - a.blockTime)
}

export function usePendingConfig() {
  const { client } = useMobileWallet()
  const vault = useVault()
  return useQuery({
    queryKey: ['pending-config', vault.data?.address, vault.data?.epoch?.toString()],
    enabled: !!vault.data,
    refetchInterval: 30_000,
    queryFn: async () => {
      const [configAddress] = await findPendingConfigPda({ vault: vault.data!.address })
      const account = await fetchMaybePendingConfig(client.rpc, configAddress)
      if (!account.exists) return null
      return {
        address: configAddress,
        applyAt: Number(account.data.applyAt),
        voided: account.data.epoch !== vault.data!.epoch,
        params: {
          delaySecs: Number(account.data.params.delaySecs),
          lockdownSecs: Number(account.data.params.lockdownSecs),
          guardians: account.data.params.guardians as string[],
          safeList: account.data.params.safeList as string[],
        },
      }
    },
  })
}

export function useWalletBalance() {
  const { account, client } = useMobileWallet()
  return useQuery({
    queryKey: ['wallet-balance', account?.address],
    enabled: !!account,
    refetchInterval: 20_000,
    queryFn: async () => (await client.rpc.getBalance(account!.address).send()).value,
  })
}

const WSOL = 'So11111111111111111111111111111111111111112'

export function useSolPrice() {
  return useQuery({
    queryKey: ['sol-price'],
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<number | null> => {
      try {
        const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${WSOL}`)
        const json = await res.json()
        const price = json?.[WSOL]?.usdPrice
        if (typeof price === 'number') return price
      } catch {}
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
        const json = await res.json()
        const price = json?.solana?.usd
        if (typeof price === 'number') return price
      } catch {}
      return null
    },
  })
}

/** Difference between the chain's clock and this phone's clock, in seconds. */
function useChainClockOffset() {
  const { client } = useMobileWallet()
  return useQuery({
    queryKey: ['chain-clock-offset'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const slot = await client.rpc.getSlot({ commitment: 'confirmed' }).send()
      const blockTime = await client.rpc.getBlockTime(slot).send()
      return blockTime == null ? 0 : Number(blockTime) - Date.now() / 1000
    },
  })
}

/**
 * Current time on the chain's clock, ticking every second. Countdowns use this so they
 * match what the program will enforce; the program alone decides when funds unlock.
 */
export function useChainNow() {
  const offset = useChainClockOffset().data ?? 0
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000 + offset))
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000 + offset))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [offset])
  return now
}

export function useVaultActivity() {
  const { client } = useMobileWallet()
  const vault = useVault()
  const vaultAddress = vault.data?.address
  return useQuery({
    queryKey: ['activity', vaultAddress],
    enabled: !!vaultAddress,
    refetchInterval: 30_000,
    queryFn: () => fetchVaultEvents(client.rpc, vaultAddress!),
  })
}

function parseEventLine(b64: string): Omit<ActivityItem, 'signature' | 'blockTime'> | null {
  let data: Uint8Array
  try {
    data = new Uint8Array(getBase64Encoder().encode(b64))
  } catch {
    return null
  }
  let kind: NestVaultEvent
  try {
    kind = identifyNestVaultEvent(data)
  } catch {
    return null
  }
  switch (kind) {
    case NestVaultEvent.Deposited: {
      const e = parseDepositedEvent(data)
      return { kind: 'deposit', amount: e.amount, counterparty: e.from }
    }
    case NestVaultEvent.WithdrawalRequested: {
      const e = parseWithdrawalRequestedEvent(data)
      return { kind: 'withdrawal-requested', amount: e.amount, counterparty: e.destination }
    }
    case NestVaultEvent.WithdrawalExecuted: {
      const e = parseWithdrawalExecutedEvent(data)
      return { kind: 'withdrawal-completed', amount: e.amount, expedited: e.expedited }
    }
    case NestVaultEvent.WithdrawalCancelled: {
      const e = parseWithdrawalCancelledEvent(data)
      return { kind: 'withdrawal-cancelled', counterparty: e.by, role: e.role }
    }
    case NestVaultEvent.InstantWithdrawal: {
      const e = parseInstantWithdrawalEvent(data)
      return { kind: 'instant-withdrawal', amount: e.amount, counterparty: e.destination }
    }
    case NestVaultEvent.LockdownTriggered: {
      const e = parseLockdownTriggeredEvent(data)
      return { kind: 'lockdown', counterparty: e.by, role: e.role }
    }
    case NestVaultEvent.LockdownLifted: {
      const e = parseLockdownLiftedEvent(data)
      return { kind: 'lockdown-lifted', counterparty: e.guardian }
    }
    default:
      return null
  }
}

// ---------------------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------------------

/**
 * Signs with the connected wallet over MWA and waits for confirmation. The same MWA signer
 * object is the fee payer and the signer inside every instruction, so Kit sees one signer.
 */
export function useSend() {
  const { account, client, getTransactionSigner } = useMobileWallet()
  return async function send(build: (signer: TransactionSigner) => Promise<Instruction[]> | Instruction[]) {
    if (!account) throw new Error('Connect a wallet first.')
    const { value: blockhash, context } = await client.rpc.getLatestBlockhash({ commitment: 'confirmed' }).send()
    const signer = getTransactionSigner(account.address, context.slot)
    const instructions = await build(signer)
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayerSigner(signer, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
      (tx) => appendTransactionMessageInstructions(instructions, tx),
    )
    const signatureBytes = await signAndSendTransactionMessageWithSigners(message)
    const signature = getBase58Decoder().decode(signatureBytes) as Signature
    await waitForConfirmation(client.rpc, signature)
    return signature
  }
}

async function waitForConfirmation(rpc: ReturnType<typeof useMobileWallet>['client']['rpc'], signature: Signature) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    const { value } = await rpc.getSignatureStatuses([signature]).send()
    const status = value[0]
    if (status?.err) throw new Error(`Transaction failed: ${JSON.stringify(status.err, bigintReplacer)}`)
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') return
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('Timed out waiting for confirmation. Check Activity in a moment.')
}

function bigintReplacer(_: string, v: unknown) {
  return typeof v === 'bigint' ? v.toString() : v
}

/** System Program transfer, built by hand to avoid another dependency. */
export function transferSol(source: TransactionSigner, destination: Address, lamports: bigint): Instruction {
  const data = new Uint8Array(12)
  data.set(getU32Encoder().encode(2), 0)
  data.set(getU64Encoder().encode(lamports), 4)
  return {
    programAddress: SYSTEM_PROGRAM,
    accounts: [
      { address: source.address, role: AccountRole.WRITABLE_SIGNER, signer: source } as never,
      { address: destination, role: AccountRole.WRITABLE },
    ],
    data,
  }
}

async function pendingWithdrawalAddress(vault: Address, id: bigint) {
  const [pda] = await getProgramDerivedAddress({
    programAddress: NEST_VAULT_PROGRAM_ADDRESS,
    seeds: [getUtf8Encoder().encode('withdrawal'), getAddressEncoder().encode(vault), getU64Encoder().encode(id)],
  })
  return pda
}

// ---------------------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------------------

export function useVaultActions() {
  const send = useSend()
  const queryClient = useQueryClient()
  const { account, client } = useMobileWallet()
  const vaultAddress = useVaultAddress().data

  const refresh = () =>
    Promise.all(
      ['vault', 'pending', 'pending-config', 'wallet-balance', 'activity'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    )

  const run = async <T>(fn: () => Promise<T>) => {
    const out = await fn()
    await refresh()
    return out
  }

  return {
    async createVault(settings: VaultSettings) {
      if (!account) throw new Error('Connect a wallet first.')
      const sentinel = await getOrCreateSentinel(account.address)
      return run(() =>
        send(async (owner) => [
          await getInitVaultInstructionAsync({
            owner,
            params: {
              sentinel: sentinel.address,
              guardians: settings.guardians.map((g) => address(g)),
              safeList: settings.safeList.map((s) => address(s)),
              delaySecs: settings.delaySecs,
              lockdownSecs: settings.lockdownSecs,
            },
          }),
          // Fund the sentinel so it can pay for a silent lockdown later.
          transferSol(owner, sentinel.address, AppConfig.sentinelFundingLamports),
        ]),
      )
    },

    async depositSol(lamports: bigint) {
      return run(() => send((owner) => [getDepositSolInstruction({ depositor: owner, vault: vaultAddress!, amount: lamports })]))
    },

    async requestWithdrawal(lamports: bigint, destination: string) {
      const vault = await fetchMaybeVault(client.rpc, vaultAddress!)
      if (!vault.exists) throw new Error('Vault not found.')
      const id = vault.data.nextWithdrawalId
      const pending = await pendingWithdrawalAddress(vaultAddress!, id)
      markLocalWithdrawal(pending)
      const signature = await run(() =>
        send((owner) => [
          getRequestWithdrawalInstruction({
            owner,
            vault: vaultAddress!,
            pending,
            mint: NATIVE_MINT_ARG,
            amount: lamports,
            destination: address(destination),
          }),
        ]),
      )
      return { signature, pending }
    },

    async cancelWithdrawal(pending: Address) {
      return run(() =>
        send((authority) => [getCancelWithdrawalInstruction({ authority, vault: vaultAddress!, pending })]),
      )
    },

    async executeWithdrawal(item: PendingItem) {
      return run(() =>
        send(() => [
          getExecuteWithdrawalInstruction({ vault: vaultAddress!, pending: item.address, destination: item.destination }),
        ]),
      )
    },

    async instantWithdraw(lamports: bigint, destination: string) {
      return run(() =>
        send((owner) => [
          getInstantWithdrawInstruction({
            owner,
            vault: vaultAddress!,
            destination: address(destination),
            mintArg: NATIVE_MINT_ARG,
            amount: lamports,
          }),
        ]),
      )
    },

    async lockdown() {
      return run(() => send((authority) => [getLockdownInstruction({ authority, vault: vaultAddress! })]))
    },

    async proposeConfig(current: VaultInfo, next: Partial<VaultSettings>) {
      const [pendingConfig] = await findPendingConfigPda({ vault: vaultAddress! })
      return run(() =>
        send((owner) => [
          getProposeConfigInstruction({
            owner,
            vault: vaultAddress!,
            pendingConfig,
            params: {
              sentinel: current.sentinel,
              guardians: (next.guardians ?? current.guardians).map((g) => address(g)),
              safeList: (next.safeList ?? current.safeList).map((s) => address(s)),
              delaySecs: next.delaySecs ?? current.delaySecs,
              lockdownSecs: next.lockdownSecs ?? current.lockdownSecs,
            },
          }),
        ]),
      )
    },

    async applyConfig() {
      const [pendingConfig] = await findPendingConfigPda({ vault: vaultAddress! })
      return run(() => send(() => [getApplyConfigInstruction({ vault: vaultAddress!, pendingConfig })]))
    },

    async cancelConfig() {
      const [pendingConfig] = await findPendingConfigPda({ vault: vaultAddress! })
      return run(() =>
        send((authority) => [getCancelConfigInstruction({ authority, vault: vaultAddress!, pendingConfig })]),
      )
    },
  }
}

/** Wraps an action with loading and error state for buttons. */
export function useAction<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>) {
  return useMutation({ mutationFn: (args: TArgs) => fn(...args) })
}
