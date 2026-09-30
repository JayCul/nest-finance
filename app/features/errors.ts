// Turns anything thrown by the wallet, the network or the program into one plain sentence.
// Raw messages (Java exceptions, JSON, hex codes) never reach the screen; they go to the log.

import { AppConfig } from '@/constants/app-config'

/** An error whose message is already written for the person using the app. */
export class UserError extends Error {}

// Program errors (programs/nest_vault/src/errors.rs), numbered from 6000.
const PROGRAM_ERRORS: Record<number, string> = {
  6000: 'This wallet is not allowed to do that on these savings.',
  6001: 'Only a guardian of these savings can do that.',
  6002: 'These savings are frozen right now. Nothing can leave until the freeze ends.',
  6003: 'These savings are not frozen.',
  6004: 'This withdrawal is still inside its protection window. Try again when the countdown ends.',
  6005: 'This settings change is still inside its protection window. Try again when it is ready.',
  6006: 'This request was cancelled by a freeze.',
  6007: 'That address is not on your safe list.',
  6008: 'Enter an amount greater than zero.',
  6009: 'There is not enough in your savings for that.',
  6010: 'This token needs a token account first. Try again.',
  6011: 'That token does not match this request.',
  6012: 'That destination does not match this request.',
  6013: 'You cannot send savings back to the vault itself.',
  6014: 'You can have up to 3 guardians.',
  6015: 'You can have up to 5 safe addresses.',
  6016: 'Choose a delay between 1 minute and 30 days.',
  6017: 'This phone\'s protection key is not set up correctly. Open Settings and try again.',
  6018: 'One of the addresses is empty.',
  6019: 'The same address cannot be both a guardian and a safe address, or be used twice.',
  6020: 'That amount is too large.',
}

const lowSol = AppConfig.isDevnet
  ? 'Not enough SOL to pay for this. Get free test SOL from Home, then try again.'
  : 'Not enough SOL to pay for this. Add some SOL, then try again.'

/**
 * A readable message for an error, or null when the person simply cancelled in their wallet
 * (nothing went wrong, so nothing to show).
 */
export function friendlyError(e: unknown): string | null {
  if (e instanceof UserError) return e.message
  const text = describe(e)
  console.warn('[nest] error:', text)

  // Cancelled or declined in the wallet.
  if (/cancellationexception|association_cancelled|authorization_failed|not_signed|user (rejected|declined|cancel)|request (was )?(rejected|declined|cancel)|cancel+ed by (the )?user|"code":-[13]\b/i.test(text)) {
    return null
  }
  if (/wallet_not_found|no (installed )?wallet|activitynotfound/i.test(text)) {
    return 'No wallet app found. Install a Solana wallet that supports Mobile Wallet Adapter, then try again.'
  }

  const custom = customCode(text)
  if (custom != null && PROGRAM_ERRORS[custom]) return PROGRAM_ERRORS[custom]

  if (/insufficient.?funds.?for.?(fee|rent)|insufficient lamports|no record of a prior credit|insufficientfunds/i.test(text)) return lowSol
  // Code 1 from the System or Token program: the payer or token account is short.
  if (custom === 1) return 'Not enough balance for that. Top up and try again.'
  if (custom === 0) return 'This already exists. Pull down to refresh.'

  if (/blockhash not found|block height exceeded|blockhash.?expired|transaction.?expired/i.test(text)) {
    return 'The request expired before it was approved. Please try again.'
  }
  if (/timed out waiting for confirmation/i.test(text)) {
    return 'Still waiting for the network to confirm. Check Activity in a moment.'
  }
  if (/session_(closed|timeout)|illegal_transport_state|reauthoriz|auth.?token/i.test(text)) {
    return 'The connection to your wallet was interrupted. Please try again.'
  }
  if (/network request failed|failed to fetch|fetch failed|too many requests|\b429\b|econn|enotfound|socket|http error|timeout/i.test(text)) {
    return "Can't reach Solana right now. Check your connection and try again."
  }
  // The wallet rejects a request that sat unapproved long enough for its blockhash to expire.
  if (/invalid_payloads|payloads invalid|"code":-2\b/i.test(text)) {
    return "Your wallet couldn't sign this. The request may have expired, so please try again."
  }
  if (/not_submitted|"code":-4\b/i.test(text)) {
    return "Your wallet couldn't send the transaction. Please try again."
  }
  return 'Something went wrong. Please try again.'
}

/** Every message, code and nested cause, flattened into searchable text. */
function describe(e: unknown, depth = 0): string {
  if (e == null || depth > 4) return ''
  if (typeof e !== 'object') return String(e)
  const err = e as { name?: string; message?: string; code?: unknown; context?: unknown; cause?: unknown; data?: unknown }
  const parts = [err.name, err.message, err.code != null ? `"code":${JSON.stringify(err.code)}` : undefined]
  try {
    if (err.context) parts.push(JSON.stringify(err.context, (_, v) => (typeof v === 'bigint' ? v.toString() : v)))
    if (err.data) parts.push(JSON.stringify(err.data))
  } catch {
    // Unserializable context: the message is enough.
  }
  if (err.cause) parts.push(describe(err.cause, depth + 1))
  return parts.filter(Boolean).join(' | ')
}

/** A custom program error code from logs ("0x1774"), JSON ({"Custom":6004}) or Kit's error context. */
function customCode(text: string): number | null {
  const hex = text.match(/custom program error: 0x([0-9a-f]+)/i)
  if (hex) return parseInt(hex[1], 16)
  const json = text.match(/"Custom":\s*(\d+)/)
  if (json) return Number(json[1])
  const kit = text.match(/"code":\s*(\d{1,5})\b[^|]*"index":|"index":\s*\d+[^|]*"code":\s*(\d{1,5})\b/)
  if (kit) return Number(kit[1] ?? kit[2])
  return null
}
