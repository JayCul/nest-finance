# Nest Finance

**If someone forces you to unlock your phone, they get your spending money. Your savings can't move for days, and your guardian already knows.**

Nest Finance is a savings app for Solana Mobile (Seeker). It looks like an ordinary personal finance app. Underneath, your savings sit in an on-chain vault where every withdrawal waits a delay that you, a guardian, or the app itself can cancel. A second "duress" PIN opens a normal-looking wallet showing only your spending balance, while it silently locks the vault and alerts your guardians. Afterwards, an **AI model running on the phone** explains why the savings were frozen and what to do, without sending anything off the device.

Built for [Clock In](https://solanamobile.radiant.nexus/), the Solana Mobile hackathon.

## Evidence at a glance

| Area | What to look at |
|---|---|
| **AI** | On-device AI (Qwen3 0.6B through llama.cpp) explains why savings were frozen, from the on-chain facts and the phone's state at the backup PIN. No server, no API key, nothing leaves the phone. [Section below](#why-is-this-frozen-on-device-ai), [clip](https://github.com/JayCul/nest-finance/releases/latest/download/freeze-report-demo.mp4), code in `app/features/ai/on-device.ts` |
| **Code** | This public repository: Anchor program (`programs/nest_vault`), Android app (`app/`), Kotlin SMS module (`app/modules/nest-sms`), Mobile Wallet Adapter signing (`app/features/vault/use-vault.ts`), Android Keystore sentinel key (`app/features/vault/sentinel.ts`). Map of every feature to its source: [docs/verify.md](docs/verify.md) |
| **Tests** | 22 program tests, all passing, run against the deployed binary, including an attacker holding the owner's real key and guardian rewards on the real SKR mint: `cargo test` ([docs/verify.md](docs/verify.md)) |
| **On-chain proof** | 65 decoded devnet transactions on the demo vaults (deposits, delayed withdrawals, guardian cancels, backup-PIN freezes signed by the phone's key, SKR-style rewards), each linked to the explorer: [docs/devnet-evidence.md](docs/devnet-evidence.md). Deployed program matches this code byte for byte ([docs/verify.md](docs/verify.md)) |
| **SKR** | Guardian rewards paid in SKR, enforced on-chain; tested against SKR's real mainnet mint account; mainnet is a config change: [docs/skr.md](docs/skr.md) |
| **Security** | Threat model with the test behind each defence: [docs/threat-model.md](docs/threat-model.md). Automated review triage: [docs/security-review.md](docs/security-review.md) |
| **Deck** | [PDF](https://github.com/JayCul/nest-finance/releases/latest/download/nest-finance-deck.pdf) (text-selectable) and a [plain-text version](docs/deck.md) |
| **Demo** | [Video](https://youtube.com/shorts/_GFJuXn5x9o) (2:50), [freeze report clip](https://github.com/JayCul/nest-finance/releases/latest/download/freeze-report-demo.mp4) (2:22), [APK](https://github.com/JayCul/nest-finance/releases/latest/download/nest-finance-devnet.apk) |

## The problem

**Whoever controls your unlocked phone controls your crypto, instantly.**

- **Forced unlocks.** Crypto holders are targeted in person: robbed, threatened or coerced into opening their wallet. A Seeker in your hand tells people you hold crypto. Seed phrases, hardware wallets and biometrics protect against remote theft, not against someone standing next to you.
- **One bad signature.** A drainer needs a single approval to empty a wallet, and phishing and malicious dApps make that approval easy to trick out of anyone.
- **No time to react.** On-chain transfers are final in seconds. By the time anyone notices, the money is gone, and there is nobody to call.

Every mainstream wallet treats the key holder as the owner, so any of these ends the same way.

## The solution

Take away the instant. Savings sit in an on-chain vault where every withdrawal waits a delay you choose, and you or someone you trust can cancel it in that window. If you are forced to open the app, a backup PIN shows an ordinary wallet while the savings freeze and your emergency contact is alerted. Even with your real key and your real PIN, nobody can move your savings faster than the delay allows.

## Try it

- **APK (devnet):** [nest-finance-devnet.apk](https://github.com/JayCul/nest-finance/releases/latest/download/nest-finance-devnet.apk) from the [release](https://github.com/JayCul/nest-finance/releases/latest). Install on a Seeker or any 64-bit Android phone with an MWA wallet.
- **Demo video:** [watch on YouTube](https://youtube.com/shorts/_GFJuXn5x9o), under 3 minutes, recorded on an Android emulator with touches shown: owner tour, protected withdrawal, backup PIN, guardian alert and cancel. The voiceover script is in [docs/demo-video-script.md](docs/demo-video-script.md).
- **Freeze report with on-device AI:** [freeze-report-demo.mp4](https://github.com/JayCul/nest-finance/releases/latest/download/freeze-report-demo.mp4) (2:22), a separate clip of the "Why is this frozen?" screen and the AI explanation. It is not in the main video, which stays under 3 minutes.
- **Pitch deck:** [nest-finance-deck.pdf](https://github.com/JayCul/nest-finance/releases/latest/download/nest-finance-deck.pdf) (also in `docs/`), and a [plain-text version](docs/deck.md).
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
7. **See why it froze.** Lock the app again and open it with your real PIN. Home shows the savings frozen: tap the notice for the freeze report (who froze it, when, and the phone's state when the backup PIN was used), then **Explain with on-device AI**. The first time, the app downloads the AI model (about 400 MB, so use Wi-Fi); after that it runs offline. Guardians get the same report from the vault's **Why is this frozen?** button.

**Guardian mode** needs a second wallet. Put its address in the Guardian field when creating savings (or add it later, which waits the delay). Then connect that wallet, on another phone or on the same one via Settings, Disconnect, and it finds the vaults it protects automatically.

**Worth knowing**

- The emergency text needs a SIM. Without one, the freeze still happens and Settings records the text as failed.
- **Guardian rewards** pay in SKR on mainnet. SKR doesn't exist on devnet, so this build uses Circle's devnet USDC as the stand-in. To try rewards, open People, tap **Get free test tokens** (it copies your address and opens faucet.circle.com), choose Solana Devnet, paste, and request USDC. One request covers the default 5-token pool.
- The on-device AI model downloads once (about 400 MB) and resumes if the connection drops. On the emulator the explanation takes up to a minute to load and write; a real phone should be faster.
- The APK includes 64-bit Android builds only (every Seeker and modern Android phone), to keep its size down with the AI engine included.
- Devnet can be slow or rate-limited at times. Pull down to refresh any screen.

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
  features/security/     PINs, session lock, duress actions (lockdown, SMS, device context)
  features/ai/           on-device AI: model download and llama.cpp inference
  features/stipend/      guardian rewards (SKR)
  modules/nest-sms/      local Expo module (Kotlin) that sends SMS with no UI
scripts/demo/            scripted emulator recordings and video assembly
docs/                    verification guide, SKR write-up, security triage, deck, voiceover
```

## What the backup PIN does

Both PINs open the same app through the same screen and take the same time. The backup PIN:

1. Shows an ordinary wallet: the real spending wallet balance, real USDC and real transaction history. No savings, no guardians, identical navigation. Nothing shown is made up, so checking the address on an explorer matches.
2. Signs a `lockdown` with the phone's sentinel key in the background. No wallet prompt appears. Every pending withdrawal is voided.
3. Texts the emergency contact that the backup PIN was used, that savings are frozen, and the location when available. Location never triggers a system dialog in this path.
4. Records the phone's state at that moment for the freeze report: phone model, system and app version, public IP and GPS location. This stays on the phone.

Unlocking later with the real PIN shows what happened: the frozen notice on Home opens the freeze report, and Settings keeps a record of each use. Practice mode runs the same flow without freezing anything and marks the text as a drill.

## Why is this frozen? (on-device AI)

When savings are frozen, the owner (tap the frozen notice on Home, or the backup-PIN record in Settings) and each guardian (the vault's "Why is this frozen?" button) get a freeze report:

- **The on-chain facts:** who froze it (owner, a guardian, or this phone's backup PIN), when, when it ends, and which pending withdrawals it cancelled, read from the program's lockdown event.
- **When the backup PIN caused it, the phone's state at that moment:** phone model, system and app version, public IP, GPS coordinates with accuracy, contacts texted, and a link to the freeze transaction. The public IP comes from Cloudflare's trace endpoint (no account or key); everything else is read on the phone. It is all stored on the phone only.
- **A plain-language explanation written by an AI model running on the phone:** Qwen3 0.6B (4-bit, 397 MB, downloaded once from Hugging Face on first use) through llama.cpp (`llama.rn`). It is given only the facts above and asked to explain the freeze. The suggested next step is chosen in code for each case (backup PIN, guardian freeze, owner freeze; frozen or ended) and the model only rephrases it, so a small model cannot give unsafe advice. The facts on screen are what the program recorded; the explanation carries a note that it can make mistakes.

[Watch the clip](https://github.com/JayCul/nest-finance/releases/latest/download/freeze-report-demo.mp4): unlock with the real PIN after a backup-PIN freeze, open the report, and let the model explain it. On the emulator the model takes under a minute to load and write its answer.

**Why on-device and not a cloud model.** A cloud API key cannot be kept secret in a public APK: however it is encrypted, the app must decrypt it to use it, so anyone can extract it and bill calls to the owner of the key. And a freeze report holds the owner's location and IP from the moment they were coerced, which should not be sent to a third party. Running the model on the phone removes both problems: no server, no key, and nothing leaves the device. Code: `app/features/ai/on-device.ts` (download and inference), `app/features/vault/freeze-report.ts` (facts and prompt), `app/app/freeze-report.tsx` (the screen), `app/features/security/duress.ts` (device context).

**Model download.** The model comes from [Hugging Face](https://huggingface.co/unsloth/Qwen3-0.6B-GGUF) in 4 MB ranges, each retried on its own; the partial file is kept, so an interrupted download resumes where it stopped. The finished file is checked for its exact size and GGUF header before use. Nothing else is sent: the request carries no user data.

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

`scripts/demo/01` to `04` drive the emulator over adb and record each segment with `screenrecord`, with Show taps turned on (`adb shell settings put system show_touches 1`). `scripts/demo/assemble.sh` trims and joins them into the main video, and `scripts/demo/place-voiceover.py` times a voiceover to it line by line. `05-freeze-report.sh` records the separate freeze-report clip (the AI model must already be downloaded). Segment 1 needs the mock wallet holding the guardian key, the others the owner key (`scripts/mock-wallet-key.sh`).

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
- [x] Phase 6: submission (release APK, demo video, pitch deck, verification guide)
- [x] Freeze report with an on-device AI explanation

## Limits

- Not audited. Devnet only. See [docs/threat-model.md](docs/threat-model.md) for what is and is not covered.
- Whoever holds the program's upgrade authority could change these rules. Before any mainnet use it must be made immutable or put behind a multisig.
- The delay protects savings, not the spending wallet. The decoy balance is meant to be handed over.
- The app's guidance is always to comply. It is designed to end an encounter quickly, not to resist.
- The AI explanation comes from a small model and can phrase things imperfectly. The report's facts are always shown alongside it, and the next step it gives is chosen in code.
