# Nest Finance

**If someone forces you to unlock your phone, they get your spending money. Your savings can't move for days, and your guardian already knows.**

Nest Finance is a savings app for Solana Mobile (Seeker). It looks like an ordinary personal finance app. Underneath, your savings sit in an on-chain vault where every withdrawal waits a delay that you, a guardian, or the app itself can cancel. A second "duress" PIN opens a normal-looking wallet showing only your spending balance, while it silently locks the vault and alerts your guardians. **Nest Intelligence** scores every withdrawal for risk and briefs guardians, explains each transaction before you sign it, and plays common attacks against your setup in a What-if simulator. The app computes the scores and outcomes; AI (Groq) only words them; the Solana program decides what is allowed.

Built for [Clock In](https://solanamobile.radiant.nexus/), the Solana Mobile hackathon.

## Evidence at a glance

Everything in one page, with the deployed hash, on-chain IDL and test output: **[EVIDENCE.md](EVIDENCE.md)**.

| Area | What to look at |
|---|---|
| **AI** | Nest Intelligence: withdrawal risk scoring with AI guardian briefings and risk-scored alerts, a transaction explainer before signing, and a What-if security simulator with free-form questions. Scores and outcomes are computed in code from on-chain state; Groq's `gpt-oss-120b` words them. [Section below](#nest-intelligence-ai), code in `app/features/intel/` and `app/features/ai/groq.ts`. What is computed locally or on-chain versus sent to Groq, with a real captured request: [docs/ai.md](docs/ai.md) |
| **Code** | This public repository: Anchor program (`programs/nest_vault`), Android app (`app/`), Kotlin SMS module (`app/modules/nest-sms`), Mobile Wallet Adapter signing (`app/features/vault/use-vault.ts`), Android Keystore sentinel key (`app/features/vault/sentinel.ts`). Map of every feature to its source: [docs/verify.md](docs/verify.md) |
| **Tests** | 22 program tests, all passing, run against the deployed binary, including an attacker holding the owner's real key and guardian rewards on the real SKR mint: `cargo test` ([docs/verify.md](docs/verify.md)) |
| **On-chain proof** | 65 decoded devnet transactions on the demo vaults (deposits, delayed withdrawals, guardian cancels, backup-PIN freezes signed by the phone's key, SKR-style rewards), each linked to the explorer: [docs/devnet-evidence.md](docs/devnet-evidence.md). Deployed program matches this code byte for byte ([docs/verify.md](docs/verify.md)) |
| **SKR** | Guardian rewards paid in SKR, enforced on-chain; tested against SKR's real mainnet mint account; mainnet is a config change: [docs/skr.md](docs/skr.md). Step-by-step devnet trace of funding, claims, the accrual formula and heartbeats: [docs/skr-trace.md](docs/skr-trace.md) |
| **Security** | Security model (who can sign each instruction, freeze rules, why the delay cannot be bypassed, compromise cases): [docs/security-model.md](docs/security-model.md). Threat model with the test behind each defence: [docs/threat-model.md](docs/threat-model.md). Automated review triage: [docs/security-review.md](docs/security-review.md) |
| **Deck** | [PDF](https://cdn.jsdelivr.net/gh/JayCul/nest-finance@v0.3.1-devnet/docs/nest-finance-deck.pdf) (17 slides, opens in the browser, text-selectable; also in `docs/`) and a [plain-text version](docs/deck.md) |
| **Demo** | [Video](https://youtube.com/shorts/_GFJuXn5x9o) (2:50), [APK](https://github.com/JayCul/nest-finance/releases/latest/download/nest-finance-devnet.apk) |

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
- **Pitch deck:** [nest-finance-deck.pdf](https://cdn.jsdelivr.net/gh/JayCul/nest-finance@v0.3.1-devnet/docs/nest-finance-deck.pdf) (also in `docs/`), and a [plain-text version](docs/deck.md).
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
7. **Try Nest Intelligence.** On Home, tap **What if…? Test your setup** to see seven attacks played against your settings, with **Walk me through it** and **Ask your own what-if**. On the withdraw screen, **Explain this transaction** before you sign. Guardians see a risk score and briefing on every pending withdrawal, and the alert itself carries the risk level. After a backup-PIN freeze, tap the frozen notice on Home for the freeze report.

**Guardian mode** needs a second wallet. Put its address in the Guardian field when creating savings (or add it later, which waits the delay). Then connect that wallet, on another phone or on the same one via Settings, Disconnect, and it finds the vaults it protects automatically.

**Worth knowing**

- The emergency text needs a SIM. Without one, the freeze still happens and Settings records the text as failed.
- **Guardian rewards** pay in SKR on mainnet. SKR doesn't exist on devnet, so this build uses Circle's devnet USDC as the stand-in. To try rewards, open People, tap **Get free test tokens** (it copies your address and opens faucet.circle.com), choose Solana Devnet, paste, and request USDC. One request covers the default 5-token pool.
- Nest Intelligence needs an internet connection; without one, the scores, signals and simulator outcomes still show, computed on the phone.
- The APK includes 64-bit Android builds only (every Seeker and modern Android phone).
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
  features/intel/        risk scoring and the What-if simulator (deterministic)
  features/ai/           Groq client: wording only, key decrypted at runtime
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

## Nest Intelligence (AI)

**The principle: AI explains, detects, simulates and recommends; the Solana program decides what is allowed.** Every score, signal, scenario outcome and recommended action is computed in code from on-chain state (`app/features/intel/`). A model on Groq (`openai/gpt-oss-120b`, falling back to `gpt-oss-20b`) only turns those facts into plain sentences, and is told to repeat the app's recommended action, not invent its own. Without a connection, everything except the wording still works.

- **Withdrawal risk scoring and guardian briefings.** Each pending withdrawal gets a 0–100 score from signals: a destination never used by these savings (or the owner's own wallet or safe address, which lower it), the share of savings it takes, size against past withdrawals, several requests at once, coming right after a freeze, and, on the owner's phone, whether this phone made the request. Guardians see the score, the signals and an AI briefing under each request, and the alert notification itself says "High risk" with the top reasons. Owners see the same on the withdrawal screen, which is where a "Was this you?" alert lands. Code: `withdrawal-risk.ts`, `components/risk-briefing.tsx`.
- **Transaction explainer.** On the withdraw screen, before the wallet opens: what the transaction does, when the money moves, who can stop it, and the risk score, worded by AI on request. Code: `app/withdraw.tsx`.
- **What-if simulator.** Seven attacks played against the owner's real configuration: forced unlock, stolen wallet key, malicious signature, lost phone, unreachable guardian, malicious guardian, settings tampering. Each shows the chain of events, what could be lost, and what to fix (with a link to fix it). AI summarises the results, walks through any scenario, and answers free-form "what if" questions from the configuration, the program's rules and the scenario results. Code: `simulator.ts`, `app/simulator.tsx`.

**What is sent to Groq:** only the facts on screen: amounts, durations, counts, roles, risk signals and short addresses (`9Sbx…ASmp`). Never keys, full addresses, location, IP, device details or PINs.

**The API key.** It lives in `app/.env.local` (git-ignored, never in this repository). `npm run groq:key` encrypts it with AES-256-GCM under a key derived with SHA-256, and only the ciphertext is built into the app, which decrypts it at run time (`app/features/ai/groq.ts`). This keeps it out of the APK as plain text, but anyone determined can still recover it from the app, so the key is a dedicated one with a spending limit, to be rotated after judging.

**Freeze report.** After a freeze, the owner (tap the frozen notice on Home) and each guardian (the vault's **Why is this frozen?** button) see who froze it, when, what it cancelled and when it ends, and, if the backup PIN caused it, the phone's state at that moment (model, system, public IP, GPS). That report stays on the phone and is never sent to the AI.

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

`scripts/demo/01` to `04` drive the emulator over adb and record each segment with `screenrecord`, with Show taps turned on (`adb shell settings put system show_touches 1`). `scripts/demo/assemble.sh` trims and joins them into the main video, and `scripts/demo/place-voiceover.py` times a voiceover to it line by line. Segment 1 needs the mock wallet holding the guardian key, the others the owner key (`scripts/mock-wallet-key.sh`).

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
- [x] Nest Intelligence: risk scoring, guardian briefings, transaction explainer, What-if simulator
- [x] Freeze report

## Limits

- Not audited. Devnet only. See [docs/threat-model.md](docs/threat-model.md) for what is and is not covered.
- Whoever holds the program's upgrade authority could change these rules. Before any mainnet use it must be made immutable or put behind a multisig.
- The delay protects savings, not the spending wallet. The decoy balance is meant to be handed over.
- The app's guidance is always to comply. It is designed to end an encounter quickly, not to resist.
- AI wording can be imperfect. The computed facts are always shown beside it, and its recommended actions come from code. The Groq key in the APK is obfuscated, not secret.
