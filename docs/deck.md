# Nest Finance: pitch deck (text version)

A plain-text version of the pitch deck ([PDF](https://github.com/JayCul/nest-finance/releases/latest/download/nest-finance-deck.pdf)): each slide's text, its speaker notes, and a description of each screenshot with its text read by OCR (machine-read, so it may contain small errors).

## 1. Nest Finance

Nest Finance  
Savings that can't be rushed.  
A time-locked savings vault with a backup PIN and guardians, built for Solana Seeker.  
Clock In · Solana Mobile Hackathon · github.com/JayCul/nest-finance

**Speaker notes:** Nest Finance is a savings app for the Solana Seeker. It looks like an ordinary personal finance app, but your savings sit in an on-chain vault that nobody can rush, not even someone holding your unlocked phone.

**Screenshot:** Nest Finance lock screen on a phone

```text
9:33
Nest Finance
Enter your PIN
Unlock to see your accounts
0000
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

## 5. Two PINs. One opens an ordinary wallet.

The backup PIN  
Two PINs. One opens an ordinary wallet.  
Both look and behave the same. The backup PIN shows only your spending wallet, real balance and real history, while in the background:  
- Savings freeze on-chain, signed by this phone's own key. No wallet prompt.  
- Your emergency contact gets a text with your location.  
- Any pending withdrawal is void for good.  
Your PIN  
Backup PIN  
Nest Finance · 5

**Speaker notes:** If you're forced to open the app, enter your backup PIN. It opens what looks like a normal wallet with only your spending money, all real data. Behind the scenes the phone's own key freezes your savings with no wallet prompt, and your emergency contact gets a text with your location.

**Screenshot:** Normal view with protected savings

```text
r. -10
Hi there
HGqR...bHR3
Protected Balance
$59.15
0.5 SOL Protected • 2m
+ Deposit
Accounts
6
Spending O
$57.64
0.487 SOL
Protection
Savings protection
Active
Withdrawal delay
Guardians
Safe addresses
Withdraw
2m protection
View All >
Protected Savings
$59.15
0.5 SOL
2 minutes
1 connected
oo
Home
Activity
Guardians
Settings
```

**Screenshot:** Backup PIN view showing only the spending wallet

```text
Hi there
HGqR...bHR3
Total Balance
$80.94
0.6859 SOL
'Tx Send
Accounts
6
Main Wallet
$80.94
0.686 SOL
Recent Transactions
Received
Today • 5:16 PM
Sent
Today • 5:13 PM
Sent
Today • 5:13 PM
Receive
View All >
USDC
$0.00
O.OOUSDC
View All >
+0.2SOL
Wallet
-0.001 SOL
Home
Activity
oo
People
Wallet
-O.5SOL
Wallet
Settings
```

## 6. Someone you trust can stop it in time.

Guardians  
Someone you trust can stop it in time.  
- Same app, their own wallet. Found automatically, no invite handshake.  
- Alerted when a withdrawal is requested, or the backup PIN is used.  
- Can cancel, freeze and check in. Can never take money out.  
In testing, the alert arrived about 5 seconds after an outside request.  
The alert  
One tap to cancel  
Nest Finance · 6

**Speaker notes:** A guardian opens the same app with their own wallet, and Nest finds every vault that lists them. When a withdrawal is requested, maybe by a drainer, maybe under pressure, the guardian gets an alert and can cancel it before the delay runs out.

**Screenshot:** Guardian alert: withdrawal requested

```text
7:10 Tue, sep 29
Internet
Flashlight
Bluetooth
Modes
Withdrawal requested • now n
0.05 SOL from savings you protect for HG...
Silent
Physical keyboards configured • 1m
Tap to view keyboards
Manage
Clear all
```

**Screenshot:** Guardian view with a cancel button

```text
04 •
Protected savings
HGqR25...jobHR3's savings
$35,63
0.3014 SOL • Protected
Withdrawal requests
0.05 SOL to 9Sbx...ASmp
O
Leaves in
@ Cancel this withdrawal
Protect
Withdrawal delay
Your last check-in
V/ Checkin
2 minutes
Today. 5:11 PM
* Freeze their savings
Name
Who is this? (only on your phone)
```

## 7. Why is this frozen? The phone explains.

On-device AI  
Why is this frozen? The phone explains.  
- A freeze report for the owner and each guardian: who froze it, when, what it cancelled, when it ends.  
- After a backup PIN: phone model, system, public IP and GPS at that moment.  
- Qwen3 0.6B runs on the phone through llama.cpp and explains it in plain words.  
No server, no API key, nothing leaves the phone. The next step is chosen in code; the model only words it.  
The report  
The AI explains  
Nest Finance · 7

**Speaker notes:** After a freeze, the owner and each guardian can open a freeze report: who froze the savings, when, what it cancelled and when it ends. If the backup PIN caused it, the report also shows the phone's state at that moment. Then a small AI model running on the phone explains it in plain words. There is no server and no API key, so nothing sensitive, like the location from the moment someone was coerced, ever leaves the device. The suggested next step is chosen in code; the model only puts it into words.

**Screenshot:** Freeze report: frozen by the backup PIN, with phone model, Android version, public IP and GPS location recorded at that moment

```text
3:49
Why is this frozen?
The freeze has ended
6
Withdrawals work normally again.
Frozen by
When
A freeze lasts
Withdrawals it cancelled
Backup PIN
Today. 3:31 PM
10 minutes
This phone, because the backup PIN was entered.
While frozen, nothing can leave these savings unless the owner
and a guardian lift the freeze together.
When the backup PIN was used
Recorded on this phone at that moment. It stays on this
phone.
Time
Phone
System
App version
Public IP
Location
Contacts texted
Freeze
Today. 3:31 PM
Google sdk_gphone64_x86_64
Android 16
I.O.O
154.113.81.131
6.5244, 3.3792 m)
Signed by this phone
```

**Screenshot:** The on-device AI's explanation of the freeze and what to do next

```text
Time
Phone
System
App version
Why is this frozen?
Today. 3:31 PM
Google sdk_gphone64_x86_64
Public IP
Location
Contacts texted
Freeze
Open map
Android 16
I.O.O
154.113.81.131
6.5244, 3.3792 m)
Signed by this phone
View transaction
Explain it in plain words
On-device Al. Runs on this phone; nothing is
sent anywhere.
The savings were frozen by this phone, because
the backup PIN was entered at 3:31 PM. The freeze
cancelled 1 pending withdrawal (0.05 SOL). No
money left the savings. Current status: the freeze
ended at 3:41 PM. The savings work normally again.
What to do: let your emergency contact know you
are okay; your savings are unchanged and work
normally again.
Written by Qwen3 0.6B on this phone from the facts above.
It can make mistakes; the facts above are what the program
recorded.
```

## 8. Guardians earn SKR for staying reachable.

SKR  
Guardians earn SKR for staying reachable.  
- The owner funds a rewards pool in SKR.  
- Guardians collect when they check in each week.  
- Each claim covers at most 8 days, so a missed week is forfeited.  
- The safety score shows gaps, from delay length to funded rewards.  
Tested against SKR's real mainnet mint account. Mainnet is a config change, not a code change.  
Rewards pool  
Safety score  
Nest Finance · 8

**Speaker notes:** A guardian is only useful if they're reachable. Owners fund a pool in SKR, and guardians collect it when they check in each week. The program caps every claim at 8 days, so skipping a week forfeits that week. The safety score keeps owners honest about gaps. A program test loads SKR's actual mainnet mint account and runs the whole cycle, so moving to mainnet is a configuration change.

**Screenshot:** Guardian rewards card: 10 SKR per week

```text
9:36
Your guardians
o
27WB8w...wAoKn7
Last check-in Today 7:13 PM
+0 Add or change guardians
Active
Guardian changes take effect after your withdrawal delay.
Guardian rewards
Pay guardians in SKR for staying reachable. They
collect when they check in each week. Miss a
week and that week is forfeited.
Each guardian earns
Rewards pool
Covers
+ Topup50SKR
People you protect
10 SKR/week
100 SKR
IO weeks
Nobody has added you as a guardian yet.
My guardian code
Home
Activity
People
Settings
```

**Screenshot:** Safety score of 80

```text
9:36
Safety score
80
Good, with gaps
1 thing left to set up.
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
A guardian who has gone quiet may not see an
alert in time.
+20
+15
+10
+15
```

## 9. Built for the phone, not ported to it.

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
Nest Finance · 9

**Speaker notes:** This only works on a phone. The owner key stays in Seed Vault, a tighten-only sentinel key lives in the Android keystore, and a small native module sends the alert text silently, something iOS apps can't do.

## 10. Working on devnet today.

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
Program EGe3adgVvYu3He7jgbi3sKQTWrV1v9JBNxT7nGQjA4AZ (devnet), byte-identical to the repo · Nest Finance · 10

**Speaker notes:** Everything you've seen runs on devnet today. The program has 22 tests, run against the exact binary deployed on devnet: one has an attacker holding the owner's real key try every route to the money, and one runs guardian rewards on SKR's real mainnet mint account. On devnet there are 65 decoded transactions on the demo vaults, each linked in the repository's evidence page.

## 11. From devnet to the dApp Store.

Next  
From devnet to the dApp Store.  
- Audit, locked upgrade authority, mainnet with real SKR  
- Guardian alerts delivered in the background  
- Two-phone co-signing for early release  
- Listing on the Solana dApp Store  
Savings that can't be rushed.  
github.com/JayCul/nest-finance  
Nest Finance · 11

**Speaker notes:** Next is an audit, a locked upgrade authority and mainnet with real SKR, then background guardian alerts, two-phone co-signing and a dApp Store listing. Nest Finance: savings that can't be rushed.

