# Saathi 1930

A Hinglish voice line for the first minutes after a UPI or online fraud, built on [Bolna](https://www.bolna.ai) for the Bolna Symphony Buildathon.

The caller talks to the agent. A complete 1930 / cybercrime.gov.in complaint fills in on screen while they talk, with every UTR read back and checked. The case then lands in a bank fraud-ops queue ranked by money at stake and how fresh the fraud is. The victim uses it free; the plan is for banks and payment apps to pay per structured case.

All data in this repo is synthetic. UTRs start with `9999` so they can't match real transactions.

## Layout
- `app/`: FastAPI backend the Bolna tools call, plus the live complaint page (`/case/latest`) and the bank queue (`/bank`).
- `agent/`: system prompt and `bolna.py`, which creates or updates the Bolna agent and places test calls.
- `knowledge/`: public rules the agent follows (1930 fields, RBI liability rules, UPI dispute, Ombudsman) and sourced victim evidence.
- `test_calls/`: 20 synthetic victim callers, each modelled on a real public post.
- `docs/implementation_plan.md`: the plan and credit budget.

## Run locally
```
pip install -r app/requirements.txt
cd app && uvicorn main:app --port 8000
# no phone needed: load a synthetic caller and open http://localhost:8000/bank
curl -X POST localhost:8000/api/demo/V16
```

## Connect Bolna
```
export BOLNA_API_KEY=...            # from the Bolna dashboard
export BACKEND_URL=https://<your-render-app>.onrender.com
export BACKEND_TOKEN=...            # same value the backend runs with
python agent/bolna.py agent --dry-run
python agent/bolna.py agent
python agent/bolna.py call +91XXXXXXXXXX
```

## Simulated test calls
An LLM plays each of the 20 synthetic victims in `test_calls/callers.json` against the agent's prompt and tools (same model as the Bolna agent), and each run is scored: UTRs and amounts captured, right route, no OTP request or refund promise, the special case handled, caller not cut off. It tests the conversation logic, not the voice layer.

Set `OPENAI_API_KEY` on the server, then open `/admin/simulate?token=<BACKEND_TOKEN>` (all 20) or add `&ids=V01,V08`. The report page refreshes until the run is done.
