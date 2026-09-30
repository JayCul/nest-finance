# SKR integration

Nest Finance pays guardians in SKR for staying reachable. A guardian is only useful if they are around to cancel a suspicious withdrawal, so the program pays for weekly check-ins and forfeits the weeks a guardian misses. The rules are enforced on-chain, not by the app.

## How it works

1. **The owner starts a rewards pool.** `setup_stipend` creates the vault's pool and records the reward token and a weekly rate per guardian. In the app, one approval creates the pool and funds it (`setup_stipend` plus `fund_stipend` in one transaction).
2. **Anyone can top it up.** `fund_stipend` moves tokens into the pool's token account. The owner does this from the People tab ("Top up").
3. **Guardians collect when they check in.** `claim_stipend` pays the guardian what they have earned and records a heartbeat on the vault (`guardian_last_seen`), which the owner sees as "last check-in". In the app this is the guardian's "Check in & collect … SKR" button.
4. **Missed weeks are forfeited.** A claim pays `rate_per_week × time since the last claim ÷ 1 week`, with the time capped at 8 days. A first claim counts as one week. The payout never exceeds what is in the pool; with an empty pool the check-in is still recorded.
5. **The safety score rewards funding.** The owner's safety score gains points when the pool covers at least two weeks for every guardian, and the rewards card shows how many weeks the pool covers.

Only a current guardian of the vault can claim (`only_guardians_can_claim`). The tests `guardian_first_claim_pays_a_week_and_counts_as_check_in`, `stipend_accrues_pro_rata_and_caps_at_eight_days` and `empty_pool_still_records_the_check_in` cover the rules.

## Accounts

| Account | Address | Holds |
|---|---|---|
| `StipendPool` | PDA `["stipend", vault]` | `vault`, `mint` (the reward token), `rate_per_week` (base units), `claims` (each guardian's `last_claim` time, up to 3), `bump` |
| Pool token account | Associated token account of the pool PDA for `mint` | The funded tokens; only the pool PDA can move them, and only through `claim_stipend` |
| Guardian token account | Guardian's associated token account for `mint` | Created on the first claim if needed, paid for by the guardian |

## Token abstraction

The program is not tied to one token. The pool stores its `mint` when it is created, and `fund_stipend` and `claim_stipend` require the token accounts to match it (`has_one = mint`, `associated_token::mint`). Token accounts go through Anchor's `TokenInterface`, so both the Token and Token-2022 programs work, and every transfer is `transfer_checked` with the mint's decimals.

In the app, the token for new pools comes from one setting, and everything else follows each pool's stored `mint`:

```ts
// app/constants/app-config.ts
static skrMint = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' // devnet stand-in
static skrDecimals = 6
```

Top-ups, claims and balances read the mint from the pool account (`app/features/stipend/use-stipend.ts`), so a pool keeps working whatever token it was created with.

## Devnet stand-in

SKR exists only on mainnet, so the devnet build uses Circle's devnet USDC (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`), which anyone can get free at faucet.circle.com. Like SKR, it is a classic SPL token with 6 decimals, so amounts, rates and the UI behave exactly as they will with SKR. The app labels it as a stand-in and offers a "Get free test tokens" button that copies the wallet address and opens the Circle faucet.

## Demonstrated with the real SKR mint

The test `guardian_rewards_work_with_mainnet_skr` (`programs/nest_vault/tests/vault.rs`) loads SKR's actual mainnet mint account, copied byte for byte from mainnet into `programs/nest_vault/tests/fixtures/skr-mint-mainnet.bin` (the fixture's README gives the slot and the command), at SKR's real address. It then runs the deployed program binary through the full cycle the app uses:

1. The owner creates a pool of 10 SKR a week and funds it with 50 SKR in one transaction.
2. The guardian checks in and collects 10 SKR; the check-in is recorded on the vault.
3. A month later the guardian collects 8 days' worth, not 30: missed weeks are forfeited.

SKR's mint authority is not ours, so the test writes the owner's SKR balance directly instead of minting it. Everything the program does (associated token accounts for SKR, `transfer_checked` with SKR's 6 decimals, the pool signing as a PDA) runs against the real mint account. `cargo test`: 22 of 22 pass.

On devnet, the same instructions run with the Circle USDC stand-in; the transactions are listed in [devnet-evidence.md](devnet-evidence.md) (pool created, funded, and rewards collected).

## Moving to mainnet SKR

SKR on mainnet: `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`, owned by the classic Token program, 6 decimals (read from the chain on 30 September 2026).

1. Deploy the same program to mainnet after an audit, with the upgrade authority made immutable or moved to a multisig.
2. In `app/constants/app-config.ts`: `skrMint = 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3'`, `skrDecimals = 6` (unchanged), `isDevnet = false` (hides the faucet prompts and makes 48 hours the default delay), and a mainnet RPC in `networks`.
3. No program change is needed: the program accepts any mint, and SKR's format matches the stand-in.

Devnet pools do not move to mainnet; they are test accounts on a separate network. Owners on mainnet create a new pool funded with SKR.

## Current limits

- A pool's token is fixed when it is created. Changing a vault's reward token would need a way to close a pool, which is not built yet.
- Tokens in a pool leave only through guardian claims; there is no instruction for the owner to take unspent rewards back. Both are candidates for the next program version.
