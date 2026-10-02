# Security model

The precise rules the `nest_vault` program enforces: who can sign what, what a freeze does, why the delay cannot be skipped, and what happens when each key is compromised. Every rule cites the code in [`programs/nest_vault/src/lib.rs`](../programs/nest_vault/src/lib.rs) and [`state.rs`](../programs/nest_vault/src/state.rs), and the LiteSVM test in [`programs/nest_vault/tests/vault.rs`](../programs/nest_vault/tests/vault.rs) that checks it. For attackers and scenarios, see the [threat model](threat-model.md).

Program `EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ` (devnet). Not audited.

## Accounts

| Account | Address (seeds) | Holds | Who can move what is in it |
|---|---|---|---|
| `Vault` | `["vault", owner]` | Settings, roles, `lockdown_until`, `epoch`; the savings in SOL (its own lamports) | Only the program, through `execute_withdrawal`, `expedite_withdrawal` and `instant_withdraw` |
| Vault token account | Associated token account of the vault PDA | Savings in an SPL token (SKR, USDC) | Same three instructions, signed by the vault PDA |
| `PendingWithdrawal` | `["withdrawal", vault, id]` | Mint, amount, **fixed destination**, `requested_at`, `unlock_at`, `epoch` | Closed (rent back to the vault) on execute, expedite or cancel |
| `PendingConfig` | `["config", vault]` (one at a time) | Proposed settings, `apply_at`, `epoch` | Closed on apply or cancel |
| `StipendPool` | `["stipend", vault]` | Reward mint, `rate_per_week`, last claim per guardian | Its token account pays only `claim_stipend` |

All accounts are typed Anchor accounts (discriminator and owner checked) at derived addresses. A `PendingWithdrawal` or `PendingConfig` can only be used with the vault it names (`has_one = vault`).

## Roles

