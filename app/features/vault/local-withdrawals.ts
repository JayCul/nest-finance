// Withdrawals requested from this phone in this session. The watcher skips these so the
// "Was this you?" alert only fires for requests made somewhere else (a drainer, or a
// coerced signature on another device).

const local = new Set<string>()

export function markLocalWithdrawal(pending: string) {
  local.add(pending)
}

export function isLocalWithdrawal(pending: string) {
  return local.has(pending)
}

/** When this app session started, in unix seconds. */
const sessionStart = Math.floor(Date.now() / 1000)

/**
 * Whether this phone made a withdrawal request: true if it did, false if the request appeared
 * while the app was running but was not made here, undefined when it cannot be known.
 */
export function madeOnThisPhone(pending: string, requestedAt: number): boolean | undefined {
  if (local.has(pending)) return true
  return requestedAt > sessionStart + 5 ? false : undefined
}
