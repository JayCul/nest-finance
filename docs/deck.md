# Nest Finance: pitch deck (text version)

A plain-text version of the pitch deck ([PDF](https://cdn.jsdelivr.net/gh/JayCul/nest-finance@v0.3.1-devnet/docs/nest-finance-deck.pdf)): each slide's text, its speaker notes, and a description of each screenshot with its text read by OCR (machine-read, so it may contain small errors).

## 1. Nest Finance

Nest Finance  
Savings that can't be rushed.  
A time-locked savings vault with a backup PIN and guardians, built for Solana Seeker.  
Clock In · Solana Mobile Hackathon · github.com/JayCul/nest-finance

**Speaker notes:** Nest Finance is a savings app for the Solana Seeker. It looks like an ordinary personal finance app, but your savings sit in an on-chain vault that nobody can rush, not even someone holding your unlocked phone.

**Screenshot:** Nest Finance lock screen on a phone

```text
8:02
Nest Finance
Enter your PIN
Unlock to see your accounts
1
4
7
0000
2
5
8
O
3
6
9
```

## 2. A Seeker in your hand says you hold crypto.

The problem  
A Seeker in your hand says you hold crypto.  
Forced to unlock  
Someone next to you makes you open your wallet. Seed phrases and hardware keys don't help when they have you and your phone.  
One bad signature  
A drainer needs a single approval to empty a wallet.  
No time to react  
Crypto moves instantly. By the time anyone knows, the money is gone.  
Nest Finance · 2

**Speaker notes:** Owning a Seeker tells people you hold crypto. If someone forces you to unlock it, or you sign one bad transaction, everything can leave in seconds, and nothing in a normal wallet slows that down.

## 3. Even with your real key, nobody can rush your savings.

The idea  
Even with your real key, nobody can rush your savings.  
Time-locked vault  
Every withdrawal waits a delay you choose, enforced on-chain.  
Backup PIN  
Opens an ordinary wallet while your savings freeze in the background.  
Guardians  
People you trust can stop a withdrawal inside the window.  
Nest Finance · 3

**Speaker notes:** Nest Finance makes that encounter pointless. Savings sit in a vault where every withdrawal waits. A second PIN opens an ordinary-looking wallet and quietly freezes the savings. And guardians, people you trust, can cancel a withdrawal before it lands.

## 4. The program enforces the rules, not the app.

How it works  
The program enforces the rules, not the app.  
- Every withdrawal waits your delay, 24 hours to 7 days.  
- Instant moves go only to your own safe addresses.  
- Settings changes wait the same delay.  
- A freeze voids every pending request at once.  
- Early release needs you and a guardian together.  
Key | Lives in | Can |  
Owner | Seed Vault | Deposit, request, cancel |  
Guardian | Their phone | Cancel, freeze, check in |  
Sentinel | This phone's keystore | Only freeze and cancel |  
Nest Finance · 4

**Speaker notes:** An Anchor program on Solana holds the savings. Withdrawals wait a delay; the only instant path is to your own safe addresses; even settings changes wait. There are three keys: the owner in Seed Vault, guardians on their own phones, and a sentinel key in this phone's keystore that can only tighten, never move funds.

## 5. Two phones, one program. The chain holds the money and the rules.

Architecture  
Two phones, one program. The chain holds the money and the rules.  
Owner's phone  
Seeker or any Android · Nest Finance app  
PIN lock; backup PIN opens a decoy  
Sentinel key in Android Keystore  
Risk engine + What-if simulator  
Emergency SMS (Kotlin module)  
Seed Vault / wallet via MWA  
Solana devnet  
nest_vault program (Anchor)  
Vault PDA: SOL + the rules  
Vault token account: SKR  
PendingWithdrawal: delay, fixed to  
PendingConfig: delayed settings  
StipendPool + its SKR account  
Guardian's phone  
Nest Finance, guardian mode · own wallet  
Watches the vault's requests  
Risk-scored alert + AI briefing  
One-tap cancel or freeze  
Weekly check-in, SKR reward  
- Owner txssigned via MWA  
- Freeze, cancelsentinel, no prompt  
- Requests,events, state  
- Cancel, freeze,claim (MWA)  
-  
Emergency contact  
SMS with a map link, from the backup PIN  
-  
-  
Groq (gpt-oss-120b), off-chain  
Gets facts text only; returns wording  
Solid: signed transactions or reads  
Dashed: text only, never keys or funds  
Nest Finance · 5

**Speaker notes:** The owner's phone runs the Nest Finance app. The owner's key stays in Seed Vault or their wallet and signs through Mobile Wallet Adapter. The app also holds a sentinel key in Android Keystore that can only freeze and cancel, so the backup PIN can freeze the vault with no wallet prompt and text an emergency contact. The savings and every rule live in the nest_vault program on Solana. Guardians run the same app on their own phones: it watches the vault, raises a risk-scored alert, lets them cancel or freeze with one tap, and pays a weekly SKR check-in. Groq sits off to the side: it receives facts text and returns wording, nothing else.

## 6. 5 account types, 17 instructions, each with fixed signers.

On-chain program  
5 account types, 17 instructions, each with fixed signers.  
Accounts (program-derived)  
Vault | ["vault", owner]: SOL savings, roles, delay, freeze, epoch |  
Vault token account | Savings in SKR or another SPL token; only the vault PDA signs |  
PendingWithdrawal | ["withdrawal", vault, id]: amount, fixed destination, unlock time, epoch |  
PendingConfig | ["config", vault]: proposed settings, apply time, epoch |  
StipendPool | ["stipend", vault]: SKR mint, weekly rate, last claim per guardian |  
Instructions, by who must sign  
Owner | init_vault, request_withdrawal, instant_withdraw (safe list only), propose_config, setup_stipend |  
Owner + guardian | expedite_withdrawal, lift_lockdown |  
Owner, guardian or sentinel | cancel_withdrawal, cancel_config, lockdown |  
Guardian | claim_stipend, guardian_heartbeat |  
Anyone | deposit_sol, deposit_token, fund_stipend; execute_withdrawal and apply_config only after the delay |  
Only three instructions move savings out: execute (after the delay, to the stored destination), expedite (owner and guardian together) and instant (safe list only). A freeze bumps the epoch, voiding every pending request.  
Each instruction's checks and tests: docs/security-model.md · Nest Finance · 6

**Speaker notes:** The program has five account types, all derived from the owner's address, and seventeen instructions, each with a fixed set of signers. The owner alone can request and propose; the owner and a guardian together can release early or lift a freeze; any role can cancel or freeze; guardians check in and claim; anyone can deposit, or run a withdrawal whose delay has passed. Only three instructions can move savings out, and a guardian or the sentinel cannot use any of them alone.

## 7. The delay cannot be skipped, even with the owner's real key.

Security model  
The delay cannot be skipped, even with the owner's real key.  
- The program sets the unlock time, not the caller.  
- Payout goes only to the destination stored at request time.  
- Instant payouts only reach safe addresses already on the list.  
- Adding a safe address, shortening the delay or swapping a guardian waits the current delay, and any role can cancel it.  
- A freeze voids every pending request; lifting it early needs owner and guardian together.  
If this is compromised | They can | They cannot |  
The unlocked phone | Ask the wallet to sign a request; freeze | Skip the delay, or reach the owner key |  
The owner's key | Request, propose, pay out to existing safe addresses | Pay a new address before the delay; change settings faster |  
One guardian | Cancel and freeze | Move, redirect or release any savings |  
The sentinel key | Freeze and cancel | Move funds or change settings |  
Upgrade authority | Deploy new rules | Nothing, once made immutable (before mainnet) |  
Known gap: a hostile guardian can keep re-freezing. Savings are held up, never taken; a per-role freeze cooldown is planned. Each rule has a test, and 22 of 22 pass on the deployed binary.  
docs/security-model.md, docs/threat-model.md · Nest Finance · 7

**Speaker notes:** This is why the delay holds even against someone with the owner's real key. The program sets the unlock time, the payout is pinned to the stored destination, instant payouts only reach addresses already on the safe list, and any change to the safe list, the delay or the guardians waits the current delay in plain view of the guardians. The table shows what each compromised key can and cannot do. One honest gap: a hostile guardian can keep re-freezing the vault. That holds savings up but never takes them, and a freeze cooldown is planned.

## 8. Two PINs. One opens an ordinary wallet.

The backup PIN  
Two PINs. One opens an ordinary wallet.  
Both look and behave the same. The backup PIN shows only your spending wallet, real balance and real history, while in the background:  
- Savings freeze on-chain, signed by this phone's own key. No wallet prompt.  
- Your emergency contact gets a text with your location.  
- Any pending withdrawal is void for good.  
Your PIN  
Backup PIN  
Nest Finance · 8

**Speaker notes:** If you're forced to open the app, enter your backup PIN. It opens what looks like a normal wallet with only your spending money, all real data. Behind the scenes the phone's own key freezes your savings with no wallet prompt, and your emergency contact gets a text with your location.

**Screenshot:** Normal view: protected balance of 0.66 SOL with the withdrawal delay, spending and protected savings accounts

```text
8:00
Hi there
HGqR...bHR3
Protected Balance
$80.38
0.6605 SOL Protected • 2m
+ Deposit
Accounts
6
Spending O
$610.84
5.019 SOL
Protection
Withdraw
2m protection
View All >
Protected Savings
$80.38
0.661 SOL
80
Savings protection
Active
Withdrawal delay
Guardians
Safe addresses
Safety score
2 minutes
1 connected
Home
Activity
oo
People
Settings
```

**Screenshot:** Backup PIN view: an ordinary wallet showing only the 5.02 SOL spending wallet and its real transactions

```text
8:16
Hi there
HGqR...bHR3
Total Balance
$608.49
5.0179 SOL
'Tx Send
Accounts
6
Main Wallet
$608.49
5.018 SOL
Recent Transactions
Sent
Today • 8:09 AM
Sent
Today • 7:30 AM
Sent
Yesterday 8:27
Receive
View All >
USDC
$0.00
O.OOUSDC
View All >
-0.001 SOL
Wallet
-0.001 SOL
Wallet
-0.001 SOL
Home
Activity
oo
People
Wallet
Settings
```

## 9. Someone you trust can stop it in time.

Guardians  
Someone you trust can stop it in time.  
- Same app, their own wallet. Found automatically, no invite handshake.  
- Alerted when a withdrawal is requested, or the backup PIN is used.  
- Can cancel, freeze and check in. Can never take money out.  
In testing, the alert arrived about 5 seconds after an outside request.  
The alert  
One tap to cancel  
Nest Finance · 9

**Speaker notes:** A guardian opens the same app with their own wallet, and Nest finds every vault that lists them. When a withdrawal is requested, maybe by a drainer, maybe under pressure, the guardian gets an alert and can cancel it before the delay runs out.

**Screenshot:** Guardian alert: Withdrawal requested, High risk, 0.6 SOL from savings you protect

```text
8:09 Fri, Oct 2
Internet
Flashlight
* Bluetooth
e Modes
Withdrawal requested • High risk • now n
0.6 SOL from savings you protect for HGq...
Manage
Clear all
```

**Screenshot:** Guardian view: 0.6 SOL leaving in 1:35 with a Cancel button, High risk 60 and the AI briefing

```text
8:09
Protected savings
HGqR25...jobHR3's savings
$80,26
0.6605 SOL • Protected
Withdrawal requests
O
0.6 SOL to 2By2...vylc
Leaves in
@ Cancel this withdrawal
A High risk 60
Nest Intelligence
New destination. 2By2...vy1c has not been used by
these savings before today.
Most of the savings. 91% of what is in the vault.
A withdrawal of 0.6 SOL is scheduled to unlock
in less than an hour, and you can cancel it any
time before it unlocks, though cancellation does
not move any money. The app gave it a high risk
score of 60/100 because the destination address
is new and the amount represents 91 % of the
vault's balance. Confirm with the owner through
a trusted channel before it unlocks; if you cannot,
cancel it.
Score, signals and advice computed by the app; worded by
Al. The program decides what is allowed.
Protect
```

## 10. AI explains, scores and simulates. The program decides.

Nest Intelligence  
AI explains, scores and simulates. The program decides.  
- Risk scoring: every withdrawal scored from on-chain signals; guardians get a briefing, and the alert says "High risk".  
- Transaction explainer: what you are about to sign, in plain words, before the wallet opens.  
- What-if simulator: seven attacks played against your real setup, with fixes and free-form questions.  
Scores and outcomes are computed in code; Groq only words them. No keys, addresses or location are sent.  
Guardian briefing  
What-if simulator  
Nest Finance · 10

**Speaker notes:** Nest Intelligence makes the security understandable. Every withdrawal is scored for risk from on-chain signals, like a destination never used before or most of the savings leaving at once, and guardians get a plain-language briefing, with the risk level right in the alert. Before signing, the owner sees what the transaction does. And the What-if simulator plays seven attacks against the owner's real setup and says what to fix. The principle: the app computes the scores and outcomes, AI only words them, and the Solana program decides what is allowed.

**Screenshot:** Guardian briefing: High risk 60, signals New destination and Most of the savings (91%), and an AI briefing advising to confirm with the owner or cancel

```text
8:10
Protected savings
A High risk • 60
Nest Intelligence
New destination. 2By2...vy1c has not been used by
these savings before today.
Most of the savings. 91% of what is in the vault.
A withdrawal of 0.6 SOL is scheduled to unlock
in less than an hour, and you can cancel it any
time before it unlocks, though cancellation does
not move any money. The app gave it a high risk
score of 60/100 because the destination address
is new and the amount represents 91 % of the
vault's balance. Confirm with the owner through
a trusted channel before it unlocks; if you cannot,
cancel it.
Score, signals and advice computed by the app; worded by
Al. The program decides what is allowed.
Protect
Withdrawal delay
Your last check-in
Rewards
2 minutes
Sep 30 • 7:44 AM
10 SKR/week
V/ Checkin & collect 2.88 SKR
* Freeze their savings
Name
Who is this? (only on your phone)
```

**Screenshot:** What-if simulator: someone steals my wallet key, needs attention, with each step, the fix to lengthen the delay, and an AI walkthrough

```text
8:04
What if... ?
What if someone steals my wallet key or
seed phrase?
O
Needs attention • Savings (0.6605 SOL) if
nobody cancels within about 2 minutes
An attacker gets your wallet key
They request a withdrawal: it must wait about 2
minutes
They cannot skip the wait: instant withdrawals only
go to your own safe addresses, not theirs
Your guardian is alerted and can cancel it
Adding their address to the safe list also waits the
delay, and can be cancelled
The delay is only about 2 minutes. Real savings
should wait 24 hours or more, so there is time to
notice.
Nest Intelligence
Someone steals your wallet key and immediately
asks for a withdrawal. The request is held for about
two minutes, during which your guardian receives an
alert and can cancel it, and any new safe address they
add also faces the same short delay. Because the
waiting period is only two minutes, there is little time
to notice and stop the theft. The app should increase
the withdrawal delay to 24 hours or more to give you
enough time to react.
What if I sign a malicious transaction?
Needs attention • Savings could leave after
about 2 minutes if nobody notices
What if I lose my phone?
Protected Nothing from savings
```

## 11. The app decides. Groq only words what it decided.

AI data flow  
The app decides. Groq only words what it decided.  
On-chain  
Vault, pending requests, program events  
→  
On the phone, in code  
assessWithdrawal(), runScenarios(): score, signals, outcome, action  
→  
Facts text  
Amounts, durations, score, signals, short addresses  
→  
Groq  
gpt-oss-120b writes 2 to 3 sentences  
Real request, devnet, 2 Oct 2026  
Computed by the app: 0.6 SOL pending · High risk 60/100 · New destination +30 · 91% of the savings +30 · Action: confirm with the owner, else cancel.  
Groq wrote: "The app gave it a high risk score of 60/100 because the destination address (BDH7…FtvR) is new… Confirm with the owner through a trusted channel before it unlocks; if you cannot, cancel it."  
Never sent  
Keys, seed phrases, PINs, full addresses, location, IP, device details, phone numbers.  
Cannot act  
Its output is display text. Without a connection, every score and outcome still shows.  
Full request body and reply: docs/ai.md · Nest Finance · 11

**Speaker notes:** This is exactly what goes where. The app reads the vault and its pending requests from the chain, and plain code computes the risk score, the signals and the recommended action. Only a short facts text goes to Groq, which writes two or three sentences. Here is a real request from devnet: the app scored a 0.6 SOL withdrawal High, 60, because the destination was new and it was 91 percent of the savings; Groq only put that into words. Keys, PINs, full addresses and location are never sent, and the model can do nothing but show text.

## 12. Guardians earn SKR for staying reachable.

SKR  
Guardians earn SKR for staying reachable.  
- The owner funds a rewards pool in SKR.  
- Guardians collect when they check in each week.  
- Each claim covers at most 8 days, so a missed week is forfeited.  
- The safety score shows gaps, from delay length to funded rewards.  
Tested against SKR's real mainnet mint account. Mainnet is a config change, not a code change.  
Rewards pool  
Safety score  
Nest Finance · 12

**Speaker notes:** A guardian is only useful if they're reachable. Owners fund a pool in SKR, and guardians collect it when they check in each week. The program caps every claim at 8 days, so skipping a week forfeits that week. The safety score keeps owners honest about gaps. A program test loads SKR's actual mainnet mint account and runs the whole cycle, so moving to mainnet is a configuration change.

**Screenshot:** Guardian rewards card: 10 SKR per week

```text
8:04
Guardians
People who protect your savings
A guardian can stop a withdrawal or freeze your
savings. They can never take money out.
Your guardians
o
27WB8w...wAoKn7
Active
Last check-in Sep 30 7:44 AM
+0 Add or change guardians
Guardian changes take effect after your withdrawal delay.
Guardian rewards
Pay guardians in SKR for staying reachable. They
collect when they check in each week. Miss a
week and that week is forfeited.
Each guardian earns
Rewards pool
Covers
+ Topup5SKR
People you protect
10 SKR/week
89.4 SKR
8 weeks
Nobody has add
s a guardian yet.
Home
Activity
People
Settings
```

**Screenshot:** Safety score of 80

```text
8:05
Safety score
80
Good, with gaps
1 thing left to set up.
What if... ? Play attacks against your setup
Withdrawals wait at least 24 hours
Long enough for you or a guardian to
notice and cancel.
At least one guardian
+20
Someone who can cancel a withdrawal if you
cannot.
Backup PIN set up
Opens a simple wallet view and freezes savings
silently.
Emergency contact for alerts
Gets a text with your location if the backup PIN
is used.
Guardians checked in this week
A •nrAinn hoe
+20
+15
+10
```

## 13. A full reward cycle, traced on devnet.

SKR rewards, on-chain  
A full reward cycle, traced on devnet.  
1  
Pool funded  
setup_stipend + fund_stipend: 5 tokens into the pool's own account, at 1 token a week.  
tx 5ZVcKv…BgHz1L  
2  
First check-in  
claim_stipend pays 1 token (a first claim counts as one week) and records the heartbeat.  
tx q2cKdV…WX4xoa  
3  
152 s later  
Pays 251 base units: 1,000,000 × 152 ÷ 604,800 = 251, exactly the formula.  
tx 4q8Bf2…qWP5TJ  
4  
Heartbeat  
guardian_last_seen 1790922408 → 1790922560, read back from the vault.  
same transaction  
Rules the program enforces  
paid = rate × min(time since last claim, 8 days) ÷ 1 week, never more than the pool holds. Only current guardians can claim. The pool is separate from the savings.  
Mainnet switch  
Devnet uses Circle's devnet USDC as the stand-in (same Token program, 6 decimals). Mainnet sets the mint to SKR (SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3): a config value, tested against SKR's real mint account.  
Explorer links and balances after each step: docs/skr-trace.md · Nest Finance · 13

**Speaker notes:** Here is one complete rewards cycle on devnet, read back from the chain after each step. The owner funds a pool. The guardian's first check-in pays one week. A second check-in 152 seconds later pays 251 base units, exactly what the formula gives, and both update the guardian's heartbeat on the vault. The 8-day cap is checked by a program test that skips ahead 30 days. On mainnet the same program runs with the SKR mint.

## 14. Built for the phone, not ported to it.

Built for Seeker  
Built for the phone, not ported to it.  
Seed Vault + MWA  
The owner key never leaves Seed Vault. Every action is approved in the wallet sheet.  
Sentinel key  
A tighten-only key in Android Keystore signs the silent freeze.  
Silent SMS  
A small Kotlin module sends the alert with nothing on screen. Android only.  
Real data only  
The backup-PIN view shows the real wallet, so an explorer check matches.  
Was this you?  
An alert for any withdrawal this phone didn't request.  
Native app  
Expo and React Native with @solana/kit and a typed client generated from the IDL.  
Nest Finance · 14

**Speaker notes:** This only works on a phone. The owner key stays in Seed Vault, a tighten-only sentinel key lives in the Android keystore, and a small native module sends the alert text silently, something iOS apps can't do.

## 15. Working on devnet today.

Proof  
Working on devnet today.  
22 / 22  
program tests pass on the deployed binary, including an attacker holding the owner's real key, and guardian rewards on SKR's real mainnet mint.  
65 devnet transactions, decoded and linked in docs/devnet-evidence.md:  
- Vaults created, deposits, withdrawals after the delay  
- Withdrawals cancelled by owner and guardian  
- Backup-PIN freezes signed by the phone's own key  
- Settings change waited out, then applied  
- Rewards pool funded and collected on check-in  
Program EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ (devnet), byte-identical to the repo · Nest Finance · 15

**Speaker notes:** Everything you've seen runs on devnet today. The program has 22 tests, run against the exact binary deployed on devnet: one has an attacker holding the owner's real key try every route to the money, and one runs guardian rewards on SKR's real mainnet mint account. On devnet there are 65 decoded transactions on the demo vaults, each linked in the repository's evidence page.

## 16. Where to find each thing.

Judging checklist  
Where to find each thing.  
Criterion | Evidence | Where |  
Runs on Android, with MWA | APK on GitHub; every signature through Mobile Wallet Adapter; sentinel key in Android Keystore | GitHub release; use-vault.ts; sentinel.ts |  
Stickiness | Weekly guardian check-ins paid in SKR; risk alerts; safety score and What-if simulator | skr.md; simulator.ts |  
User experience | Backup PIN decoy, one-tap cancel, plain-language AI, faucet buttons and demo timers for judges | README: For judges |  
Innovation | Duress PIN + on-chain time lock + a key that can only tighten, so a coerced unlock gives nothing | threat-model.md |  
Demo | 3:00 video: emulator flows with the AI, then a real phone with Phantom | youtube.com/shorts/OfqEbHQXAuE |  
SKR integration | Rewards pool enforced on-chain; full cycle traced; tested on SKR's mainnet mint | skr-trace.md |  
Technical evidence | 22 of 22 tests; deployed binary matches the repo; IDL on-chain; 65 decoded transactions | EVIDENCE.md |  
AI, honestly scoped | Scores computed in code; Groq words them; exact payload published | ai.md |  
github.com/JayCul/nest-finance · Nest Finance · 16

**Speaker notes:** For judges, this maps each criterion to its evidence: the APK and the Mobile Wallet Adapter code, the weekly SKR check-ins that bring guardians back, the backup-PIN experience, the on-chain design behind it, the demo video, the SKR trace, the tests and deployment proof, and the AI payload. Everything is in the repository, starting from EVIDENCE.md.

## 17. What works today, and what comes next.

Built vs. next  
What works today, and what comes next.  
Implemented, on devnet  
- Anchor vault: delays, safe list, freezes, delayed settings  
- Android app with Mobile Wallet Adapter  
- Backup PIN: silent freeze by the Keystore key, SMS, freeze report  
- Guardians: discovery, risk-scored alerts, one-tap cancel  
- SKR rewards, tested on SKR's real mainnet mint  
- Nest Intelligence: risk scoring, briefings, What-if simulator  
- 22 tests on the deployed binary, 65 devnet transactions  
Planned  
- Professional audit, then mainnet with real SKR  
- Upgrade authority made immutable or a multisig  
- Guardian alerts delivered in the background (push)  
- AI through a server-side proxy, so no key ships in the app  
- Owner can close a rewards pool and reclaim unspent SKR  
- A freeze cooldown per role, so a hostile guardian cannot keep re-freezing  
- Listing on the Solana dApp Store  
Nest Finance · Savings that can't be rushed · github.com/JayCul/nest-finance · 17

**Speaker notes:** Here is exactly what is built and what is not. Built and running on devnet today: the vault with all its rules, the Android app, the backup PIN with its silent freeze and alert, guardians with risk-scored alerts, SKR rewards tested against the real SKR mint, and Nest Intelligence. Next: an audit, mainnet with real SKR, a locked upgrade authority, background push alerts for guardians, moving the AI key behind a server, and a dApp Store listing. Nest Finance: savings that can't be rushed.

