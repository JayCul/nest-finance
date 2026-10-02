# Demo video voiceover (2:45)

Voiceover for `demo-recordings/nest-finance-demo-captioned.mp4` (2:45), recorded on an Android emulator on Solana devnet with each tap shown as a white dot, framed at 1080x1920 for YouTube Shorts with captions under the phone. The same lines are in [voiceover-elevenlabs.txt](voiceover-elevenlabs.txt), ready to paste into ElevenLabs, and as subtitles in [demo-captions.srt](demo-captions.srt).

The video shows Nest Intelligence in three places: the transaction explainer before signing, the guardian's risk-scored alert and briefing, and the What-if simulator with a free-form question.

| # | Starts | On screen | Line |
|---|---|---|---|
| 1 | 0:00 | App icon, PIN pad | A Seeker tells people you hold crypto. Nest Finance keeps your savings safe, even if you're forced to unlock your phone. |
| 2 | 0:08.5 | Home: protected balance, then the safety score (80, "Good, with gaps") | Your protected savings sit in a vault on Solana, and the safety score flags what's missing. |
| 3 | 0:15.5 | Deposit 0.1 SOL, wallet approval, balance rises | Moving money in takes one tap, and one approval in your wallet. |
| 4 | 0:27 | Withdraw 0.05 SOL, "Low risk · 0", Explain this transaction | Taking it out is different. Before you sign, Nest Intelligence scores the withdrawal and explains it in plain words. |
| 5 | 0:35 | Signals ("The owner's own wallet") and the AI explanation | Low risk: it goes to your own wallet. The app computes the score. AI only puts it into words. |
| 6 | 0:46.5 | Wallet approval, Withdrawal Pending countdown | Every withdrawal waits a delay you choose, so you or a guardian can cancel it. |
| 7 | 0:53 | Activity history, then People: guardian and SKR rewards | Every step is on-chain, and guardians earn SKR each week they check in. |
| 8 | 1:01 | App reopens, the backup PIN is entered | Now, the moment Nest was built for. Someone makes you open the app, and you enter your backup PIN. |
| 9 | 1:08.5 | An ordinary wallet: "Total Balance $608.49", no savings | It opens an ordinary wallet. Real spending money, real history, and no savings to find. |
| 10 | 1:15 | Activity, People and Settings tabs | Every tab works as you'd expect, so nothing looks out of place. |
| 11 | 1:21 | Emergency contact's text: "Their savings are frozen", map link | Meanwhile, the phone's own key has frozen your savings on-chain, and your emergency contact gets a text with your location. |
| 12 | 1:31 | Real PIN: "Savings are frozen", then Settings: "Backup PIN was used" | Later, your real PIN shows your savings frozen, and Settings records when the backup PIN was used. |
| 13 | 1:44 | Guardian's phone; alert "Withdrawal requested · High risk" | This is the guardian's phone. A large withdrawal to a new address is requested, and the alert already says: high risk. |
| 14 | 1:52.5 | "High risk · 60", New destination, Most of the savings (91%), AI briefing | The app scored it 60 out of 100: a new destination, and 91% of the savings. Nest Intelligence briefs the guardian in plain words. |
| 15 | 2:05 | Cancel, wallet approval, "No open requests" | One tap cancels it. The money never moved. |
| 16 | 2:14 | What-if: "3/7 Scenarios protected" and the AI's top fix | The What-if simulator plays seven attacks against your real setup, and AI says what to fix first. |
| 17 | 2:23.5 | "What if someone steals my wallet key", steps, AI walkthrough | Here, a stolen key: the app shows each step, and AI walks you through it. |
| 18 | 2:33.5 | "Ask your own what-if": a stolen unlocked phone, AI answer | You can ask your own what-if, too. AI explains. The program decides. |
| 19 | 2:40.5 | The answer (held) | Nest Finance. Savings that can't be rushed. |

## Making it

1. Record the segments on the emulator: `scripts/demo/02-owner-tour.sh`, `03-protected-withdrawal.sh`, `04-duress.sh` (owner wallet), `06-guardian-ai.sh` (guardian wallet), `07-owner-ai.sh` (owner wallet).
2. Cut and join them: `T02="3-11 15-19 27-30 40-46 51-53 57-61" T03="3-8 12-26 36-38 44-49 66-71 75-78" T04="4-27 45-51 58-72" T06="21-26 27-29 30-44 52-56 60-65" T07="36-45 58-68 98-110" bash scripts/demo/assemble.sh`. It prints where each cut starts.
3. Frame and caption it: `python scripts/demo/make-captions.py`.
4. Generate the voiceover from [voiceover-elevenlabs.txt](voiceover-elevenlabs.txt) in one go (SKR is written "S K R" and numbers are spelled out so they are read correctly), then `python scripts/demo/place-voiceover.py <voiceover.mp3>` places each line at its start time and writes `demo-recordings/nest-finance-demo-voiced.mp4`.

## Notes

- Everything on screen is live devnet data. The guardian alert comes from a real withdrawal request made with the owner's key from outside the app (`app/scripts/owner-request.mjs`), the way a drainer would.
- The program's 22 tests, including an attacker holding the owner's real key, are covered in the deck rather than the video.
