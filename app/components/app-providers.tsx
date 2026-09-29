import {
  createDefaultRpcTransport,
  createRpc,
  createSolanaRpcApi,
  createSolanaRpcSubscriptions,
  DEFAULT_RPC_CONFIG,
  type Rpc,
  type SolanaRpcApi,
} from '@solana/kit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type Client, MobileWalletProvider } from '@wallet-ui/react-native-kit'
import { PropsWithChildren } from 'react'
import { AppConfig } from '@/constants/app-config'
import { NetworkProvider } from '@/features/network/network-provider'
import { SecurityProvider } from '@/features/security/session'

const queryClient = new QueryClient()

// Reads default to 'confirmed' instead of Kit's 'finalized', so a cancel, deposit or freeze
// shows up within a couple of seconds rather than ~13s later.
function createClient(cluster: { url: string; urlWs?: string }): Client {
  const rpc: Rpc<SolanaRpcApi> = createRpc({
    api: createSolanaRpcApi({ ...DEFAULT_RPC_CONFIG, defaultCommitment: 'confirmed' }),
    transport: createDefaultRpcTransport({ url: cluster.url }),
  })
  const rpcSubscriptions = createSolanaRpcSubscriptions(cluster.urlWs ?? cluster.url.replace(/^http/, 'ws'))
  return { rpc, rpcSubscriptions }
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider
        networks={AppConfig.networks}
        render={({ selectedNetwork }) => (
          <MobileWalletProvider cluster={selectedNetwork} identity={AppConfig.identity} createClient={createClient}>
            <SecurityProvider>{children}</SecurityProvider>
          </MobileWalletProvider>
        )}
      />
    </QueryClientProvider>
  )
}
