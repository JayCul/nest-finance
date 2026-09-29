// QR payload for guardian invites: the guardian shows it, the owner scans it.

import { isAddress } from '@solana/kit'

const PREFIX = 'nestfinance:guardian:'

export const encodeGuardianCode = (address: string) => `${PREFIX}${address}`

/** Accepts our QR payload, a solana: URI or a bare address. */
export function decodeGuardianCode(raw: string): string | null {
  const value = raw.trim().replace(PREFIX, '').replace(/^solana:/, '').split('?')[0]
  return isAddress(value) ? value : null
}

// Hand-off from the scanner screen back to the screen that opened it.
let scanned: string | null = null
export const setScannedGuardian = (address: string) => {
  scanned = address
}
export const takeScannedGuardian = () => {
  const value = scanned
  scanned = null
  return value
}
