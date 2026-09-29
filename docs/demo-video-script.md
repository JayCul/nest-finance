# Demo video script (2:33)

Voiceover for `demo-recordings/nest-finance-demo.mp4`, built by `scripts/demo/assemble.sh` from segments recorded on an Android emulator with taps shown. Timecodes match that cut. About 360 words, a comfortable pace for 2.5 minutes.

## 0:00 to 0:38 · Owner tour (segment 2)

Owning a Seeker tells people you hold crypto. If someone forces you to unlock it, everything in a normal wallet can leave in seconds. Nest Finance makes that pointless.

It opens with a PIN, like any finance app. Savings sit in an on-chain vault on Solana, and every withdrawal waits a delay you choose, normally 24 hours to 7 days. This demo vault uses 2 minutes so you can watch it work. The safety score shows what's protected and what's missing. Moving money into savings is one approval in the wallet.

## 0:38 to 1:10 · Protected withdrawal (segment 3)

Taking money out never happens instantly. The request starts a countdown, and until it ends, you, a guardian or the app itself can cancel it. The same rule stops a drainer: one bad signature only queues a withdrawal that someone can cancel. Every step is recorded on-chain in Activity, and guardians and their SKR rewards live under People.

## 1:10 to 2:03 · The backup PIN (segment 4)

Now say someone makes you open the app. You enter your backup PIN instead. It opens what looks like an ordinary wallet: your spending money, real balance, real history, and no savings anywhere.

In the background, the phone's own key has already frozen your savings on-chain, with no wallet prompt. And your emergency contact gets a text saying the backup PIN was used, with your location.

Later, your real PIN shows the savings frozen and a record of exactly what happened.

## 2:03 to 2:33 · Guardian (segment 1)

Guardians use the same app with their own wallet. When a withdrawal is requested from anywhere, whether a drainer, a stolen key or pressure somewhere else, the guardian gets an alert within seconds and cancels it with one tap. Guardians earn SKR for checking in each week, so they stay reachable.

Nest Finance. Savings that can't be rushed.

## Notes

- The deck's cover slide works as an opening or closing card if you want one.
- Program tests (21, including an attacker holding the owner's real key) are covered in the deck, not the video.
