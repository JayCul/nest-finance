// What happens, silently, when the backup (duress) PIN is entered:
//   1. The sentinel key locks the vault on-chain. No wallet prompt, nothing on screen.
//   2. Guardians get an SMS with the phone's location.
// Both run in the background after the decoy view is already showing.

import {
  type Address,
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  type Rpc,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type SolanaRpcApi,
} from '@solana/kit'
import * as Location from 'expo-location'
import * as SecureStore from 'expo-secure-store'
import { getLockdownInstruction } from '@/generated/nest-vault'
import { NestSms } from '@/modules/nest-sms'
import { loadSentinel } from '@/features/vault/sentinel'
import { loadContacts } from './security-store'

const LOG_KEY = 'nest.duress-log.v1'

export type DuressLogEntry = {
  at: number
  drill: boolean
  lockdown: 'sent' | 'skipped' | 'failed'
  lockdownSignature?: string
  lockdownError?: string
  smsSent: number
  smsError?: string
  location?: string
}

export async function triggerDuress(params: {
  rpc: Rpc<SolanaRpcApi>
  owner: Address
  vault: Address | undefined
  drill: boolean
}): Promise<DuressLogEntry> {
  const entry: DuressLogEntry = { at: Date.now(), drill: params.drill, lockdown: 'skipped', smsSent: 0 }

  // Location is a bonus: never let it hold up the freeze or the text.
  const location = Promise.race([getLocationLink().catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 5000))])
  const lockdown = params.drill || !params.vault ? Promise.resolve(null) : silentLockdown(params.rpc, params.owner, params.vault)

  const [lockResult, locationLink] = await Promise.allSettled([lockdown, location])
  if (lockResult.status === 'fulfilled' && lockResult.value) {
    entry.lockdown = 'sent'
    entry.lockdownSignature = lockResult.value
  } else if (lockResult.status === 'rejected') {
    entry.lockdown = 'failed'
    entry.lockdownError = String(lockResult.reason?.message ?? lockResult.reason)
  }
  entry.location = locationLink.status === 'fulfilled' ? (locationLink.value ?? undefined) : undefined

  try {
    entry.smsSent = await alertGuardians(params.drill, entry.location, entry.lockdown === 'sent')
  } catch (e) {
    entry.smsError = String((e as Error)?.message ?? e)
  }

  await appendLog(entry)
  return entry
}

/** Locks the vault with the sentinel key, which also pays the fee. Retries a few times. */
async function silentLockdown(rpc: Rpc<SolanaRpcApi>, owner: Address, vault: Address): Promise<string> {
  const sentinel = await loadSentinel(owner)
  if (!sentinel) throw new Error('No sentinel key on this phone')

  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send()
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(sentinel, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
        (tx) => appendTransactionMessageInstructions([getLockdownInstruction({ authority: sentinel, vault })], tx),
      )
      const signed = await signTransactionMessageWithSigners(message)
      const signature = getSignatureFromTransaction(signed)
      await rpc
        .sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: 'base64', preflightCommitment: 'confirmed' })
        .send()
      await waitForConfirmation(rpc, signature)
      return signature
    } catch (e) {
      lastError = e
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

async function waitForConfirmation(rpc: Rpc<SolanaRpcApi>, signature: string) {
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    const { value } = await rpc.getSignatureStatuses([signature as never]).send()
    const status = value[0]
    if (status?.err) throw new Error('Lockdown transaction failed on-chain')
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') return
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('Lockdown not confirmed in time')
}

async function getLocationLink(): Promise<string | null> {
  const { status } = await Location.getForegroundPermissionsAsync()
  if (status !== 'granted') return null
  // With location services off, any position request can end in a system dialog. Skip it.
  if (!(await Location.hasServicesEnabledAsync())) return null
  const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 })
  // Never let Android show its "turn on location accuracy" dialog here: it would appear in
  // front of whoever is holding the phone. Setup asks for it at a safe moment instead.
  const position =
    last ??
    (await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: false }).catch(
        () => null,
      ),
      new Promise<null>((r) => setTimeout(() => r(null), 8000)),
    ]))
  if (!position) return null
  const { latitude, longitude } = position.coords
  return `https://maps.google.com/?q=${latitude.toFixed(5)},${longitude.toFixed(5)}`
}

async function alertGuardians(drill: boolean, location: string | undefined, locked: boolean): Promise<number> {
  const contacts = await loadContacts()
  if (contacts.length === 0) return 0
  if (!NestSms.canSend()) throw new Error('SMS permission not granted')
  const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const lines = [
    drill ? 'NEST FINANCE DRILL (practice only, no action needed).' : 'NEST FINANCE ALERT.',
    drill
      ? 'Your contact is practising their emergency PIN.'
      : 'Your contact just opened their wallet with their emergency PIN. They may not be safe.',
    locked ? 'Their savings are frozen.' : undefined,
    location ? `Location (${time}): ${location}` : `Time: ${time}`,
    drill ? undefined : 'Do not call them. Check in safely or contact local authorities.',
  ].filter(Boolean)
  let sent = 0
  for (const c of contacts) {
    await NestSms.send(c.phone, lines.join('\n'))
    sent++
  }
  return sent
}

async function appendLog(entry: DuressLogEntry) {
  const existing = await readDuressLog()
  await SecureStore.setItemAsync(LOG_KEY, JSON.stringify([entry, ...existing].slice(0, 10)))
}

export async function readDuressLog(): Promise<DuressLogEntry[]> {
  const raw = await SecureStore.getItemAsync(LOG_KEY)
  return raw ? (JSON.parse(raw) as DuressLogEntry[]) : []
}
