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
