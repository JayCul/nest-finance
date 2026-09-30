# Demo video voiceover (2:50)

Voiceover for `demo-recordings/nest-finance-demo.mp4` (2:50), recorded on an Android emulator on Solana devnet with each tap shown as a white dot. The same lines, with pause tags, are in [voiceover-elevenlabs.txt](voiceover-elevenlabs.txt), ready to paste into ElevenLabs.

Pauses assume about 2.6 words a second, a typical ElevenLabs narration pace. Voices differ, so after generating, check that each line starts near its time below and nudge any that drift.

| # | Starts | On screen | Line | Pause after |
|---|---|---|---|---|
| 1 | 0:00 | Home screen, tap the Nest icon, PIN pad | A Seeker tells people you hold crypto. Nest Finance keeps your savings safe, even if you're forced to unlock your phone. | 0.5s |
| 2 | 0:08.5 | Home: protected balance | It opens with a PIN, like any banking app. | 0.5s |
| 3 | 0:12.5 | Spending and Protected Savings accounts, the Protection card | Your spending wallet and your protected savings sit side by side, and the protection card shows the rules. | 0.5s |
| 4 | 0:20 | Safety score: 80, "Good, with gaps" | The safety score checks your setup and flags what's missing. | 6s |
| 5 | 0:30 | Deposit 0.1 SOL, wallet approval | Moving money into savings takes one tap, and one approval in your wallet. | 6s |
| 6 | 0:41 | Balance rises to $77.61 | Done. It's now in a vault on Solana that only releases money slowly. | 1s |
| 7 | 0:47 | Withdraw 0.05 SOL, wallet approval | Taking money out is different. Every withdrawal waits a delay you choose, normally one to seven days. This demo uses two minutes. | 1s |
| 8 | 0:56.5 | Withdrawal Pending countdown | Until the countdown ends, you or your guardian can cancel it. A drainer, or someone standing over you, gets a queued request, not your money. | 0.5s |
| 9 | 1:06.5 | Activity history, then People: guardian and SKR rewards | Every step is recorded on-chain. Your guardian earns SKR each week they check in, so they stay reachable. | 3s |
| 10 | 1:17 | App reopens, a PIN is entered | Now, the moment Nest was built for. Someone makes you open the app. You enter your backup PIN. | 0.5s |
| 11 | 1:24.5 | A plain wallet: "Total Balance $16.09", no savings | It opens an ordinary-looking wallet. Real spending money, real history. No savings, no guardians, nothing to find. | 4s |
| 12 | 1:35 | Activity, People and Settings tabs | Every tab works exactly as you'd expect, so nothing looks out of place. | 2.5s |
| 13 | 1:42.5 | Emergency contact's text: "Their savings are frozen", map link | Meanwhile, the phone's own key has already frozen your savings on-chain, with no wallet prompt. And your emergency contact gets a text with your location. | 2s |
| 14 | 1:54 | Real PIN, "Savings are frozen", then Settings: "Backup PIN was used" | Later, your real PIN shows what happened. Your savings are frozen, and Settings keeps a record of when the backup PIN was used, and who was told. | 0.5s |
| 15 | 2:04.7 | The frozen record | Nothing leaves until the freeze ends, unless you and a guardian lift it together. | 1s |
| 16 | 2:11 | The guardian's app: "People you protect" | This is the guardian's phone. Same app, their own wallet. Nest finds the savings they protect automatically. | 0.5s |
| 17 | 2:18 | Alert: "Withdrawal requested", opens the vault | Now a withdrawal is requested from somewhere else, the way a drainer or a coerced signature would. Within seconds, the guardian is alerted. | 0.5s |
| 18 | 2:27.5 | Live countdown and a Cancel button | They can see exactly what's leaving, and when. | 4.5s |
| 19 | 2:35 | Cancel, wallet approval | One tap. One approval. | 6s |
| 20 | 2:42.5 | "No open requests" | It's cancelled. The money never moved. | 1s |
| 21 | 2:46 | "No open requests" (held) | Nest Finance. Savings that can't be rushed. | end |

Newer ElevenLabs models ignore `<break>` tags. Generate the whole script in one go, then run `python scripts/demo/place-voiceover.py <voiceover.mp3>`: it cuts each line out of the audio and places it at its start time, writing `demo-recordings/nest-finance-demo-voiced.mp4`.

In the ElevenLabs file, SKR is written "S K R" so it is read as letters. ElevenLabs caps one break at 3 seconds, so longer pauses are two breaks in a row.

## Notes

- The freeze report and on-device AI are not in this video, to keep it under 3 minutes. They have their own clip: [freeze-report-demo.mp4](https://github.com/JayCul/nest-finance/releases/latest/download/freeze-report-demo.mp4), recorded with `scripts/demo/05-freeze-report.sh`.

- Timecodes come from `scripts/demo/assemble.sh`, which prints where each clip starts. Cuts used for this video: `T02="2-26 30-36 38-43 47-62" T03="4-8 15-17 20.5-33 51-56 58-64" T04="3-29 41-48 51-57.5 59-73" T01="0-8 20-54"`.
- The program's 22 tests, including an attacker holding the owner's real key, are covered in the deck rather than the video.
