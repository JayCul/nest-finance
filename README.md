# Nest Finance

**If someone forces you to unlock your phone, they get your spending money. Your savings can't move for days, and your guardian already knows.**

Nest Finance is a savings app for Solana Mobile (Seeker). It looks like an ordinary personal finance app. Underneath, your savings sit in an on-chain vault where every withdrawal waits a delay that you, a guardian, or the app itself can cancel. A second "duress" PIN opens a normal-looking wallet showing only your spending balance, while it silently locks the vault and alerts your guardians.

Built for [Clock In](https://solanamobile.radiant.nexus/), the Solana Mobile hackathon.

## Try it

- **APK (devnet):** attached to the GitHub release. Install on a Seeker or any Android device with an MWA wallet.
- **Demo video:** under 3 minutes, recorded on an Android emulator with touches shown: owner tour, protected withdrawal, backup PIN, guardian alert and cancel. The voiceover script is in [docs/demo-video-script.md](docs/demo-video-script.md).
- **Pitch deck:** 10 slides with speaker notes.
- **Verify it yourself:** deployed addresses, build and test steps, proof the devnet program matches this code, and where each feature lives: [docs/verify.md](docs/verify.md).
- **SKR integration and mainnet path:** [docs/skr.md](docs/skr.md). Security review triage: [docs/security-review.md](docs/security-review.md).

The demo vault uses a 2-minute delay so a withdrawal can finish on camera. Real vaults choose 24 hours to 7 days.

## For judges

No account or sign-up. Your wallet is your identity, and PINs stay on the phone. Everything runs on Solana devnet, so nothing costs real money.

1. **Wallet.** Use any Mobile Wallet Adapter wallet that can sign on devnet. Most wallets have a devnet or testnet switch in their settings.
2. **Install and connect.** Install the APK, open Nest Finance and tap **Connect wallet**.
3. **Get test SOL.** If your wallet is nearly empty, Home shows **Get free test SOL**. Tap **Copy address and open faucet**, paste the address on faucet.solana.com, request an airdrop, and come back. The balance updates when you return. Creating protected savings costs about 0.015 SOL.
4. **Create protected savings.** Tap **Start protected savings**. **Demo** timers are selected by default (withdrawals wait 2 minutes, a freeze lasts 10), so you can watch a withdrawal finish. Approve one transaction in your wallet.
5. **Set up the backup PIN.** Home prompts you. Pick a real PIN, a backup PIN and an emergency contact, then allow texts and location. **Practice now** runs the backup PIN without freezing anything.
6. **Try it.** Deposit, request a withdrawal and cancel it. Then lock the app (Settings, Lock app) and open it with the backup PIN: you'll see the spending-only view while your savings freeze.

**Guardian mode** needs a second wallet. Put its address in the Guardian field when creating savings (or add it later, which waits the delay). Then connect that wallet, on another phone or on the same one via Settings, Disconnect, and it finds the vaults it protects automatically.

**Worth knowing**

- The emergency text needs a SIM. Without one, the freeze still happens and Settings records the text as failed.
- **Guardian rewards** pay in SKR on mainnet. SKR doesn't exist on devnet, so this build uses Circle's devnet USDC as the stand-in. To try rewards, open People, tap **Get free test tokens** (it copies your address and opens faucet.circle.com), choose Solana Devnet, paste, and request USDC. One request covers the default 5-token pool.
- Devnet can be slow or rate-limited at times. Pull down to refresh any screen.

## Why

Crypto holders are increasingly targeted in person, and a Seeker in your hand tells people you hold crypto. Hardware wallets and seed phrases don't help when someone is standing next to you. Nest Finance makes that encounter pointless: even with your real key and your real PIN, an attacker cannot move your savings faster than the delay allows.

The same rule stops wallet drainers. A malicious signature can only queue a delayed withdrawal, which you cancel from a notification.

## How the vault works

| Key | Lives in | Can |
|---|---|---|
| Owner | Seed Vault (signs via Mobile Wallet Adapter) | Deposit, request withdrawals, propose settings changes, cancel |
| Guardians (up to 3) | Their own phones | Cancel, lock down, co-sign an early release |
| Sentinel | The app, encrypted with Android Keystore | Only tighten: cancel and lock down. Never move funds. |

Rules the program enforces:

- **Every withdrawal waits the delay** (the app offers 24h to 7 days). Anyone can execute it afterwards, but only to the destination fixed when it was requested.
- **Safe list:** instant withdrawals, but only to addresses you registered (your own cold wallet, for example).
- **Settings changes wait the delay too.** An attacker can't add their address to the safe list, shorten the delay, or add themselves as a guardian on the spot.
- **Lockdown** freezes all outgoing transfers and **voids every pending request at once**. The owner, a guardian or the sentinel (the duress PIN path) can trigger it. Only the owner and a guardian together can lift it early.
- **Early release:** the owner and a guardian together can release a pending withdrawal before its delay ends.

## Repository layout

```
programs/nest_vault/     Anchor program (Rust)
  src/lib.rs             instructions and account contexts
  src/state.rs           Vault, PendingWithdrawal, PendingConfig, VaultParams
  src/events.rs          events the owner and guardian apps subscribe to
  src/errors.rs
  tests/vault.rs         LiteSVM tests, including the attacker-with-owner-key test
scripts/wsl-run.sh       runs toolchain commands inside WSL
app/                     Android app (Expo, React Native, @solana/kit, Mobile Wallet Adapter)
  app/                   screens (expo-router)
  features/vault/        data layer: queries, actions, sentinel key, withdrawal watcher
  generated/nest-vault/  typed client generated from the IDL with Codama
  features/security/     PINs, session lock, duress actions (lockdown + SMS)
  modules/nest-sms/      local Expo module (Kotlin) that sends SMS with no UI
```

## What the backup PIN does

Both PINs open the same app through the same screen and take the same time. The backup PIN:

1. Shows an ordinary wallet: the real spending wallet balance, real USDC and real transaction history. No savings, no guardians, identical navigation. Nothing shown is made up, so checking the address on an explorer matches.
2. Signs a `lockdown` with the phone's sentinel key in the background. No wallet prompt appears. Every pending withdrawal is voided.
3. Texts the emergency contact that the backup PIN was used, that savings are frozen, and the location when available. Location never triggers a system dialog in this path.

Unlocking later with the real PIN shows what happened in Settings. Practice mode runs the same flow without freezing anything and marks the text as a drill.

## Guardians

A guardian uses the same app with their own wallet. There is no invite handshake: the app finds every vault that lists the connected wallet as a guardian by searching the program's accounts at the fixed byte offsets of the three guardian slots.

- **Alerts:** a new withdrawal request on a vault they protect, and freezes. A freeze signed by the owner's phone sentinel means the backup PIN was used, and the alert says so.
- **Actions:** cancel a withdrawal, freeze the savings, and check in (an on-chain heartbeat the owner can see).
- **Invites:** the guardian shows a QR code ("My guardian code"); the owner scans it when proposing a settings change. Adding a guardian waits the full delay like any other change.

`app/scripts/owner-request.mjs` requests a withdrawal as the owner from outside the app, which is what a drainer or a coerced signature elsewhere looks like. Use it to test the guardian's alert and cancel flow.

## Run the app

The app needs a development build (Mobile Wallet Adapter uses native modules, so Expo Go won't work) and an MWA wallet on the device. On an emulator, use Solana Mobile's [mock-mwa-wallet](https://github.com/solana-mobile/mock-mwa-wallet); it needs a device PIN, and you press **Authenticate** in it before signing.

```bash
cd app
npm install
npm run generate:client   # after changing the program: regenerates generated/nest-vault from the IDL
npx expo run:android
```

The app talks to devnet. `@solana/kit` is pinned to 7.1.1 to match `@wallet-ui/react-native-kit`, and `@codama/renderers-js` to 2.4.0, the last release whose output runs on Kit 7.

Release APK: `npx expo prebuild -p android` then `gradlew assembleRelease` in `android/`. On Windows, build from a short path such as `C:\nf\app`; the native modules exceed the 260-character path limit from a deep folder.

### Recording the demo

`scripts/demo/01` to `04` drive the emulator over adb and record each segment with `screenrecord`, with Show taps turned on (`adb shell settings put system show_touches 1`). `scripts/demo/assemble.sh` trims and joins them. Segment 1 needs the mock wallet holding the guardian key, the others the owner key (`scripts/mock-wallet-key.sh`).

## Build and test

Requires Anchor 1.2, Solana CLI (Agave) 4.x and Rust. On Windows, run everything inside WSL:

```bash
anchor build --arch v1
cargo test
```

Build for SBPF v1. Solana CLI 4.x defaults to v3, which LiteSVM 0.10 cannot load; devnet accepts v1. `scripts/check.sh` builds and tests in one go:

```powershell
wsl -d Ubuntu -e bash scripts/wsl-run.sh bash scripts/check.sh
```

Program ID (devnet): `EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ`

## Status

- [x] Phase 1: on-chain program and tests
- [x] Program deployed to devnet
- [x] Phase 2: owner app (Android, Mobile Wallet Adapter)
- [x] Phase 3: backup (duress) PIN, ordinary-wallet view, silent sentinel lockdown, SMS alert with location, practice mode
- [x] Phase 4: guardian mode (auto-discovery of vaults you protect, alerts, cancel, freeze, check-in, QR invites)
- [x] Phase 5: SKR guardian rewards (on-chain stipend pool, 8-day accrual cap), safety score
- [ ] Phase 6: submission (release APK, demo video, pitch deck)

## Limits

- Not audited. Devnet only.
- Whoever holds the program's upgrade authority could change these rules. Before any mainnet use it must be made immutable or put behind a multisig.
- The delay protects savings, not the spending wallet. The decoy balance is meant to be handed over.
- The app's guidance is always to comply. It is designed to end an encounter quickly, not to resist.
