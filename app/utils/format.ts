export const LAMPORTS_PER_SOL = 1_000_000_000n

export function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / 1e9
}

export function solToLamports(sol: string | number): bigint {
  const n = typeof sol === 'number' ? sol : Number(sol.replace(/,/g, ''))
  if (!Number.isFinite(n) || n <= 0) return 0n
  return BigInt(Math.round(n * 1e9))
}

export function formatSol(lamports: bigint | number, digits = 4): string {
  const sol = lamportsToSol(lamports)
  return `${sol.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 })} SOL`
}

export function shortAddress(address: string, chars = 4): string {
  return address.length <= chars * 2 + 3 ? address : `${address.slice(0, chars)}…${address.slice(-chars)}`
}

/** 172800 → "48 hours", 120 → "2 minutes", 604800 → "7 days". */
export function formatDuration(secs: number): string {
  if (secs % 86400 === 0 && secs >= 86400 * 3) return plural(secs / 86400, 'day')
  if (secs % 3600 === 0 && secs >= 3600) return plural(secs / 3600, 'hour')
  if (secs % 60 === 0 && secs >= 60) return plural(secs / 60, 'minute')
  return plural(secs, 'second')
}

/** Short form for chips: "48h", "7d", "2m". */
export function formatDurationShort(secs: number): string {
  if (secs % 86400 === 0 && secs >= 86400 * 3) return `${secs / 86400}d`
  if (secs % 3600 === 0 && secs >= 3600) return `${secs / 3600}h`
  if (secs % 60 === 0 && secs >= 60) return `${secs / 60}m`
  return `${secs}s`
}

function plural(n: number, unit: string) {
  return `${n} ${unit}${n === 1 ? '' : 's'}`
}

/** Seconds remaining → "46:21:08" (or "2d 04:10:00" past a day). */
export function formatCountdown(secs: number): string {
  const s = Math.max(0, Math.floor(secs))
  const days = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const hms = [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':')
  return days > 0 ? `${days}d ${hms}` : hms
}

/** Unix seconds → "Today · 4:20 PM", "Yesterday · 9:02 AM", "Tomorrow · 4:20 PM" or "12 Oct · 4:20 PM". */
export function formatWhen(unixSecs: number, nowMs = Date.now()): string {
  const d = new Date(unixSecs * 1000)
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const dayDiff = Math.round((startOfDay(d) - startOfDay(new Date(nowMs))) / 86400000)
  const day =
    dayDiff === 0
      ? 'Today'
      : dayDiff === -1
        ? 'Yesterday'
        : dayDiff === 1
          ? 'Tomorrow'
          : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  return `${day} · ${time}`
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function usd(sol: number, price: number | null | undefined): number | null {
  return price == null ? null : sol * price
}
