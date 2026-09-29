// App PIN, backup (duress) PIN and guardian contacts, kept in expo-secure-store.
// PINs are stored only as salted SHA-256 hashes.

import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'
import * as SecureStore from 'expo-secure-store'

const PINS_KEY = 'nest.pins.v1'
const CONTACTS_KEY = 'nest.guardian-contacts.v1'

type StoredPins = { salt: string; real: string; duress: string }

export type GuardianContact = { name: string; phone: string }

export type PinResult = 'real' | 'duress' | 'wrong'

function hash(salt: string, pin: string) {
  return bytesToHex(sha256(utf8ToBytes(`${salt}:${pin}`)))
}

async function readPins(): Promise<StoredPins | null> {
  const raw = await SecureStore.getItemAsync(PINS_KEY)
  return raw ? (JSON.parse(raw) as StoredPins) : null
}

export async function hasPins() {
  return (await readPins()) != null
}

export async function savePins(realPin: string, duressPin: string) {
  if (realPin === duressPin) throw new Error('The two PINs must be different.')
  const saltBytes = new Uint8Array(16)
  crypto.getRandomValues(saltBytes)
  const salt = bytesToHex(saltBytes)
  const stored: StoredPins = { salt, real: hash(salt, realPin), duress: hash(salt, duressPin) }
  await SecureStore.setItemAsync(PINS_KEY, JSON.stringify(stored))
}

/** Always hashes against both stored PINs so both paths take the same time. */
export async function checkPin(pin: string): Promise<PinResult> {
  const stored = await readPins()
  if (!stored) return 'real'
  const candidate = hash(stored.salt, pin)
  const isReal = candidate === stored.real
  const isDuress = candidate === stored.duress
  return isReal ? 'real' : isDuress ? 'duress' : 'wrong'
}

export async function clearPins() {
  await SecureStore.deleteItemAsync(PINS_KEY)
}

export async function loadContacts(): Promise<GuardianContact[]> {
  const raw = await SecureStore.getItemAsync(CONTACTS_KEY)
  return raw ? (JSON.parse(raw) as GuardianContact[]) : []
}

export async function saveContacts(contacts: GuardianContact[]) {
  await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(contacts))
}
