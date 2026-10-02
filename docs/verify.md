# Verify it yourself

Everything needed to check Nest Finance beyond the demo video: where it is deployed, how to build and test it, how to confirm the deployed program is this code, and where each feature lives in the source.

## Deployed on Solana devnet

| What | Address |
|---|---|
| Program `nest_vault` | [`EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ`](https://explorer.solana.com/address/EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ?cluster=devnet) |
| Program data account | `Eh41A3b7Q7LxRMYcWhDmM7kRhGqYD933JmuK9Nrm2ysJ` |
| Upgrade authority | `9SbxyobGDKzh6CDYV3eMHTyNnhymMoGbsanNFPC9ASmp` (dev key; to be made immutable or moved to a multisig before mainnet) |
| Demo owner's vault (from the video) | [`CCYNF26y9AfyxZ5D1azdw31D1HzrGKtnEpbKHsDLjXJa`](https://explorer.solana.com/address/CCYNF26y9AfyxZ5D1azdw31D1HzrGKtnEpbKHsDLjXJa?cluster=devnet) (owner `HGqR25WMRx2hnLFstth6JGdb6TK3cXmxFsZGuhjobHR3`) |
| Its guardian rewards pool | `SYWByBZpQ7JABP1DFrznvXZrL4AnBeR8LZ2iuiHzdar` |
| Demo guardian | `27WB8w9rQRKnpmRWYCe28naQMSdpqST7pukyC1wAoKn7` |
| Reward token on devnet (Circle devnet USDC, stand-in for SKR) | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |

[devnet-evidence.md](devnet-evidence.md) lists every event on the demo vaults (65 so far) with a link to each transaction, decoded from the chain. The demo vault's history shows the flows from the video as real devnet transactions: deposits, withdrawal requests, cancels by the guardian, the backup-PIN lockdown signed by the phone's sentinel key, and stipend claims. The program emits an event for each, which the app decodes into its Activity screen.

Account addresses are program-derived:

| Account | Seeds |
|---|---|
| Vault | `["vault", owner]` |
| Pending withdrawal | `["withdrawal", vault, id as u64 little-endian]` |
| Pending settings change | `["config", vault]` |
| Guardian rewards pool | `["stipend", vault]` |

## Build and test the program

Requires Anchor 1.2, Solana CLI (Agave) 4.x and Rust 1.89 (on Windows, inside WSL).

```bash
anchor build --arch v1
cargo test
```

The output of the latest run is in [EVIDENCE.md](../EVIDENCE.md#tests).

22 tests run against the built program in LiteSVM (`programs/nest_vault/tests/vault.rs`). The key one, `attacker_with_owner_key_cannot_take_funds_early`, holds the owner's real key and tries every route to the savings before the delay; every route fails. Others cover guardian cancel, lockdown voiding pending requests, delayed settings changes, the safe list, expedite with a guardian, bad settings, the stipend's pro-rata accrual and 8-day cap, and `guardian_rewards_work_with_mainnet_skr`, which runs guardian rewards against SKR's real mainnet mint account ([skr.md](skr.md)). The tests load `target/deploy/nest_vault.so`, the same binary that is deployed.

## Confirm the deployed program is this code

The IDL is published on-chain: `anchor idl fetch EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ --provider.cluster devnet` returns the same document as `app/idl/nest_vault.json`.

The program on devnet is byte-identical to the `target/deploy/nest_vault.so` built from this repository at commit `af20e91`, the last change to the program source (`programs/nest_vault/src`; later commits only add tests):

```bash
solana program dump EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ deployed.so -u devnet
sha256sum deployed.so target/deploy/nest_vault.so
# both: 7d1dfce905930f399d6e0bc988e4299e07228c5bbe186d1cfc6c41c9a7a4c228
```

A build on another machine can differ byte for byte because of toolchain paths; a verifiable build (`solana-verify`) is planned before mainnet.

## Build and run the app

```bash
cd app
npm install
npx expo prebuild -p android
cd android && ./gradlew assembleRelease
```

On Windows, build from a short path such as `C:\nf\app`; some native modules exceed the 260-character path limit from a deep folder. The release APK is attached to [the GitHub release](https://github.com/JayCul/nest-finance/releases/latest). The typed program client in `app/generated/nest-vault` is generated from the committed IDL (`app/idl/nest_vault.json`) with `npm run generate:client`.

## Where each feature lives

| Feature | Source |
|---|---|
| Vault rules: delays, safe list, lockdown, delayed settings, guardian roles | `programs/nest_vault/src/lib.rs`, `state.rs` |
| Mobile Wallet Adapter signing (every owner and guardian action) | `app/features/vault/use-vault.ts` (`useSend`) |
| Sentinel key: tighten-only, kept in secure storage (Android Keystore), signs the silent freeze | `app/features/vault/sentinel.ts`, funded at vault creation in `use-vault.ts` |
| Backup PIN: ordinary-wallet view, silent lockdown, SMS with location | `app/features/security/duress.ts`, `session.tsx`, `app/components/decoy.tsx` |
| Silent SMS (native Kotlin Expo module) | `app/modules/nest-sms/android/src/main/java/expo/modules/nestsms/NestSmsModule.kt` |
| Guardian discovery (program-account scan at each guardian slot) | `app/features/guardian/use-guardian.ts` |
| Withdrawal alerts and one-tap cancel | `app/features/guardian/use-guardian-watcher.ts`, `app/app/guarded/[vault].tsx` |
| Guardian rewards (SKR) | `app/features/stipend/use-stipend.ts`, `app/components/guardian-rewards.tsx`; see [skr.md](skr.md) |
| Safety score | `app/features/vault/use-safety-score.ts` |
| Freeze report: on-chain facts plus device state at the backup PIN | `app/features/vault/freeze-report.ts`, `app/app/freeze-report.tsx`, captured in `app/features/security/duress.ts` |
| Nest Intelligence: withdrawal risk scoring, guardian briefings, transaction explainer, What-if simulator | `app/features/intel/withdrawal-risk.ts`, `app/features/intel/simulator.ts`, `app/components/risk-briefing.tsx`, `app/app/simulator.tsx`; risk level in guardian alerts: `app/features/guardian/use-guardian-watcher.ts` |
| AI wording (Groq, key decrypted at run time) | `app/features/ai/groq.ts`, `app/scripts/encrypt-groq-key.mjs` |

## Check Nest Intelligence

The risk score and simulator outcomes are plain functions of on-chain state, so they can be read and checked directly: `assessWithdrawal` in `app/features/intel/withdrawal-risk.ts` and `runScenarios` in `app/features/intel/simulator.ts`. The AI's only input is the text those functions produce (`riskFacts`, `scenarioFacts`, `configFacts`), which is what you see on screen; its only output is wording.

A real request and reply, captured from a live pending withdrawal on devnet, and a table of what is computed where: [ai.md](ai.md). To reproduce it: `cd app && npx tsx scripts/ai-payload.ts <vault-with-a-pending-withdrawal>` (needs `EXPO_PUBLIC_GROQ_KEY_ENC` in `app/.env.local`).

The precise rules (signers per instruction, freeze and cancel, delay bypass, compromise cases) are in [security-model.md](security-model.md). An automated security review and its triage are in [security-review.md](security-review.md); the threat model, with the test or code behind each defence, is in [threat-model.md](threat-model.md).
