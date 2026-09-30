# Demo video voiceover (2:46)

Voiceover for `demo-recordings/nest-finance-demo.mp4`, built by `scripts/demo/assemble.sh` from segments recorded on an Android emulator on Solana devnet. White dots show each tap. Each cue gives the timecode, what's on screen, and the line to read. About 380 words, an easy pace of roughly 140 words a minute. If a line runs long, let the picture lead and finish it over the next shot.

## Part 1 · Your savings, protected (0:00 to 0:47)

**0:00 to 0:08** · *Home screen, tap the Nest icon, splash, PIN pad.*
> Owning a Seeker tells people you hold crypto. Nest Finance keeps your savings safe even if someone forces you to unlock your phone.

**0:08 to 0:20** · *Home: protected balance, Spending and Protected Savings accounts, then the Protection card.*
> It opens with a PIN, like any banking app. Your everyday spending wallet and your protected savings sit side by side. The protection card shows the rules: withdrawals wait, one guardian, one safe address, backup PIN on.

**0:20 to 0:28** · *Safety score: 80, "Good, with gaps", with a checklist.*
> The safety score checks your setup and points out what's missing. Here, the delay is short because this is a demo vault.

**0:28 to 0:47** · *Deposit 0.1 SOL, wallet approval with the Nest icon, balance rises to $77.61.*
> Moving money into savings is one tap and one approval in your wallet. On-chain, it now sits in a vault that only releases money slowly.

## Part 2 · Nothing leaves instantly (0:47 to 1:17)

**0:47 to 0:56** · *Withdraw 0.05 SOL. The blue card says funds stay in the vault until a set time. Wallet approval.*
> Taking money out is different. Every withdrawal waits a delay you choose, normally 24 hours to 7 days. This demo uses 2 minutes.

**0:56 to 1:06** · *Withdrawal Pending: a countdown, "Can be cancelled by you or your guardian".*
> Until the countdown ends, you or your guardian can cancel it. So a drainer, or someone standing over you, gets a queued request, not your money.

**1:06 to 1:17** · *Activity: open requests and on-chain history. People: your guardian, when they last checked in, and SKR rewards.*
> Everything is recorded on-chain. Your guardian earns SKR each week they check in, so they stay reachable.

## Part 3 · The backup PIN (1:17 to 2:09)

**1:17 to 1:23** · *App reopens, a PIN is entered.*
> Now the scenario Nest was built for. Someone makes you open the app. You don't refuse. You enter your backup PIN.

**1:23 to 1:42** · *A plain wallet: "Total Balance $16.09", recent transactions, then Activity, People and Settings. No savings anywhere.*
> It opens what looks like an ordinary wallet: your spending money, real balance, real history. No savings, no guardians, nothing to find. Every screen behaves normally.

**1:42 to 1:50** · *The emergency contact's messages: "NEST FINANCE ALERT … Their savings are frozen", with a Google Maps link.*
> Meanwhile, the phone's own key has already frozen your savings on-chain, with no wallet prompt on screen. Your emergency contact gets a text with your location.

**1:50 to 2:09** · *Real PIN. Home shows "Savings are frozen", then Settings shows "Backup PIN was used": frozen by this phone, 1 contact alerted, location shared.*
> Later, your real PIN shows what happened: savings frozen, and a record of exactly when and who was told. Nothing can leave until the freeze ends, unless you and a guardian lift it together.

## Part 4 · Guardians (2:09 to 2:46)

**2:09 to 2:17** · *A different wallet: the guardian's app, listing "People you protect".*
> This is the guardian's phone. Same app, their own wallet. Nest finds every savings vault they protect automatically.

**2:17 to 2:34** · *An alert arrives: "Withdrawal requested". The notification opens the vault with a live countdown and a Cancel button.*
> Here, a withdrawal is requested from somewhere else, the way a drainer or a coerced signature would. Within seconds the guardian is alerted and can see exactly what's leaving.

**2:34 to 2:46** · *Cancel, wallet approval, "No open requests".*
> One tap, one approval, and it's cancelled. The money never moved.
>
> Nest Finance. Savings that can't be rushed.

## Notes

- Timecodes come from `scripts/demo/assemble.sh`, which prints where each clip starts in the final video. Re-check them if you change the cuts.
- The deck's cover slide works as an opening or closing card.
- The program's 21 tests, including an attacker holding the owner's real key, are covered in the deck rather than the video.
