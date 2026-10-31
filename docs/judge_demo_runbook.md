# Judge demo runbook — Saathi 1930

A script for running the live demo in front of the judges, plus the exact fallback if a phone
rung times out. Three rungs, safest first — **never skip a rung to the next one before the
current one has visibly worked on screen.**

> All data is synthetic. UTRs start `9999`. Nothing is filed with real 1930.

## Before you get on stage (do this, not during the judges)

1. **Backend is live.** The FastAPI app is running somewhere with a URL and a `BACKEND_TOKEN`:
   - deployed: `https://<your-app>.onrender.com`, or
   - local: `http://localhost:8000` (run `cd app && uvicorn main:app --port 8000`).
2. **Saathi's agent is created** on the Bolna account that owns `BOLNA_API_KEY`:
   - `export BOLNA_API_KEY=... BACKEND_URL=<backend> BACKEND_TOKEN=<token>`
   - `python agent/bolna.py agent`  → writes `agent/agent_id.txt`
   - set that id in the backend's env as `BOLNA_AGENT_ID` (the phone rung needs it).
   - confirm credit: `python agent/bolna.py me`. Keep ≥ $2 free.
3. **The caller-bot agents exist** on the *second* Bolna account (`BOT_API_KEY`) — they are
   `agent/bot_agents.json`. You don't recreate them, just have `BOT_API_KEY` handy.
4. **Open the site** and, on the **Judge demo** section, fill **Settings** once:
   - Backend URL = the deploy URL (or `http://localhost:8000`),
   - `BACKEND_TOKEN`,
   - `BOT_API_KEY` (caller-bot key),
   - bridge scenario = `Rohit`.
   These are stored only in that browser's `localStorage` — no keys in the repo or on any server.

## On stage — the three rungs

### Rung 1 · Replay (60 s, always works — your safety net)
Click **Play the replay**. The simulated Saathi ↔ Rohit call runs and the complaint fills in.
Use this to talk through *what* the product is. If anything later fails, you can always say
"that's the simulated version; let me show the live one."

### Rung 2 · Two-voice bridge (2–3 min, the "two AIs just had a real call" moment)
Click **Open the bridge**. A new tab opens `/bridge` with the keys in the URL fragment. In that
tab, pick the scenario and press **Start test call**. Now Saathi (voice: Priya) and a synthetic
caller talk, on two separate Bolna voice sessions, with no human on the line.
- While it runs, the **Live case** panel on the console tracks the real case being created
  (polling `/api/cases/latest`).
- Also open the backend's own `/case` and `/bank` next to it — show the complaint *and* the
  queue together. This is the strongest "it's a system, not a toy" shot.
- Let it finish or stop it. Confirm you saw the case reach **Complaint ready**.

### Rung 3 · Dial a judge (the climax)
Only after Rung 2 visibly worked: type a judge's `+91…` number and press the phone button.
Saathi dials that phone from Bolna and runs the **alert call** ("was this you?"). On the
projector, the **Live case** panel fills in as the real call happens, and the backend's `/bank`
queue picks up the case. The judge on the phone is part of the demo — ask them to say "no, not
me" to trigger the fraud-intake path.

> Trigger order that always lands: Rung 1 sets up the story → Rung 2 proves the voice pipeline
> end-to-end → Rung 3 is the payoff, and you've already *seen* the pipeline work, so a pickup
> failure is no longer a surprise.

## Fallbacks (in priority order)

| If … | do this |
|---|---|
| A phone rung times out / no answer | Keep the **Rung 2 bridge tab open** — it already proves the voice pipeline end to end. Say the phone is "just for the judges to try." |
| No credit on the call account | Same as above; the bridge uses the bot account, and replay is fully offline. |
| Backend unreachable from the site | The **Replay** rung works with zero backend; the two-voice and phone rungs need it. Re-check Settings → URL/token and that the backend allows this origin (CORS). |
| Browser blocks a popup to `/bridge` | Click the **open** link in the status line instead of relying on the auto-open; or copy the shown URL. |

## Quick commands (rehearsal, no credit spent)

```bash
# replay a synthetic caller into the live complaint page (no phone, no credit)
curl -X POST <backend>/api/demo/V16

# watch the queue
open <backend>/bank
```

## Things to say / not say to the judges

- Lead with the **RBI 3-working-day window** and "the complaint fills in *while* they talk" — that's the differentiator.
- Point out the **safety rails**: it never asks for an OTP/PIN and never promises a refund.
- If asked "is this a real 1930 filing?": **no — demo build, all data synthetic, UTRs are `9999`-prefixed.** Say it plainly; it's a buildathon.
