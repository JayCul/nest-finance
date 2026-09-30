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
  /** Devnet build: offers the SOL faucet and defaults new vaults to demo timers. */
  static isDevnet = true
  static faucetUrl = 'https://faucet.solana.com'
  /** Below this the faucet prompt shows. Creating a vault costs about 0.02 SOL including the sentinel's float. */
  static lowSolLamports = 50_000_000n
  /** Circle's devnet USDC. Mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v */
  static usdcMint = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
  /**
   * Token for new guardian reward pools. SKR doesn't exist on devnet, so the devnet build uses
   * Circle's devnet USDC, which anyone can get from faucet.circle.com. On mainnet: the SKR mint.
   * Existing pools keep the token they were created with (the pool account records it), such as
   * the earlier stand-in HYbj4Vt96vUAdseQ4D8qQyE1jds3pfwKrnVpL7AUvvtZ.
   */
  static skrMint = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
  static skrDecimals = 6
  static skrFaucetUrl = 'https://faucet.circle.com'
}
