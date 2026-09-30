# Automated security review: triage

An automated review of commit `27ce56e` reported 38 findings (6 high, 22 medium, 6 low, 4 info). The review itself says none of the code findings was confirmed as a defect; they are pattern matches to check by hand. This page records what each one is and what was done. Program changes were ruled out here: the program is deployed on devnet and changing it would change what the published APK talks to.

## Fixed

| Finding | What was done |
|---|---|
| uuid 7.0.3 (GHSA-w5hq-g745-h8pq) | Pinned to 11.1.1 through an npm `overrides` entry for `xcode`, its only user. `xcode` calls `uuid.v4()`, which 11.x still provides under `require`. Build-time only: uuid is not in the app bundle. |
| Key material passed to a logger | The flagged lines in `app/scripts/create-test-skr.mjs` and `app/scripts/owner-request.mjs` only print usage text naming a keypair file; no key is logged. The usage placeholders were renamed to stop the match. The real case was elsewhere: `scripts/mock-wallet-key.sh` and `scripts/dev-owner.sh` printed a dev private key to the terminal. `mock-wallet-key.sh` now writes the key straight into the mock wallet's `local.properties` (file mode 600) and prints only the public key; `dev-owner.sh` no longer prints it. These keys are devnet test keys for the emulator only. |

## Checked, no change needed

**Program (`programs/nest_vault`)**

| Finding | Why it is not a defect |
|---|---|
| Type cosplay, `pay_out` (lib.rs:221) | Every program account is a typed `Account<'info, T>`, which checks the owner program and the 8-byte discriminator. The flagged code reads a destination token account, and checks its owner program and mint before deserializing it. |
| `init_if_needed` on `vault_token` (deposit_token) and `guardian_token` (claim_stipend) | Both are associated token accounts with `associated_token::mint`, `authority` and `token_program` constraints, which Anchor checks on the already-existing path too. Neither handler relies on anything set only at creation. |
| `execute_withdrawal` has no signer | By design. Once a request's delay has passed, anyone may execute it, and the money can only go to the destination fixed when the owner requested it (`address = pending.destination`). The handler checks the unlock time, the lockdown and the request's epoch. This lets a withdrawal complete even if the owner's phone is lost. |
| `pool` not validated (fund_stipend) | `pool` is a typed `Account<StipendPool>` owned by this program, so it can only be a pool created by `setup_stipend` at its PDA; `has_one = mint` and the pool token account's `associated_token::authority = pool` tie the rest together. Funding is intentionally open to anyone. `claim_stipend`, which pays out, also checks the pool's seeds and `has_one = vault`. |
| Writable unchecked `destination` (instant_withdraw) | Checked in the handler: for SOL it must be on the vault's safe list; for tokens it must be a token account of the right mint, owned by the token program, whose owner is on the safe list. |
| Account precreation DoS (`init_vault`) | Anchor's `init` handles a PDA that already holds lamports by topping up, allocating and assigning instead of failing. |
| Unchecked arithmetic (state.rs, `accrued`) | Release builds set `overflow-checks = true` (root `Cargo.toml`), so an overflow aborts the transaction instead of wrapping. The multiply is done in `u128` and the payout is capped at the pool's balance. |
| CPI target unresolved (deposit, fund, claim, execute) | The target is always a typed `Program<System>` or `Interface<TokenInterface>` account, which Anchor checks is the System, Token or Token-2022 program. |
| Test files (random authority, arithmetic, precreation in `tests/vault.rs`) | Test code: `Pubkey::new_unique()` and plain arithmetic in LiteSVM tests are expected. |

**Dependencies**

| Finding | Why it stays |
|---|---|
| decode-uri-component 0.2.2 | Comes in through `expo-router` → `query-string` 7, which loads it with `require`. Every fixed version (0.3.0 and later) is ESM-only, so forcing it would break deep-link parsing. Exposure is limited to parsing the app's own deep links. Resolves when Expo moves to a newer `query-string`. |
| rand 0.7.3, derivative, libsecp256k1, paste, ansi_term, bincode | Transitive dependencies of the Solana and Anchor crates (and the LiteSVM test harness). They are advisories about unmaintained crates or a `rand` case that needs a custom logger with `thread_rng`, which the program does not use. They clear with an Anchor or Solana upgrade, which would change the deployed program. |
| License notes | Informational. The crate has no `license` field yet. |
