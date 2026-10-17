# Implementation plan (Bolna Symphony Buildathon, submit by Oct 31, 2026)

## What we're building
A Hinglish voice line for the first minutes after UPI or online fraud. The caller talks to the AI agent. A 1930 / NCRP complaint fills in live on screen, the case lands in a mock bank fraud-ops queue, and the caller gets the next steps (1930, bank in writing within 3 working days, I4C restoration for held money, a warning about fake recovery agents).

## How it fits together
```
caller ──phone──▶ Bolna (Sarvam STT → gpt-4.1-mini → Sarvam TTS)
                      │ custom functions (record_consent, add_transaction, submit_case)
                      ▼
                 app/ (FastAPI on Render) ──▶ /case/latest  live complaint page
                      ▲                  └─▶ /bank         mock fraud-ops queue
   post-call webhook ─┘ (transcript + extracted_data)
```

## Bolna choices (from Bolna's docs, Oct 2026)
| Part | Choice | Why |
|---|---|---|
| STT | Sarvam `saaras:v4`, language `hi` | Handles Hindi-English switching; in the flat per-minute rate |
| LLM | OpenAI `gpt-4.1-mini` | Reliable tool calling; in the flat rate |
| TTS | Sarvam `bulbul:v3`, voice Priya | Indian voice; in the flat rate. Kalpa (Hinglish) is not in the flat-rate list, so it's an upgrade to try last |
| Tools | 3 custom functions, `key: custom_task`, POST with `%(name)s` params | Per Bolna's custom function schema |
| Webhook | `webhook_url` in `agent_config` | Several POSTs per call; `completed` is final |
| Telephony | Bolna's default number for outbound calls | No number purchase needed for testing |

## Budget: $5 free credit
- Price: from $0.06 per minute with bundled models, plus about $0.02/min platform fee and telephony per minute. **[estimate]** That's roughly 50 to 80 minutes of calls.
- A phone number costs $5/month, the whole credit. **We don't buy one.** Every call is outbound from Bolna's default number: we call ourselves to test, and judges get a "Saathi calls you" button on the demo page instead of a number to dial.

| Phase | What | Spend |
|---|---|---|
| 0 | Deploy backend to Render (free); dry-run agent payload | $0 |
| 1 | Create agent; 2 short calls to Jayanth's phone to check tools reach the backend | ~$0.50 |
| 2 | Jayanth plays 10 of the 20 test callers (~3 min each); score from transcripts | ~$2.50 |
| 3 | 3 to 5 friends try it | ~$1.00 |
| 4 | Record the demo video | ~$0.50 |
| Reserve | Live demo for judges | ~$0.50 + top-up |

Check the balance with `python agent/bolna.py me` before each phase. If we run low, top up $10 (the minimum) before the interview round.

## Things the docs don't confirm (check on the first real call)
1. Whether `api_tools` with `tools` + `tools_params` is the right shape for the create-agent API (it's the shape in Bolna's open-source agent config). If the create call rejects it, add the 3 tools in the dashboard's Tools tab instead.
2. Whether system variables like `execution_id` can be passed into tool params. Until confirmed, the backend attaches tool calls to the call in progress, which is fine for one call at a time.
3. Whether the free credit can call Indian mobiles from Bolna's default number.
4. Whether a call transfer to 1930 (a short code) works. If not, the agent tells the caller to dial 1930.

## Other notes from the docs
- The dashboard's built-in test call has no telephony charge, so we tune the prompt there for free and spend credit only on real phone calls (Phases 1 to 4).
- An Indian number needs company KYC (CIN and GST), another reason to stay outbound-only.
- Bolna blocks agents flagged for "scam or fraud-related behaviour". The prompt must read clearly as helping victims report and protect themselves, and never collect OTPs, PINs or passwords. It already does; keep it that way when editing.
- A 48-hour follow-up call ("did you get your acknowledgement number? did the bank reply?") is the answer to the biggest pain in our evidence. For the demo we trigger it by hand.

## Schedule
- **Oct 17 to 19:** deploy backend, create agent, first calls (Phase 0 and 1).
- **Oct 20 to 23:** Phase 2 test calls, fix prompt and tools; add the "Saathi calls you" button and the status-callback demo.
- **Oct 24 to 26:** friends test (Phase 3); write the scoring summary.
- **Oct 27 to 30:** pitch deck and demo video (Phase 4).
- **Oct 31:** submit: GitHub link + deck/video.
