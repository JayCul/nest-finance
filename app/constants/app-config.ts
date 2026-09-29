import { AppIdentity, createSolanaDevnet, SolanaCluster } from '@wallet-ui/react-native-kit'

export class AppConfig {
  static identity: AppIdentity = { name: 'Nest Finance', uri: 'https://github.com/JayCul/nest-finance' }
  static networks: SolanaCluster[] = [createSolanaDevnet({ url: 'https://api.devnet.solana.com' })]
  /** SOL kept in the app's sentinel key so it can pay for a silent lockdown. */
  static sentinelFundingLamports = 10_000_000n
  static explorerCluster = 'devnet'
}
