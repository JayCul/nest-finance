# Nest Intelligence: what is computed where

**AI explains, detects, simulates and recommends. The Solana program decides what is allowed.** Nest Intelligence never signs, never moves funds and never changes settings. Every number and every decision it shows is computed in code; a model on Groq only turns those facts into sentences.

## Data flow

```
On-chain (devnet)              On the phone (deterministic code)                Groq (wording only)
-----------------              ----------------------------------               -------------------
Vault account        ─┐
PendingWithdrawal    ─┼──▶  assessWithdrawal()  ──▶ score, level, signals,  ──▶ facts text ──▶ gpt-oss-120b ──▶ 2-3 sentences
Program events       ─┤     runScenarios()          outcomes, exposures,          (riskFacts,                     shown next to
(requests, freezes)  ─┘                             recommended action            scenarioFacts,                  the computed facts
Local settings (PINs set?, contact count) ─▶                                     configFacts)
```

| Feature | Computed on-chain or on the phone (code) | Sent to Groq | Shown without a connection |
|---|---|---|---|
| Withdrawal risk score | Score 0-100, level, signals, recommended action: `assessWithdrawal` in `app/features/intel/withdrawal-risk.ts`, from the vault account, pending withdrawals and decoded program events | The facts text (`riskFacts`) | Score, signals, action |
| Guardian alert | Risk level and top reasons, computed on the guardian's phone (`use-guardian-watcher.ts`) | Nothing | Everything (no AI involved) |
| Guardian / owner briefing | Same as the risk score | The facts text | Score, signals, action |
| Transaction explainer | Amount, protection window, cancellability, risk score, from the form and on-chain state (`app/withdraw.tsx`) | The facts text, only when the user taps **Explain this transaction** | Everything except the paragraph |
| What-if simulator | Seven scenarios, each with steps, outcome, exposure and fixes: `runScenarios` in `app/features/intel/simulator.ts`, from the vault account and local settings | The scenario facts (`scenarioFacts`, `configFacts`), and the user's question if they ask one | All scenarios, steps, outcomes and fixes |
| Freeze report | Who froze it, when, what it cancelled; phone state at the backup PIN | **Nothing.** The freeze report is never sent to the AI | Everything |

**Never sent to Groq:** private keys, seed phrases, PINs, full wallet addresses, location, IP address, device model, phone numbers, transaction signatures. Addresses appear only shortened (`BDH7…FtvR`).

## A real request

Captured on 2026-10-02 by `app/scripts/ai-payload.ts`, which builds the guardian briefing for a live pending withdrawal on the demo vault (`CCYNF26y9AfyxZ5D1azdw31D1HzrGKtnEpbKHsDLjXJa`, devnet) with the same functions the app uses.

**Computed locally** (the app decides all of this):

```json
{
  "score": 60,
  "level": "high",
  "signals": [
    {
      "key": "new-destination",
      "points": 30,
      "label": "New destination",
      "detail": "BDH7…FtvR has not been used by these savings before today."
    },
    {
      "key": "most-of-savings",
      "points": 30,
      "label": "Most of the savings",
      "detail": "91% of what is in the vault."
    }
  ],
  "action": "Confirm with the owner through a channel you trust before it unlocks. If you cannot, cancel it: cancelling moves no money."
}
```

**The request body sent to `https://api.groq.com/openai/v1/chat/completions`** (the system message is the fixed rules plus the task; the user message is the only data):

```json
{
  "model": "openai/gpt-oss-120b",
  "temperature": 0.2,
  "max_completion_tokens": 700,
  "reasoning_effort": "low",
  "include_reasoning": false,
  "messages": [
    {
      "role": "system",
      "content": "You are Nest Intelligence inside Nest Finance, a savings app on Solana where every withdrawal waits a protection delay that the owner or a guardian can cancel, and savings can be frozen. Use only the facts given. Never invent amounts, times, names, addresses or reasons. If the facts do not answer something, say so. Repeat the recommended action exactly in meaning when one is given; do not add other advice. Plain English, no markdown, no headings, no lists, no emoji. Write a briefing for a guardian about this pending withdrawal in 2 or 3 sentences: what is leaving, how long they have, and why the app scored it this way. End with the recommended action."
    },
    {
      "role": "user",
      "content": "Reader: a guardian of these savings (not the owner).\nWithdrawal: 0.6 SOL.\nIt unlocks in less than an hour and can be cancelled until then; cancelling moves no money.\nRisk score (computed by the app): 60/100, high.\nSignals: New destination (BDH7…FtvR has not been used by these savings before today.); Most of the savings (91% of what is in the vault.).\nRecommended action (decided by the app): Confirm with the owner through a channel you trust before it unlocks. If you cannot, cancel it: cancelling moves no money."
    }
  ]
}
```

**Groq's reply**, shown under the computed score and signals:

> A withdrawal of 0.6 SOL, representing 91 % of the vault’s balance, is set to unlock in less than an hour and can be cancelled until then, though cancelling moves no money. The app gave it a high risk score of 60/100 because the destination address (BDH7…FtvR) is new and has not been used by these savings before today. Confirm with the owner through a trusted channel before it unlocks; if you cannot, cancel it.

## Guardrails

- **The model cannot decide.** The score, the level, the outcome of each scenario and the recommended action are inputs to the model, computed beforehand. The system prompt tells it to repeat the recommended action and add no other advice.
- **The model cannot act.** Its output is display text. No code path turns it into a transaction, a setting or a navigation.
- **Facts are always visible.** Every AI paragraph sits next to the computed facts it was written from, with the note "Score, signals and advice computed by the app; worded by AI."
- **Graceful failure.** No connection, rate limit or a bad answer leaves the computed facts on screen with a plain message (`app/features/ai/groq.ts`). Answers are cached per set of facts, so the same facts never cost a second call.
- **Models.** `openai/gpt-oss-120b` with reasoning effort `low` and hidden reasoning; `openai/gpt-oss-20b` as a fallback. Typical latency 0.7 to 2 seconds.

## The API key

The key lives in `app/.env.local`, which is git-ignored and never committed. `npm run groq:key` (`app/scripts/encrypt-groq-key.mjs`) encrypts it with AES-256-GCM under a key derived with SHA-256 from an app pepper and a random salt; only that ciphertext is built into the APK, and `app/features/ai/groq.ts` decrypts it at run time. It keeps the key out of the APK as plain text, but it is obfuscation, not secrecy: a determined person can recover it from the app. The worst case is someone using AI credit on that key, not access to funds or user data. The key should be a dedicated one with a spending limit, rotated after judging; the planned fix is a small server-side proxy so no key ships in the app.

## Check it yourself

- `assessWithdrawal` and `runScenarios` are pure functions: read them, or run `npx tsx scripts/ai-payload.ts <vault>` in `app/` against any vault with a pending withdrawal.
- On a phone: open a guardian's vault with a pending withdrawal (briefing under the request), tap **Explain this transaction** on the withdraw screen, or open **What if…?** from Home.
