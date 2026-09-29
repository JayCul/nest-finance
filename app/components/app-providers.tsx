import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MobileWalletProvider } from '@wallet-ui/react-native-kit'
import { PropsWithChildren } from 'react'
import { AppConfig } from '@/constants/app-config'
import { NetworkProvider } from '@/features/network/network-provider'
import { SecurityProvider } from '@/features/security/session'

const queryClient = new QueryClient()

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider
        networks={AppConfig.networks}
        render={({ selectedNetwork }) => (
          <MobileWalletProvider cluster={selectedNetwork} identity={AppConfig.identity}>
            <SecurityProvider>{children}</SecurityProvider>
          </MobileWalletProvider>
        )}
      />
    </QueryClientProvider>
  )
}
