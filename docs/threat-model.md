# Threat model

What Nest Finance protects, from whom, how each defence is enforced, and what it does not cover. Every "enforced by" names the code or test that backs the claim.

## What is protected

- **Savings**: SOL and SPL tokens in the vault account, a program-derived address (`["vault", owner]`) that only the Nest Finance program can move funds from.
- **The owner's safety** during a coerced unlock: the attacker should see nothing worth pushing for and no sign that an alarm was raised.
- **Privacy of the freeze report**: location, IP and device details recorded when the backup PIN is used.

Not protected: the **spending wallet**. It is an ordinary wallet by design; the backup-PIN view shows it so there is something real to hand over.

## Keys and roles

| Key | Where it lives | Can | Cannot |
|---|---|---|---|
| Owner | Seed Vault or the user's wallet app; the app never sees it (Mobile Wallet Adapter) | Deposit, request withdrawals, propose settings, cancel, freeze | Move savings before the delay, except to its own safe addresses |
| Guardian (up to 3) | Each guardian's own wallet | Cancel withdrawals, freeze, check in; with the owner, release early or lift a freeze | Move any funds on their own |
| Sentinel | This phone: an Ed25519 key in `expo-secure-store` (encrypted by Android Keystore), created with the vault | Cancel and freeze only | Move any funds, change settings |

## Adversaries and defences

### 1. Someone forces the owner to unlock the phone (wrench attack)

The attacker may have the owner's phone, PIN and wallet approval.

| Attack | Defence | Enforced by |
|---|---|---|
| Withdraw the savings now | Every withdrawal waits the owner's delay (24 hours to 7 days on real vaults) | `request_withdrawal` / `execute_withdrawal` in `programs/nest_vault/src/lib.rs`; test `attacker_with_owner_key_cannot_take_funds_early` |
| Send savings to a new address instantly | Instant withdrawals go only to addresses already on the safe list | `instant_withdraw`; test `safe_list_is_instant_everything_else_is_not` |
| Add their address to the safe list, shorten the delay or add themselves as guardian | Every settings change waits the full delay and can be cancelled | `propose_config` / `apply_config`; test `settings_change_waits_and_can_be_cancelled` |
| Wait out the delay with the victim | The owner (or a guardian) cancels; a freeze voids every pending request at once | `cancel_withdrawal`, `lockdown`; tests `owner_guardian_and_sentinel_can_cancel_strangers_cannot`, `sentinel_lockdown_freezes_and_voids_everything` |
| Notice the savings and demand them | The backup PIN opens an ordinary wallet with the real spending balance and history and no trace of savings | `app/components/decoy.tsx`; the freeze report screen redirects away in this mode |
| Stop the alarm | The freeze is signed by the phone's sentinel key in the background with no wallet prompt; the emergency text is sent by a native module with no UI | `app/features/security/duress.ts`, `app/modules/nest-sms` |
| Lift the freeze | Lifting early needs the owner and a guardian together; a repeated freeze only extends | tests `lifting_lockdown_needs_owner_and_real_guardian`, `repeated_lockdown_extends_never_shortens` |

Guidance in the app is always to comply: the design aims to end the encounter quickly with nothing valuable taken, not to resist.

### 2. Wallet drainer or malicious signature

A phishing dApp tricks the owner into signing a vault instruction.

- A signed withdrawal request only queues a delayed withdrawal to a fixed destination (`address = pending.destination`); it cannot be redirected (test `execute_only_pays_the_stored_destination`).
- Guardians are alerted about the request and cancel it with one tap; the owner gets a "Was this you?" alert for requests this phone did not make (`app/features/vault/use-withdrawal-watcher.ts`, `app/features/guardian/use-guardian-watcher.ts`).
- A drainer cannot pull tokens from the vault: SPL withdrawals follow the same delay (test `spl_tokens_follow_the_same_rules`).

### 3. Stolen or cloned phone

- The sentinel key can only cancel and freeze (test `sentinel_cannot_move_funds`); stealing it gains nothing.
- The owner key is not on the device in plaintext; it stays in Seed Vault or the wallet app.
- The app locks with a PIN and relocks after a minute in the background; PINs are stored as salted SHA-256 hashes in secure storage (`app/features/security/security-store.ts`).

### 4. A malicious or compromised guardian

- A guardian can cancel and freeze, which is disruptive but moves no funds. The owner can replace them, which waits the delay like any settings change.
- A guardian cannot release funds or lift a freeze alone (tests `owner_and_guardian_can_expedite`, `lifting_lockdown_needs_owner_and_real_guardian`).
- Guardian rewards pay only current guardians, capped at 8 days per claim (tests `only_guardians_can_claim`, `stipend_accrues_pro_rata_and_caps_at_eight_days`).

### 5. Someone who is not a party to the vault

- Strangers can deposit and can execute a withdrawal whose delay has passed (it still pays only the owner's chosen destination), and nothing else (test `strangers_cannot_lock_down`).
- Every program account is a typed, discriminator-checked Anchor account at a derived address; see the triage of an automated review in [security-review.md](security-review.md).

## Privacy of the freeze report and the AI

- Device details (model, system, app version, public IP, GPS) are recorded only when the backup PIN is used, and stored only in the phone's secure storage (`duress.ts`). The public IP comes from Cloudflare's trace endpoint, which receives nothing but the request itself.
- The AI explanation runs on the phone (Qwen3 0.6B through llama.cpp). No server and no API key: nothing to extract from the APK, and the report never leaves the device. The model download is the feature's only network request and carries no user data (`app/features/ai/on-device.ts`).
- The model cannot act: it only turns the report's facts into sentences. The suggested next step is chosen in code for each case and the model rephrases it, so a wrong answer cannot give unsafe advice; the recorded facts are always shown beside it.

## Trust assumptions and residual risks

- **Upgrade authority.** The program is upgradeable, and the key that can upgrade it could change these rules. Before mainnet it must be made immutable or moved to a multisig.
- **Not audited.** 22 tests and an automated review, no professional audit yet.
- **The phone at the moment of duress.** If the attacker takes the phone before the backup PIN's freeze confirms (a few seconds on devnet), the freeze may not land; the delay still protects the savings, and guardians can still freeze.
- **SMS needs a SIM and signal.** Without them the freeze still happens and the report records the text as failed.
- **Delay length is the owner's choice.** Demo timers (2 minutes) are for testing only; the app labels them so.
- **Spending wallet.** Funds outside the vault are not protected, by design.
