import { useQueryClient } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { findVaultPda } from '@/generated/nest-vault'
import { triggerDuress } from './duress'
import { checkPin, hasPins } from './security-store'

export type SecurityMode = 'loading' | 'locked' | 'real' | 'duress'

type SecurityContextValue = {
  mode: SecurityMode
  pinsEnabled: boolean
  /** True while practising: the backup PIN opens the simple view but does not freeze savings. */
  drill: boolean
  unlock(pin: string): Promise<'ok' | 'wrong'>
  lock(): void
  startDrill(): void
  refresh(): Promise<void>
}

const SecurityContext = createContext<SecurityContextValue>({} as SecurityContextValue)

/** Relock after this long in the background. Signing briefly backgrounds the app for the wallet sheet. */
const RELOCK_AFTER_MS = 60_000
/** Both PINs take the same time to accept. */
const UNLOCK_DELAY_MS = 450

export function SecurityProvider({ children }: PropsWithChildren) {
  const { account, client } = useMobileWallet()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<SecurityMode>('loading')
  const [pinsEnabled, setPinsEnabled] = useState(false)
  const [drill, setDrill] = useState(false)
  const drillRef = useRef(false)
  const backgroundedAt = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    const enabled = await hasPins()
    setPinsEnabled(enabled)
    setMode((m) => (m === 'loading' ? (enabled ? 'locked' : 'real') : m))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundedAt.current = Date.now()
      if (state === 'active' && backgroundedAt.current != null) {
        const away = Date.now() - backgroundedAt.current
        backgroundedAt.current = null
        if (pinsEnabled && away > RELOCK_AFTER_MS) setMode('locked')
      }
    })
    return () => sub.remove()
  }, [pinsEnabled])

  const unlock = useCallback(
    async (pin: string) => {
      const started = Date.now()
      const result = await checkPin(pin)
      const wait = UNLOCK_DELAY_MS - (Date.now() - started)
      if (wait > 0) await new Promise((r) => setTimeout(r, wait))
      if (result === 'wrong') return 'wrong'

      if (result === 'real') {
        drillRef.current = false
        setDrill(false)
        setMode('real')
        queryClient.invalidateQueries()
        return 'ok'
      }

      // Duress: show the simple view immediately, then act in the background.
      const isDrill = drillRef.current
      setMode('duress')
      if (account) {
        findVaultPda({ owner: account.address })
          .then(([vault]) => triggerDuress({ rpc: client.rpc, owner: account.address, vault, drill: isDrill }))
          .catch(() => {})
      }
      return 'ok'
    },
    [account, client.rpc, queryClient],
  )

  const lock = useCallback(() => {
    if (pinsEnabled) setMode('locked')
  }, [pinsEnabled])

  const startDrill = useCallback(() => {
    drillRef.current = true
    setDrill(true)
    setMode('locked')
  }, [])

  const value = useMemo(
    () => ({ mode, pinsEnabled, drill, unlock, lock, startDrill, refresh }),
    [mode, pinsEnabled, drill, unlock, lock, startDrill, refresh],
  )
  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>
}

export function useSecurity() {
  return useContext(SecurityContext)
}

export function useIsDuress() {
  return useContext(SecurityContext).mode === 'duress'
}
