# Evidence

Everything a reviewer needs to check Nest Finance without trusting the video, in one place. Each line links to the code, the chain or a document that backs it.

## Code

| What | Where |
|---|---|
| Anchor program `nest_vault` (17 instructions) | [`programs/nest_vault/src/lib.rs`](programs/nest_vault/src/lib.rs), accounts in [`state.rs`](programs/nest_vault/src/state.rs), events in [`events.rs`](programs/nest_vault/src/events.rs) |
| Program tests (22, LiteSVM, against the deployed binary) | [`programs/nest_vault/tests/vault.rs`](programs/nest_vault/tests/vault.rs) |
| Android app (Expo SDK 55, React Native 0.83) | [`app/`](app/) |
| Mobile Wallet Adapter signing | [`app/features/vault/use-vault.ts`](app/features/vault/use-vault.ts) |
| Sentinel key in Android Keystore (secure-store) | [`app/features/vault/sentinel.ts`](app/features/vault/sentinel.ts) |
| Backup PIN: silent freeze and emergency text | [`app/features/security/duress.ts`](app/features/security/duress.ts), Kotlin SMS module [`app/modules/nest-sms`](app/modules/nest-sms) |
| Nest Intelligence: risk engine, simulator, Groq client | [`app/features/intel/`](app/features/intel/), [`app/features/ai/groq.ts`](app/features/ai/groq.ts) |
| Program IDL | [`app/idl/nest_vault.json`](app/idl/nest_vault.json), also published on-chain (below) |
| Typed client generated from the IDL (Codama) | [`app/generated/nest-vault`](app/generated/nest-vault) |
| Evidence scripts (each writes or prints the evidence below) | [`app/scripts/devnet-evidence.ts`](app/scripts/devnet-evidence.ts), [`skr-trace.ts`](app/scripts/skr-trace.ts), [`ai-payload.ts`](app/scripts/ai-payload.ts) |

## Deployment (Solana devnet)

| What | Value |
|---|---|
| Program ID | [`EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ`](https://explorer.solana.com/address/EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ?cluster=devnet) |
| Program data account | `Eh41A3b7Q7LxRMYcWhDmM7kRhGqYD933JmuK9Nrm2ysJ`, last deployed in slot 505625154 |
| Upgrade authority | `9SbxyobGDKzh6CDYV3eMHTyNnhymMoGbsanNFPC9ASmp` (dev key; immutable or multisig before mainnet) |
| Deployed binary SHA-256 | `7d1dfce905930f399d6e0bc988e4299e07228c5bbe186d1cfc6c41c9a7a4c228`, identical to `target/deploy/nest_vault.so` built at commit `af20e91`, the last change to the program source |
| On-chain IDL | Published with `anchor idl init`; `anchor idl fetch EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ --provider.cluster devnet` returns a document equal to `app/idl/nest_vault.json` (checked 2 Oct 2026) |

Check it yourself:

```bash
solana program dump EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ deployed.so -u devnet
sha256sum deployed.so target/deploy/nest_vault.so
anchor idl fetch EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ --provider.cluster devnet
```

## Tests

`anchor build --arch v1 && cargo test`, run on 2 Oct 2026:

```text
running 22 tests
test cannot_withdraw_below_rent_floor ... ok
test rejects_bad_settings ... ok
test creates_vault_and_accepts_deposits ... ok
test repeated_lockdown_extends_never_shortens ... ok
test strangers_cannot_lock_down ... ok
test execute_only_pays_the_stored_destination ... ok
test guardian_heartbeat_records_check_in ... ok
test owner_and_guardian_can_expedite ... ok
test safe_list_is_instant_everything_else_is_not ... ok
test withdrawal_waits_for_the_delay ... ok
test sentinel_cannot_move_funds ... ok
test owner_guardian_and_sentinel_can_cancel_strangers_cannot ... ok
test settings_change_waits_and_can_be_cancelled ... ok
test guardian_rewards_work_with_mainnet_skr ... ok
test guardian_first_claim_pays_a_week_and_counts_as_check_in ... ok
test lifting_lockdown_needs_owner_and_real_guardian ... ok
test empty_pool_still_records_the_check_in ... ok
test stipend_accrues_pro_rata_and_caps_at_eight_days ... ok
test only_guardians_can_claim ... ok
test sentinel_lockdown_freezes_and_voids_everything ... ok
test attacker_with_owner_key_cannot_take_funds_early ... ok
test spl_tokens_follow_the_same_rules ... ok

test result: ok. 22 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.60s
```

The tests load `target/deploy/nest_vault.so`, the same bytes as the deployed program. Which rule each test checks: [docs/security-model.md](docs/security-model.md#instructions-and-who-can-sign-them).

## On-chain traces

| Trace | Document |
|---|---|
| Every event on the demo vaults (deposits, delayed withdrawals, guardian cancels, backup-PIN freezes signed by the phone's sentinel key, reward claims), decoded from the chain with explorer links | [docs/devnet-evidence.md](docs/devnet-evidence.md) |
| One full SKR rewards cycle: pool funding, first claim (one week), a second claim 152 s later paying exactly `rate × elapsed / week` (251 base units), heartbeat updates, token-account balances read back after each step | [docs/skr-trace.md](docs/skr-trace.md) |
| Mainnet switch: SKR mint `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3` is a config value; the same cycle runs in a test against SKR's real mainnet mint account | [docs/skr.md](docs/skr.md), test `guardian_rewards_work_with_mainnet_skr` |

## AI (Nest Intelligence)

What is computed on-chain, on the phone, and sent to Groq, with a real captured request and reply: [docs/ai.md](docs/ai.md).

## Security

| Document | Covers |
|---|---|
| [docs/security-model.md](docs/security-model.md) | Per-instruction signers and checks, freeze and cancel rules, why the delay cannot be bypassed, settings delay, guardian limits, the Keystore sentinel key, and what each compromised key can and cannot do |
| [docs/threat-model.md](docs/threat-model.md) | Attackers and scenarios, with the test behind each defence |
| [docs/security-review.md](docs/security-review.md) | Triage of an automated security review |

## Device testing

| Capability | Tested on | How |
|---|---|---|
| Mobile Wallet Adapter connect and signing (owner and guardian) | Android 16 emulator (Pixel 6 profile, x86_64) with Solana Mobile's mock-mwa-wallet | Every flow in the demo video; transactions in [devnet-evidence.md](docs/devnet-evidence.md) |
| Sentinel key in Android Keystore, silent freeze from the backup PIN | Same | Freeze transactions signed by the sentinel, listed in devnet-evidence.md |
| Emergency SMS (native module) and location | Same (emulator SMS and mock location) | Freeze report screen; `app/modules/nest-sms` |
| Guardian notifications with risk level | Same | Background watcher, `use-guardian-watcher.ts` |
| Nest Intelligence against live devnet | Same | [docs/ai.md](docs/ai.md) |

Physical-device results (Seeker or another Android phone) will be added here.

## Release

APK, deck PDF and release notes: [latest GitHub release](https://github.com/JayCul/nest-finance/releases/latest). The APK's SHA-256 is in each release's notes.
