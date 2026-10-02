# SKR rewards: on-chain trace

One complete guardian-rewards cycle, run on Solana devnet on Fri, 02 Oct 2026 06:26:46 GMT by `app/scripts/skr-trace.ts`, which also wrote this page. Every number below was read back from the chain after each transaction.

The reward token here is Circle devnet USDC ([`4zMMC9…JDncDU`](https://explorer.solana.com/address/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU?cluster=devnet)), the stand-in for SKR on devnet: same Token program, same 6 decimals. On mainnet the same instructions run with SKR (`SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`); the test `guardian_rewards_work_with_mainnet_skr` runs this exact cycle against SKR's real mainnet mint account ([skr.md](skr.md)).

## Accounts

| Account | Address | What it is |
|---|---|---|
| Owner | [`2By2LA…Duvy1c`](https://explorer.solana.com/address/2By2LAtc5svduLucxFQgwqoGmbMQstZEAVSgnrDuvy1c?cluster=devnet) | Test owner wallet |
| Guardian | [`27WB8w…wAoKn7`](https://explorer.solana.com/address/27WB8w9rQRKnpmRWYCe28naQMSdpqST7pukyC1wAoKn7?cluster=devnet) | Demo guardian wallet |
| Vault | [`2M4LY2…mtxEB1`](https://explorer.solana.com/address/2M4LY2ZBmqexGYD6dnLnuNhZ1VDwALTk934LiQmtxEB1?cluster=devnet) | PDA `["vault", owner]` |
| Rewards pool | [`5kSz5D…JkJT7U`](https://explorer.solana.com/address/5kSz5Dn1W84tD4syGWPgeJoVVGDtaqneYA43kLJkJT7U?cluster=devnet) | PDA `["stipend", vault]`, a `StipendPool` account |
| Pool token account | [`CxnUkv…iBkHGH`](https://explorer.solana.com/address/CxnUkvEUSXEGK7mdZamAy3oyV2u4nSb2mKskZPiBkHGH?cluster=devnet) | Associated token account of the pool PDA; only the pool can sign for it |
| Owner token account | [`CqgPH6…HpyTy5`](https://explorer.solana.com/address/CqgPH6Q5YZauNVcEZXgJKr876Q2rCngLsXfG5DHpyTy5?cluster=devnet) | Funds the pool |
| Guardian token account | [`FKZgiV…ax61b5`](https://explorer.solana.com/address/FKZgiVQYNXGS8g3HUVCPusgBGixhZEKacdcj4gax61b5?cluster=devnet) | Receives rewards; created on the first claim if needed |

## 1. Vault created with one guardian

`init_vault`: [`3vyKKk…pcaJtP`](https://explorer.solana.com/tx/3vyKKk9NaHfYrT29n9iDGVErJyNPLjLBuF3Vmb7YeA72PxtZ8mS9A9yER7uxBVmjhVyE8GFy1aWtTHZYS8pcaJtP?cluster=devnet). Guardian `27WB8w9rQRKnpmRWYCe28naQMSdpqST7pukyC1wAoKn7`, 2-minute demo delay.

## 2. Pool created and funded (one transaction)

`setup_stipend` + `fund_stipend`: [`5ZVcKv…BgHz1L`](https://explorer.solana.com/tx/5ZVcKvvdTRRDBRBCUJyhnpsaRCXRhwf4grVSW2ry6FJQCnD2qF5yt5yxZePGbPxVZkhDcZ1REdNedF62uCBgHz1L?cluster=devnet)

- Pool state: `mint = 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`, `rate_per_week = 1000000` (1 token a week), `claims = []`.
- Owner token account: 5 → 0 tokens.
- Pool token account: 0 → 5 tokens.

## 3. First check-in: one week paid, heartbeat recorded

`claim_stipend` signed by the guardian: [`q2cKdV…WX4xoa`](https://explorer.solana.com/tx/q2cKdVop19y7cJwXqZEnFcCDwHNx5erqZNw3cFu61kMzhm6YR1hqzHH5pXTYVFvYZJ15TmEKaSiApYW8gWX4xoa?cluster=devnet)

- Rule: a guardian's first claim counts as one week, so `rate × 604800 / 604800 = 1`.
- Paid: **1** token (guardian 1 → 2; pool 5 → 4).
- Pool state: `claims = [{ guardian: 27WB8w…, last_claim: 1790922408 }]`.
- Heartbeat: vault `guardian_last_seen[0] = 1790922408`, the same time as the claim.

## 4. Second check-in: pro-rata accrual, with the 8-day cap

`claim_stipend` again, 152 seconds later: [`4q8Bf2…qWP5TJ`](https://explorer.solana.com/tx/4q8Bf2cmkVHQbPToYMdz4QXa8Vr12wXA2SGsZk2kxkRMoX3gdbzmAG8sHcUojE5u1ES9rJa5Rb5qiDBqyJqWP5TJ?cluster=devnet)

- Rule (`StipendPool::accrued` in `programs/nest_vault/src/state.rs`): `paid = rate_per_week × min(now − last_claim, 8 days) / 1 week`, never more than the pool holds.
- Expected: `1000000 × min(152, 691200) / 604800 = 251` base units.
- Paid: **251** base units (0.000251 tokens): matches the formula exactly.
- Pool state: `last_claim: 1790922408 → 1790922560`. Pool token account: 4 → 3.999749.
- Heartbeat: `guardian_last_seen[0]: 1790922408 → 1790922560`.

The cap is why a missed week is forfeited: a guardian who checks in after 30 days is paid for 8. Waiting 8 days on devnet is not practical, so the cap is shown by the program test `stipend_accrues_pro_rata_and_caps_at_eight_days`, which advances the clock 30 days and checks the payout is exactly 8 days' worth.

## Program log of the second claim

```text
Program EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ invoke [1]
Program log: Instruction: ClaimStipend
Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]
Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 105 of 182605 compute units
Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success
Program data: PnW6oqKv6cYT/xN4B7zo+aKXMlLAA2njH/3JpH1ehly6847XkX30oBCGKOi2E4VhUvVeqiFk740xHRXrp1w1D/xSkZcigeDA+wAAAAAAAABAT79qAAAAAA==
Program EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ consumed 19373 of 200000 compute units
Program EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ success
```

## Switching to SKR on mainnet

Set `skrMint = 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3'` in `app/constants/app-config.ts` (decimals stay 6) and deploy the same program to mainnet. No program change: the pool stores its mint and every transfer is `transfer_checked` against it. Details: [skr.md](skr.md).