| Role | Key | Set by | Limits |
|---|---|---|---|
| Owner | The wallet that created the vault (Seed Vault or any Mobile Wallet Adapter wallet) | `init_vault`; never changes (the vault address is derived from it) | One per vault |
| Guardian | Another person's wallet | Vault settings | 0 to 3 (`MAX_GUARDIANS`); must differ from the owner, the sentinel and each other (`DuplicateKey`) |
| Sentinel | An Ed25519 key created by the app on the owner's phone | Vault settings | Exactly one; non-empty and not the owner (`InvalidSentinel`) |
| Safe address | A destination that skips the delay (the owner's cold wallet) | Vault settings | 0 to 5 (`MAX_SAFE_ADDRESSES`); no duplicates |
| Anyone | Any signer | | Deposit, fund the reward pool, run a matured withdrawal or settings change |

`role_of` (state.rs) returns Owner, Guardian or Sentinel; a signer with none of these gets `Unauthorized`.

## Instructions and who can sign them

| Instruction | Required signers | Checks (on top of account constraints) | Effect | Test |
|---|---|---|---|---|
| `init_vault` | Owner | Settings valid: windows 60 s to 30 days, at most 3 guardians and 5 safe addresses, sentinel distinct, no duplicate or empty keys | Creates the vault; settings apply at once because it is empty | `creates_vault_and_accepts_deposits`, `rejects_bad_settings` |
| `deposit_sol` | Anyone | Amount > 0 | SOL into the vault | `creates_vault_and_accepts_deposits` |
| `deposit_token` | Anyone | Amount > 0; mint matches the token program | Tokens into the vault's token account | `spl_tokens_follow_the_same_rules` |
| `request_withdrawal` | Owner (`has_one = owner`) | Not frozen; amount > 0; destination is not the vault | Creates a pending withdrawal with `unlock_at = now + delay` and the current `epoch` | `withdrawal_waits_for_the_delay` |
| `execute_withdrawal` | Anyone | Not frozen; `pending.epoch == vault.epoch`; `now >= unlock_at`; destination equals the stored one; SOL keeps the vault rent-exempt | Pays the stored destination, closes the request | `withdrawal_waits_for_the_delay`, `execute_only_pays_the_stored_destination`, `cannot_withdraw_below_rent_floor` |
| `expedite_withdrawal` | Owner **and** a current guardian | Not frozen; epoch matches; destination equals the stored one | Pays before the delay ends | `owner_and_guardian_can_expedite` |
| `cancel_withdrawal` | Owner, any guardian or the sentinel | Signer has a role | Closes the request; no funds move | `owner_guardian_and_sentinel_can_cancel_strangers_cannot` |
| `instant_withdraw` | Owner | Not frozen; SOL destination, or the owner of the SPL destination account, is on the safe list; mint matches | Pays at once | `safe_list_is_instant_everything_else_is_not` |
| `lockdown` | Owner, any guardian or the sentinel | Signer has a role | `lockdown_until = max(current, now + lockdown_secs)`; `epoch += 1` | `sentinel_lockdown_freezes_and_voids_everything`, `repeated_lockdown_extends_never_shortens`, `strangers_cannot_lock_down` |
| `lift_lockdown` | Owner **and** a current guardian | Vault is frozen | Ends the freeze now; `epoch += 1` | `lifting_lockdown_needs_owner_and_real_guardian` |
| `propose_config` | Owner | Not frozen; new settings valid; no other proposal open | Creates a pending change with `apply_at = now + current delay` | `settings_change_waits_and_can_be_cancelled` |
| `apply_config` | Anyone | Not frozen; epoch matches; `now >= apply_at` | Applies the settings, closes the proposal | `settings_change_waits_and_can_be_cancelled` |
| `cancel_config` | Owner, any guardian or the sentinel | Signer has a role | Closes the proposal | `settings_change_waits_and_can_be_cancelled` |
| `setup_stipend` | Owner | Rate > 0; once per vault | Creates the reward pool and its token account | `guardian_first_claim_pays_a_week_and_counts_as_check_in` |
| `fund_stipend` | Anyone | Amount > 0; mint matches the pool | Tokens into the pool | `guardian_rewards_work_with_mainnet_skr` |
| `claim_stipend` | A current guardian | Signer is in `guardians` | Records a check-in; pays `rate × min(elapsed, 8 days) / 1 week` (first claim: one week), capped at the pool balance | `stipend_accrues_pro_rata_and_caps_at_eight_days`, `only_guardians_can_claim`, `empty_pool_still_records_the_check_in` |
| `guardian_heartbeat` | A current guardian | Signer is in `guardians` | Records a check-in | `guardian_heartbeat_records_check_in` |

Only three instructions can move savings out of the vault: `execute_withdrawal`, `expedite_withdrawal` and `instant_withdraw`. The sentinel and guardians cannot sign any of them alone.

## Cancellation and freeze rules

- **Cancel** closes one pending withdrawal or the pending settings change. The owner, any guardian or the sentinel can do it, frozen or not. It never moves savings; the account's rent returns to the vault.
- **Freeze** (`lockdown`) can be triggered by the owner, any guardian or the sentinel (the backup PIN path). While frozen, `request_withdrawal`, `execute_withdrawal`, `expedite_withdrawal`, `instant_withdraw`, `propose_config` and `apply_config` all fail with `InLockdown`. Deposits, cancels, check-ins and reward claims still work.
- **Voiding.** Every freeze, and every early lift, increments `epoch`. A pending withdrawal or settings change created in an older epoch can never execute or apply (`VoidedByLockdown`), even after the freeze ends. It can only be cancelled. An attacker who queued a request before the freeze has to start again and wait the full delay.
- **Extend, never shorten.** A second freeze sets `lockdown_until` to the later of the two end times, so nobody can use a new freeze to cut an existing one short.
- **Ending a freeze.** It ends by itself at `lockdown_until`. Ending it early needs the owner and a current guardian to sign the same transaction. A coerced owner alone, or a guardian alone, cannot do it. A vault with no guardians cannot be unfrozen early.

## Why the delay cannot be bypassed

| Path an attacker with the owner's key might try | Why it fails |
|---|---|
| Request, then execute at once | `execute_withdrawal` checks `now >= unlock_at`, and `unlock_at` is set by the program from the vault's delay, not by the caller |
| Request to one address, execute to another | `execute_withdrawal` and `expedite_withdrawal` pin the destination: `address = pending.destination` |
| `instant_withdraw` to their own address | Only addresses on the safe list are accepted; for tokens, the destination account's owner must be on the list |
| Add their address to the safe list, or shorten the delay | `propose_config` waits the **current** delay before `apply_config` works, and any role can cancel it; a freeze voids it |
| Add themselves as a guardian to use `expedite_withdrawal` | Same settings delay; and expedite needs a guardian that is already on the vault |
| Replace the sentinel or remove guardians first | Same settings delay; guardians are alerted and can cancel it |
| Pay out more than requested, or drain the rent | The amount is fixed in the request; SOL payouts stop at the rent-exempt minimum (`InsufficientFunds`) |
| Reuse a request that was voided by a freeze | Epoch check (`VoidedByLockdown`) |

The program accepts windows from 60 seconds to 30 days so devnet demos can run in minutes. The app offers 24 hours to 7 days on real vaults and labels demo timers (2 minutes) as testing only. A delay chosen on-chain is the only one that counts: a modified app cannot shorten it.

## Safe-address and settings changes

All settings (guardians, sentinel, safe addresses, delay, freeze length) change through one path:

1. The owner signs `propose_config`. The program validates the new settings and sets `apply_at = now + current delay`. Only one proposal can be open at a time.
2. During that delay, the owner, any guardian or the sentinel can `cancel_config`; a freeze voids it.
3. After the delay, anyone can `apply_config`.

Lengthening the delay waits the old delay; shortening it also waits the old delay. A safe address therefore always reaches the list at least one full delay after it was proposed, in plain view of the guardians.

## Guardian limits

- Up to 3 per vault, each a separate wallet, none equal to the owner or sentinel.
- **Can alone:** cancel a withdrawal or settings change, freeze, check in, claim rewards.
- **Can with the owner:** release a pending withdrawal early (to its stored destination), end a freeze early.
- **Can never:** request a withdrawal, change settings, take savings, or choose where money goes.
- **Rewards:** only current guardians can claim; each claim covers at most 8 days, so skipped check-ins are forfeited; a claim never exceeds the pool balance. The pool is separate from the savings (its token account belongs to the pool PDA), so rewards can never touch savings. The trace in [skr-trace.md](skr-trace.md) shows each of these on devnet.

## The sentinel key and Android Keystore

The sentinel lets the backup (duress) PIN freeze the vault silently: the owner's wallet always shows a signing prompt, which an attacker would see.

- Created by the app when the vault is set up: 32 random bytes from `crypto.getRandomValues`, stored with `expo-secure-store` under `nest.sentinel.<owner>` ([`app/features/vault/sentinel.ts`](../app/features/vault/sentinel.ts)). On Android, secure-store encrypts the value with an AES key held in Android Keystore; the key material never leaves Keystore, and the encrypted value is useless outside this app on this phone.
- Its public key is registered on the vault as `sentinel`.
- **Can:** `lockdown`, `cancel_withdrawal`, `cancel_config`. **Cannot:** move funds, request withdrawals or change settings (test `sentinel_cannot_move_funds`).
- The backup PIN signs a `lockdown` with it in the background ([`app/features/security/duress.ts`](../app/features/security/duress.ts)). The sentinel pays its own fee: when the vault is created, the owner sends it a small amount of SOL in the same transaction, so the freeze needs no wallet approval.

## Compromise cases

| What is compromised | What the attacker can do | What they cannot do | Recovery |
|---|---|---|---|
| **The phone, unlocked** (theft, coercion, malware) | Use the app; ask the wallet to sign a withdrawal request or settings change; use the sentinel to freeze or cancel | Get the owner key (it stays in Seed Vault or the wallet app); move savings before the delay; reach any address not on the safe list | Guardians are alerted and cancel; anyone with a role freezes; replace the sentinel through a settings change |
| **The owner's wallet key** | Everything the owner can: requests, settings proposals, freezes, instant withdrawals **to existing safe addresses** | Skip the delay to any new address; skip the settings delay; release early without a guardian | Guardians cancel each request and proposal, and freeze. Savings sent to safe addresses still belong to the owner. Long term, move savings to a new vault with a new owner key once a withdrawal to a safe address goes through |
| **One guardian's wallet** | Cancel and freeze (disruptive); claim their own rewards | Move or redirect any savings; change settings; end a freeze alone | The owner proposes a replacement (waits the delay). See the residual risk below |
| **A guardian and the owner key together** | Release a pending withdrawal early; end a freeze early | Nothing beyond what the owner and that guardian could sign | Use more than one guardian and choose them carefully; this is the trust a guardian is given |
| **The sentinel key** (extracted from a rooted phone) | Freeze and cancel | Move any funds or change settings | Replace it through a settings change |
| **The program upgrade authority** | Deploy new program code with different rules | | Before mainnet: make the program immutable or move the authority to a multisig |
| **The bundled Groq API key** | Use AI credit on that key | Access funds, wallets or user data; the AI cannot act in the app | Rotate the key ([ai.md](ai.md)) |

## Residual risks

- **Freeze griefing.** A malicious guardian, or someone holding the sentinel key, can freeze again before each freeze ends. Proposing a settings change needs an unfrozen vault, so removing that guardian requires the owner and another honest guardian to end the freeze and then outlast the settings delay without a new freeze. Savings are never taken in this case, but they can be held up. A per-role freeze cooldown is the planned fix before mainnet.
- **Reward pool is one-way.** No instruction returns tokens from the reward pool to the owner; they can only be claimed by guardians.
- **Not audited**, and the program is upgradeable; see the [threat model](threat-model.md#trust-assumptions-and-residual-risks).
