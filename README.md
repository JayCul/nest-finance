# Nest Finance

**If someone forces you to unlock your phone, they get your spending money. Your savings can't move for days, and your guardian already knows.**

Nest Finance is a savings app for Solana Mobile (Seeker). It looks like an ordinary personal finance app. Underneath, your savings sit in an on-chain vault where every withdrawal waits a delay that you, a guardian, or the app itself can cancel. A second "duress" PIN opens a normal-looking wallet showing only your spending balance, while it silently locks the vault and alerts your guardians.

Built for [Clock In](https://solanamobile.radiant.nexus/), the Solana Mobile hackathon.

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
```

## Run the app

The app needs a development build (Mobile Wallet Adapter uses native modules, so Expo Go won't work) and an MWA wallet on the device. On an emulator, use Solana Mobile's [mock-mwa-wallet](https://github.com/solana-mobile/mock-mwa-wallet); it needs a device PIN, and you press **Authenticate** in it before signing.

```bash
cd app
npm install
npm run generate:client   # after changing the program: regenerates generated/nest-vault from the IDL
npx expo run:android
```

The app talks to devnet. `@solana/kit` is pinned to 7.1.1 to match `@wallet-ui/react-native-kit`, and `@codama/renderers-js` to 2.4.0, the last release whose output runs on Kit 7.

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
- [ ] Phase 2: owner app (Android, Mobile Wallet Adapter)
- [ ] Phase 3: duress PIN, decoy view, sentinel lockdown, SMS alerts
- [ ] Phase 4: guardian mode
- [ ] Phase 5: SKR guardian stipends, safety score
- [ ] Phase 6: submission

## Limits

- Not audited. Devnet only.
- Whoever holds the program's upgrade authority could change these rules. Before any mainnet use it must be made immutable or put behind a multisig.
- The delay protects savings, not the spending wallet. The decoy balance is meant to be handed over.
- The app's guidance is always to comply. It is designed to end an encounter quickly, not to resist.
