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

## Failure cases

| Case | What happens | Backed by |
|---|---|---|
| **Compromised phone** (malware or an attacker with the unlocked phone) | The owner key is not on the phone (Seed Vault or the wallet app holds it), so the attacker can at most get the owner to sign a request, which waits the delay and alerts guardians. The sentinel key on the phone can only freeze and cancel. | `sentinel_cannot_move_funds`, `attacker_with_owner_key_cannot_take_funds_early` |
| **Guardian collusion with an attacker** | Guardians can never move funds, so collusion cannot take savings. Together with a stolen owner key, a guardian could release a pending withdrawal early (`expedite_withdrawal` needs owner and guardian) or lift a freeze early. Mitigation: choose guardians you trust, use more than one, and keep the delay long so an unexpected request is noticed. | `owner_and_guardian_can_expedite`, `lifting_lockdown_needs_owner_and_real_guardian` |
| **Lost or unreachable guardian** | Nothing is at risk: withdrawals still wait the delay and the owner can cancel alone. The vault loses its second pair of eyes until the guardian is replaced (a settings change that waits the delay). The What-if simulator flags this, and SKR rewards encourage weekly check-ins so a quiet guardian shows up early. | `settings_change_waits_and_can_be_cancelled`, `app/features/intel/simulator.ts` |
| **SMS leakage** | The emergency text contains the fact the backup PIN was used, a time and a map link. Anyone who sees the contact's phone sees that. It never contains balances, addresses or keys. The text is sent by a native module with no UI on the owner's phone, so the person holding that phone sees nothing. | `app/features/security/duress.ts`, `app/modules/nest-sms` |
| **Emergency contact consent** | The owner chooses the contact in setup and is told what the text says; the contact should agree to it beforehand. Practice mode sends a text clearly marked as a drill, so contact and owner can rehearse without alarm. The app never texts anyone else. | `app/app/security-setup.tsx` |
| **Who can freeze** | The owner, any guardian, and the phone's sentinel key (the backup PIN). Strangers cannot. A repeated freeze only extends it. A freeze voids every pending withdrawal and pending settings change. | `strangers_cannot_lock_down`, `repeated_lockdown_extends_never_shortens`, `sentinel_lockdown_freezes_and_voids_everything` |
| **Lifting a freeze** | It ends by itself after the freeze period the owner chose. Lifting it early needs the owner and a current guardian signing together; neither can alone, so a coerced owner cannot undo the freeze. | `lifting_lockdown_needs_owner_and_real_guardian` |
| **Groq unavailable or wrong** | Scores, signals, simulator outcomes and recommended actions are computed in code and shown even without AI. The model cannot take any action, and its text is shown next to the computed facts. | `app/features/intel/` |

## Privacy and the AI

- Device details (model, system, app version, public IP, GPS) are recorded only when the backup PIN is used, and stored only in the phone's secure storage (`duress.ts`). They are never sent to the AI. The public IP comes from Cloudflare's trace endpoint, which receives nothing but the request itself.
- Nest Intelligence sends Groq only the facts shown on screen: amounts, durations, counts, roles, risk signals and short addresses. Never keys, full addresses, location, IP, device details or PINs (`app/features/ai/groq.ts`).
- The Groq API key is built into the app as AES-256-GCM ciphertext (key derived with SHA-256) and decrypted at run time. That keeps it out of the APK as plain text, but a determined person can recover it; it is a dedicated key with a spending limit, rotated after judging. Its worst case is someone running up AI usage on that key, not access to anyone's funds or data.
- The AI cannot act and does not decide. It words facts the app computed and repeats the app's recommended action.

## Trust assumptions and residual risks

- **Upgrade authority.** The program is upgradeable, and the key that can upgrade it could change these rules. Before mainnet it must be made immutable or moved to a multisig.
- **Not audited.** 22 tests and an automated review, no professional audit yet.
- **The phone at the moment of duress.** If the attacker takes the phone before the backup PIN's freeze confirms (a few seconds on devnet), the freeze may not land; the delay still protects the savings, and guardians can still freeze.
- **SMS needs a SIM and signal.** Without them the freeze still happens and the report records the text as failed.
- **Delay length is the owner's choice.** Demo timers (2 minutes) are for testing only; the app labels them so.
- **Spending wallet.** Funds outside the vault are not protected, by design.
