# Devnet evidence

Every Nest Finance event on the demo vaults, read from Solana devnet and decoded with the program's generated client (`app/scripts/devnet-evidence.ts`, generated 2026-09-30). Each row links to its transaction on the Solana Explorer, where the program's log shows the same event.

Program: [`EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ`](https://explorer.solana.com/address/EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ?cluster=devnet). The deployed binary matches this repository byte for byte ([verify.md](verify.md)).

Reading the roles: **owner** is the wallet (via Mobile Wallet Adapter), **guardian** is a second wallet, **sentinel (backup PIN)** is the tighten-only key in the phone's Android Keystore that signs the silent freeze when the backup PIN is entered.

## Summary

| Event | Count |
|---|---|
| Withdrawal requested | 21 |
| Withdrawal cancelled | 17 |
| Savings frozen | 8 |
| Deposit | 5 |
| Guardian collected rewards | 3 |
| Vault created | 2 |
| Guardian check-in | 2 |
| Guardian rewards pool created | 2 |
| Rewards pool funded | 2 |
| Withdrawal completed after the delay | 1 |
| Settings change proposed | 1 |
| Settings change applied | 1 |

## Demo owner (the video)

Vault [`CCYNF26y9AfyxZ5D1azdw31D1HzrGKtnEpbKHsDLjXJa`](https://explorer.solana.com/address/CCYNF26y9AfyxZ5D1azdw31D1HzrGKtnEpbKHsDLjXJa?cluster=devnet), owner `HGqR25WMRx2hnLFstth6JGdb6TK3cXmxFsZGuhjobHR3`. 59 events.

| When (UTC) | Event | Detail | Transaction |
|---|---|---|---|
| 2026-09-29 16:11 | Vault created | withdrawal delay 120 s | [4u7g…uYBZ](https://explorer.solana.com/tx/4u7gCx3XNmsU2LSDqmDZG4rLagAkDKkeZBNo9zxyW6vsTJW4wuW5nBwQo2V32ZRLHQ2g7SAboF24EC3MXc7TuYBZ?cluster=devnet) |
| 2026-09-29 16:13 | Deposit | 0.5 SOL | [3DjG…FU9R](https://explorer.solana.com/tx/3DjGoFTw6EHAkm1fxZ55rwMVuUmgfWPtFRggPUvEaiuAbYFfaq6M3JFp7aJnehsWxDmrTY7dsrB1HrUSC26dFU9R?cluster=devnet) |
| 2026-09-29 16:13 | Withdrawal requested | 0.2 SOL to HGqR…bHR3, unlocks after the delay | [63Mv…aQBp](https://explorer.solana.com/tx/63MvGoo5bfnWt3s9siZj7aGNwZ3BMpCFbHXbehHdZTijcSswZk5YeyUQwVSEXF1VeUt4NxxUCtVmxiGBeiTcaQBp?cluster=devnet) |
| 2026-09-29 16:16 | Withdrawal completed after the delay | 0.2 SOL | [2cYp…zD1S](https://explorer.solana.com/tx/2cYpDQx3mEy1D4rjMnqqzxCC9t1j1K8YQhZitfcQ3vLHhc2HvnANWJ2QMNeryC5kRaU1rmydqLEbDrV1J73JzD1S?cluster=devnet) |
| 2026-09-29 16:17 | Savings frozen | by the owner; pending withdrawals voided | [512V…G5x8](https://explorer.solana.com/tx/512VRrzC2AUvUAaPjSHUdfmz6yeZC8epuUegWoj6jpwGvCQzg1z5PJQZQZRnEhh4CTqfoas4bmfFUDkZj3CdG5x8?cluster=devnet) |
| 2026-09-29 17:19 | Savings frozen | by the sentinel (backup PIN); pending withdrawals voided | [3bzs…YJay](https://explorer.solana.com/tx/3bzs9DK4CPbcjzY5PVo2j4K17vQa63p2hpxg6PdHaLVfggXxQcu189a3FyQqZughPP7VDdtAUmovQAWZDpgqYJay?cluster=devnet) |
| 2026-09-29 18:10 | Withdrawal requested | 0.05 SOL to 9Sbx…ASmp, unlocks after the delay | [LfYi…Shda](https://explorer.solana.com/tx/LfYi1EBbyXqc7uCusS2x4etJy8VXdkKJy5eLK3JbNHujavEsEnoVAJttVodZHLjaGsmZoAARFfKcizdkmGvShda?cluster=devnet) |
| 2026-09-29 18:11 | Withdrawal cancelled | by the guardian | [2AtN…4ygs](https://explorer.solana.com/tx/2AtNGYqixTiv5578hSEn178R5hzsfPAWFgTLs3EFnRiBUUGLCVciQ9bGn21C5f1M6ChGT6mqo2JN7UHLjAky4ygs?cluster=devnet) |
| 2026-09-29 18:12 | Guardian check-in |  | [4XL5…hA4Z](https://explorer.solana.com/tx/4XL5crDGpa7QzrMNgdz4GRDdzLRHtBGWCuidDHKo8WXkn8VtUEpyAJ7VyKYSczUWzhPjn8fesEvaij5PbxRphA4Z?cluster=devnet) |
| 2026-09-29 18:13 | Guardian check-in |  | [4gtx…Qvfh](https://explorer.solana.com/tx/4gtxL1rZVFJuH7Abi7iMFJk169dDJKqqehx568zbdhrjysc3oHdjCEyXag8ykKgRNWKjtmgQLfjQpthxhBSaQvfh?cluster=devnet) |
| 2026-09-29 20:36 | Guardian rewards pool created | 10 tokens / week | [5TBk…rgQc](https://explorer.solana.com/tx/5TBkLWqW9ukYs398BB2Qa7Stenx1TLbhTummGh6qNjxp6wAN4mMFPPJakeoz5hSYUMES38jao5MVA9LS6ujWrgQc?cluster=devnet) |
| 2026-09-29 20:36 | Rewards pool funded | 100 tokens | [5TBk…rgQc](https://explorer.solana.com/tx/5TBkLWqW9ukYs398BB2Qa7Stenx1TLbhTummGh6qNjxp6wAN4mMFPPJakeoz5hSYUMES38jao5MVA9LS6ujWrgQc?cluster=devnet) |
| 2026-09-29 20:39 | Guardian collected rewards | 10 tokens | [23x1…WS8S](https://explorer.solana.com/tx/23x1uSkFaHXoUcb2uLUxd6z3TPhQrLYW8mKj7ty6c6k2U6LRYxEmYX9AEnF1qoGEQq5muW5HfsTRb1FcfSjWWS8S?cluster=devnet) |
| 2026-09-29 21:31 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [Y4ZH…GEeC](https://explorer.solana.com/tx/Y4ZHfas7tjjp6X1UwX6UB2rtqmaxK8Asv18Pec7tyKGK36M1ope3mdGRX2wd3YGzLJCVfiafMDo6PT1PtYNGEeC?cluster=devnet) |
| 2026-09-29 21:34 | Withdrawal cancelled | by the guardian | [34gL…Zm5o](https://explorer.solana.com/tx/34gLuo8Fo65B8wiRcB19xtK9mx52tqYcHxfqxRyQGHFUstAKYZ51pLChTvNdmJ95UdoFcrSkD2cLuFmM39ByZm5o?cluster=devnet) |
| 2026-09-29 21:39 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [37Kq…ZnW1](https://explorer.solana.com/tx/37KqX5NArqQJVyLXKSM7zfZmh55UKBYz3gWS6s7EdAq7ZWdE6zzMdyfSF3VRFANFWAX1svZ9m4jWa5RinKZKZnW1?cluster=devnet) |
| 2026-09-29 21:41 | Withdrawal cancelled | by the guardian | [5RtP…EWrQ](https://explorer.solana.com/tx/5RtPaJtQB7NN26wUqJnXqCZdFdW9v4m3kiQHPB7pgCBThPJGDMEqGWdBn2qzP11ZX68peunnm8tAYou1pB55EWrQ?cluster=devnet) |
| 2026-09-29 21:43 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [3mdx…QgEV](https://explorer.solana.com/tx/3mdxUq1k1bgkc8ZsPMQfdc2mBDssiEctsRHjiENv8mXnB9seUmiJtXPCfqyWj1Fem7LyCKsdJu6QFJXrtV17QgEV?cluster=devnet) |
| 2026-09-29 21:43 | Withdrawal cancelled | by the guardian | [2inQ…7GJe](https://explorer.solana.com/tx/2inQSkLqR8YrLWhSyxURqwLiJE5eG1rCFrVc8ReyTEmySBmZHW7sYncxqJXtzVnUtzk3FxKgKDz96AxAvTfu7GJe?cluster=devnet) |
| 2026-09-29 21:48 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [3tZJ…tfSP](https://explorer.solana.com/tx/3tZJdLSaWnfXyapGQqosYkxFCpoR4D1Py4DsBrNn5qtruhTf4mKZQy2CAWEzYcEJ8RVwzk4p42zxSiaBiWUetfSP?cluster=devnet) |
| 2026-09-29 21:48 | Withdrawal cancelled | by the guardian | [H84F…G9vb](https://explorer.solana.com/tx/H84FQc7qbkmX7cZYSuc7ui17BXHYfvemjKBbL3Peuy7cSDC65su3DQNM4o7bNYF8to451cex6s5UZXARWYWG9vb?cluster=devnet) |
| 2026-09-29 21:52 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [5gqJ…XEU9](https://explorer.solana.com/tx/5gqJFeD2uvEufW4p9a9EKFvnamWcU6oZPYdG992bJjVgWwGz8xeoyAgkAcm4dKhS4Ze65UcYdVcmcHHPo3yXXEU9?cluster=devnet) |
| 2026-09-29 22:06 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [3Hda…VX4P](https://explorer.solana.com/tx/3Hda4MQa174J7QQTgHa9WW3mLZQE9VdUKcEmHLhL8xoUTy9BVaHLBhapSXuyyB1acHRh72APMPDrMED3ZyDLVX4P?cluster=devnet) |
| 2026-09-29 22:09 | Withdrawal cancelled | by the guardian | [3ji6…Yi6M](https://explorer.solana.com/tx/3ji6qBuX6Smx4x1WRoM7Fuvb4bHTshZqWZ5PJVQ7x3qgrH8yntATmE4wk2C7rVkbhkWWF23eig1Kff99rBVCYi6M?cluster=devnet) |
| 2026-09-29 22:09 | Withdrawal cancelled | by the guardian | [3Mr8…7yBb](https://explorer.solana.com/tx/3Mr8DzuqCtBsULgqLySbSiC3x9aDWWpfE9xRYHqMnSw1atZh1YvpcjN36ZaRFmomgBmY3hSb7uQfYUxjHaMa7yBb?cluster=devnet) |
| 2026-09-29 22:12 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [5Tfd…HVUM](https://explorer.solana.com/tx/5TfdWnvzkeXwtzKd82EzVkQQjT2hXEQenKePtgLCYV4c2MwXEoC7kTu11XViJbnFrpbBNQSjkYNB1ovzhWt5HVUM?cluster=devnet) |
| 2026-09-29 22:12 | Withdrawal cancelled | by the guardian | [32R9…FyBf](https://explorer.solana.com/tx/32R9Xk7LFz4pMxGPjocdzKLuLa1rvLnvbeD8p5FKraSsbfHGg8oboHsQnp72srJg6k3SaD1E1soE1T1gmj3nFyBf?cluster=devnet) |
| 2026-09-29 22:30 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [2nb8…HTiE](https://explorer.solana.com/tx/2nb8mQhVSCDrwL4PxWCQmubFDD4trmfNH4gCRJoweGnsDMekRPuv6F3caMxppWJG7zMmBogmJJvq2UJi3hckHTiE?cluster=devnet) |
| 2026-09-29 22:30 | Withdrawal cancelled | by the guardian | [GSaY…8BUK](https://explorer.solana.com/tx/GSaY7NLQcdiiDedBQuqxSpseLSniVASiy88yRQJH8X2RE5qSDkWDnVhGwjMbeG9GzqxHjAyRzmE8hrY23wi8BUK?cluster=devnet) |
| 2026-09-29 22:36 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [531z…Wuqy](https://explorer.solana.com/tx/531zsZEPxmMcdB5jzbgSE9LnY9zhmvXC2vj57wx1KxtK1PdZ96uAaZMgWAi2WoQ3h3RfTjUmhp5vP9n1jYDnWuqy?cluster=devnet) |
| 2026-09-29 22:40 | Withdrawal cancelled | by the guardian | [2XjG…Vh7e](https://explorer.solana.com/tx/2XjGvhmgwjzaJh1ckRVBhELDtSAC4GHLRieNGykH27rceWZD4g4HgL2prsyX7tL67s425utCGZxjV4TohdR9Vh7e?cluster=devnet) |
| 2026-09-29 22:41 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [29Lk…UWXr](https://explorer.solana.com/tx/29Lkc9MTDix6dALnKaujmVjMCLz6HvvefjcqZCcn5m2RGvGfEcLcV2EVCJ8DErJMMFAZqmC1Sc3PYUhugsKRUWXr?cluster=devnet) |
| 2026-09-29 22:41 | Withdrawal cancelled | by the guardian | [5qCv…U1n3](https://explorer.solana.com/tx/5qCv2PMvFe78nQhfBBKD6i9o1Rq76QZDVFBsZCr9ADdADuEXqUEF1mxGSd8nHmQtzWc3ZPHUy3TRzNuZVum3U1n3?cluster=devnet) |
| 2026-09-29 22:46 | Deposit | 0.03 SOL | [3vYf…bWnz](https://explorer.solana.com/tx/3vYfjec7UGTPTvpKPLahVRqE5DqyuZZ3zMxn1Df2M5mbYBVGBzbqCnJLPqeerydQzEbZ6iyWVH1F5tzBvAV1bWnz?cluster=devnet) |
| 2026-09-29 22:48 | Deposit | 0.1 SOL | [4Pvn…A83n](https://explorer.solana.com/tx/4PvnPdK7K8XSTLGrpgSZTccNsFdFXo7sUJ2zmCbhyJH7iEo2x6PK6EHWyhpCcoEx1AJakg7UzjNDFCi8D9t3A83n?cluster=devnet) |
| 2026-09-29 22:49 | Withdrawal requested | 0.05 SOL to HGqR…bHR3, unlocks after the delay | [3DVb…Ya3i](https://explorer.solana.com/tx/3DVb7yLVUXvMXFEDCeEcZxXdg2sdBAqXKUYneFikrkmuf63VAxeXEG87hbNmhZxwCCyvUHLgjNC8jZhMmjGJYa3i?cluster=devnet) |
| 2026-09-29 22:51 | Savings frozen | by the sentinel (backup PIN); pending withdrawals voided | [3CZz…Xtwk](https://explorer.solana.com/tx/3CZzan15euzUn4SRkr7K8pxGinMD2xLNx6C4NHEP56ht1faYe7D9fY1sXq9Aw398VjpDzBfgrJz9WJupc8FDXtwk?cluster=devnet) |
| 2026-09-29 23:05 | Deposit | 0.1 SOL | [VCJm…Cy25](https://explorer.solana.com/tx/VCJm9FxWpYtR19gdXmN8X8VYxrSVsyHKUwWJge8yR2ujbYeCQmkCHo7rD8YubqyWQVWffTJjBVQRwJ54bceCy25?cluster=devnet) |
| 2026-09-29 23:06 | Withdrawal requested | 0.05 SOL to HGqR…bHR3, unlocks after the delay | [2MQC…5Xiz](https://explorer.solana.com/tx/2MQCBf88UThTXnuRRPf9NzyXPNYQeHzKBz356fDFzGvKwnRyt6ppHMCL8qBXZ7WsLc9S1Rch7JmkyAYidzkz5Xiz?cluster=devnet) |
| 2026-09-29 23:07 | Savings frozen | by the sentinel (backup PIN); pending withdrawals voided | [5ZdP…pcLT](https://explorer.solana.com/tx/5ZdPAiMiUnZc7tCpgfkwV1EnHib9yoB4em69xzYmmfkahXvKU6Z4SSWsBDxBtwLwzRnUCGUccQ79Vu1kYcZKpcLT?cluster=devnet) |
| 2026-09-29 23:18 | Savings frozen | by the sentinel (backup PIN); pending withdrawals voided | [21LQ…ZVEE](https://explorer.solana.com/tx/21LQ9RD3JL8ebGUwZaatUiNM2NSPLfPcexbnvQivE6zy6UmjtMqmQxsyVbw4auNWhWa92XrLNqNFWZN42uBPZVEE?cluster=devnet) |
| 2026-09-30 06:44 | Guardian collected rewards | 0.6 tokens | [3PZ2…vF7z](https://explorer.solana.com/tx/3PZ2wiy8A5nUAmFdBzXBVpfHvdFUiPRBAAPAzfRSByjX8iviiYM1qtR5T7NJVrPkc2ugaPuCptC2rkTruq4evF7z?cluster=devnet) |
| 2026-09-30 07:08 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [w6n1…WLEW](https://explorer.solana.com/tx/w6n1u74HVqy8yaTfnatHcZLrqrYc2yTHAcoHcQozUABqZkoYHcwAKcUyAgYXwsmsEXQawoDg2rKeJgSf34PWLEW?cluster=devnet) |
| 2026-09-30 07:17 | Withdrawal cancelled | by the guardian | [WLZf…NVzt](https://explorer.solana.com/tx/WLZfzR36HoyQL6GcHVe2K2USkCnprU9R6VJma3ctNHAt7y77vCed7zJZSQZETpLTtL2dT9u2SnAXdaVnuoxNVzt?cluster=devnet) |
| 2026-09-30 07:19 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [5LNX…2dcY](https://explorer.solana.com/tx/5LNXsECZBWCTZYsN3dCZhqy13nEEJkXWcV4odLpAVruWgu8mnFY9WCg8NRLnHXjGNzygS6QCnHjZ5oAgiZAB2dcY?cluster=devnet) |
| 2026-09-30 07:23 | Withdrawal cancelled | by the guardian | [5hJM…oc6A](https://explorer.solana.com/tx/5hJMDA3dMSiKSqo8YLTheHhYA7N1vpFQAbe2PXhQzNko6ddaYguuD4JGxnCqgc1Es65xrKGLT4NXoMwtxXxwoc6A?cluster=devnet) |
| 2026-09-30 07:24 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [48CF…A8CG](https://explorer.solana.com/tx/48CFQWqzwDWsiB5Gosw3UNGF9hUXHX1mwaZCEGAhdZ8mLDyDt4EG2ibru7sD8AdqiqdJ1uooCDfvCG8bqrF2A8CG?cluster=devnet) |
| 2026-09-30 07:25 | Withdrawal cancelled | by the guardian | [5AaR…Ehna](https://explorer.solana.com/tx/5AaRpd9FJrCBB2u2c8VbPJE16CsNjbn4EaAdjg53ohz4iWoPGC9PmuxvVFft5pkNgdGz3FingxxKgBxGn9WgEhna?cluster=devnet) |
| 2026-09-30 07:26 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [2qKT…AgGn](https://explorer.solana.com/tx/2qKT24W1ReESjLHrEvQHaEuN9dY68qq6UySTZFaR4hMFWZ9VbCp4X4Fbn6N6bqjsEp9TAwz5WYLYzJCXQF9iAgGn?cluster=devnet) |
| 2026-09-30 07:27 | Withdrawal cancelled | by the guardian | [otDJ…W6ko](https://explorer.solana.com/tx/otDJTaNTWCexR4oQ37PQt4hV4kHwKGooJynQL7f6CBV63i8oJr1Xn1n8pVfcUVuT6RyR4ZbhYaqVzRqXobsW6ko?cluster=devnet) |
| 2026-09-30 07:28 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [T8TJ…mHpv](https://explorer.solana.com/tx/T8TJDXaph7mJt8hU6P3jmvYymUTWe1p1ikivLynStKmEtn49Ca9dbYY39SGKnQesLiSbEVxHQq5iHSyEMBvmHpv?cluster=devnet) |
| 2026-09-30 07:29 | Withdrawal cancelled | by the guardian | [3TVQ…46sz](https://explorer.solana.com/tx/3TVQZsbczEG95FdDNs8RX7D3rcjuhY6Cic5xhYCgmG3GXcM7HWJsJRTaJkfTuZqJWDAoJfRU773ZYyrwcG6G46sz?cluster=devnet) |
| 2026-09-30 07:30 | Withdrawal requested | 0.02 SOL to 9Sbx…ASmp, unlocks after the delay | [63fi…Hveu](https://explorer.solana.com/tx/63fiY47xngYko5b8cxZLbCqCES6wnyF7j4MsrvdzaVBSTfpU5RuGY2phh388TTSxTxUrV6EAdrqm5xnS93qZHveu?cluster=devnet) |
| 2026-09-30 07:31 | Withdrawal cancelled | by the guardian | [stPM…maTH](https://explorer.solana.com/tx/stPMNgJHG3v9CJbHYob5TGHXBzJJ8cqD5nd9CVGCo5itfYiaHJTbqrPgTNs6CPcNt5kTqNzaX9p1R35BeC8maTH?cluster=devnet) |
| 2026-09-30 07:34 | Deposit | 0.1 SOL | [5owe…nZGK](https://explorer.solana.com/tx/5owetQtmJzSGdXsALyemLGCQTwk5U97KtwcFqAevnvFYoEzbH6vdTwcEzJBg3WA4QyUUQWWu2zV9ezNCUvsqnZGK?cluster=devnet) |
| 2026-09-30 07:36 | Withdrawal requested | 0.05 SOL to HGqR…bHR3, unlocks after the delay | [3XiH…fRT4](https://explorer.solana.com/tx/3XiHmg6wpJkW9UAYe1cRBr1AWiSi2R7goPBabeTPq6j17JfGzciBfDvgdbdPL5Q2gss563XWZGTC4Hpc1E5JfRT4?cluster=devnet) |
| 2026-09-30 14:31 | Savings frozen | by the sentinel (backup PIN); pending withdrawals voided | [k7a2…QGhY](https://explorer.solana.com/tx/k7a2FgoKPUWD3hMPJBzKMh6Zsu9yvBib1zfwcphCJWRt47EhNgYyvMruYEjjxsQktgVqNcWLa9Ap8gBxEG1QGhY?cluster=devnet) |
| 2026-09-30 15:20 | Savings frozen | by the sentinel (backup PIN); pending withdrawals voided | [2QkX…QzD3](https://explorer.solana.com/tx/2QkXfaw2RybJtnu8DNLapFfwsYLhbr75hdMLyib7rHiZyKPxLXM2qfvTTvmeumTMjAujLjJ4gUfzKpNEfkCaQzD3?cluster=devnet) |
| 2026-09-30 15:27 | Savings frozen | by the sentinel (backup PIN); pending withdrawals voided | [5nox…uj8v](https://explorer.solana.com/tx/5noxRdVohYE3bCPSHgaFiwqg13kEsYU8uurt5gkqswUkMAN3PmTakegMCPaMTW98Kb9hLc2DZJ5jrEcezhzruj8v?cluster=devnet) |

## Judge-style test wallet (fresh wallet, faucet funded)

Vault [`BDH7qXJKCg9bfwkDPzNba6hcTbbxb74r5XZHyK7WFtvR`](https://explorer.solana.com/address/BDH7qXJKCg9bfwkDPzNba6hcTbbxb74r5XZHyK7WFtvR?cluster=devnet), owner `BmNSTgy4NkoMvt573tvEeRsecWbzUCMhU7WD8vFAwHmV`. 6 events.

| When (UTC) | Event | Detail | Transaction |
|---|---|---|---|
| 2026-09-30 05:08 | Vault created | withdrawal delay 120 s | [mrju…Mxff](https://explorer.solana.com/tx/mrjuVvAu2aeJmS7KcGgRMEpavpbnvjFkkPswpeg5aq1oR7cHzkHmJiYbx4PSbvd6PK3iJCFbXZWPFEiWNLEMxff?cluster=devnet) |
| 2026-09-30 06:37 | Settings change proposed | waits the delay | [2UVM…f4P6](https://explorer.solana.com/tx/2UVMYQNH1WXhcChhXp7EFF7YvXUA4ZcfZfbYh4vBs4CC69oqiuz1aSbsPY2TRL9MJKUKU4CkPBikwSNGCvkJf4P6?cluster=devnet) |
| 2026-09-30 06:39 | Settings change applied | after the delay | [4snW…VY7o](https://explorer.solana.com/tx/4snWc2ZVainM2hp5J2diyaygzSTq4FFyYpKk9LFPkCNRUDW4dGLQFuNafmnRDFgNnQEGE4L8G7YvGC9TVznPVY7o?cluster=devnet) |
| 2026-09-30 06:40 | Guardian rewards pool created | 1 tokens / week | [Gunj…cs3w](https://explorer.solana.com/tx/Gunjf6tEtyQ5QXh6yfvHpFgdLo1LtMsg1Qpog9KWX6SnjmiE6rHGfP4MRpJVb8RxugiW3oRQGLtpbQiVi69cs3w?cluster=devnet) |
| 2026-09-30 06:40 | Rewards pool funded | 5 tokens | [Gunj…cs3w](https://explorer.solana.com/tx/Gunjf6tEtyQ5QXh6yfvHpFgdLo1LtMsg1Qpog9KWX6SnjmiE6rHGfP4MRpJVb8RxugiW3oRQGLtpbQiVi69cs3w?cluster=devnet) |
| 2026-09-30 06:43 | Guardian collected rewards | 1 tokens | [2TCJ…6Xnx](https://explorer.solana.com/tx/2TCJeEAg3QMbz5EXeAAKsuzpSSsQ4zomMayUYPaX6BiFvLENEXwFhbvdoT9hQpFYhCRSNQ1BD4TLJdPhNEgh6Xnx?cluster=devnet) |
