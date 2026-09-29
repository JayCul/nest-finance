import { AppIdentity, createSolanaDevnet, SolanaCluster } from '@wallet-ui/react-native-kit'

export class AppConfig {
  /**
   * Wallets show `icon` resolved against `uri`. Until Nest Finance has its own site, the uri
   * points at the repo's raw files so the icon loads from app/assets/images/icon.png.
   */
  static identity: AppIdentity = {
    name: 'Nest Finance',
    uri: 'https://raw.githubusercontent.com/JayCul/nest-finance/main/',
    icon: 'app/assets/images/icon.png',
  }
  static networks: SolanaCluster[] = [createSolanaDevnet({ url: 'https://api.devnet.solana.com' })]
  /** SOL kept in the app's sentinel key so it can pay for a silent lockdown. */
  static sentinelFundingLamports = 10_000_000n
  static explorerCluster = 'devnet'
  /** Circle's devnet USDC. Mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v */
  static usdcMint = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
  /**
   * Token used for guardian rewards. SKR doesn't exist on devnet, so this is a 6-decimal
   * devnet stand-in created by scripts/create-test-skr.mjs. On mainnet: the SKR mint.
   */
  static skrMint = 'HYbj4Vt96vUAdseQ4D8qQyE1jds3pfwKrnVpL7AUvvtZ'
  static skrDecimals = 6
}
