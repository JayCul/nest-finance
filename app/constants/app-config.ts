import { AppIdentity, createSolanaDevnet, SolanaCluster } from '@wallet-ui/react-native-kit'

export class AppConfig {
  static identity: AppIdentity = { name: 'Nest Finance', uri: 'https://github.com/JayCul/nest-finance' }
  static networks: SolanaCluster[] = [createSolanaDevnet({ url: 'https://api.devnet.solana.com' })]
  /** SOL kept in the app's sentinel key so it can pay for a silent lockdown. */
  static sentinelFundingLamports = 10_000_000n
  static explorerCluster = 'devnet'
  /** Circle's devnet USDC. Mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v */
  static usdcMint = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
}
