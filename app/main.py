"""Backend for the fraud first-response line.

Bolna's custom functions POST here during the call; the live complaint page and the
mock bank fraud-ops queue read from the same store. All data is in memory plus a JSON
snapshot (cases.json), which is enough for a demo.
"""
import json
import os
import re
import sys
import urllib.error
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

HERE = Path(__file__).resolve().parent
STORE = HERE / "cases.json"
TOKEN = os.environ.get("BACKEND_TOKEN")  # Bolna sends this as its api_token; unset = open (local dev)
CALLERS = HERE.parent / "test_calls" / "callers.json"
sys.path.insert(0, str(HERE.parent / "agent"))
import bolna  # noqa: E402  (agent config and Bolna API helper, shared with the CLI)

app = FastAPI(title="Saathi 1930 backend")
app.mount("/static", StaticFiles(directory=HERE / "static"), name="static")
cases: dict[str, dict] = json.loads(STORE.read_text()) if STORE.exists() else {}
latest_id: str | None = max(cases, key=lambda k: cases[k]["created_at"]) if cases else None


def save():
    STORE.write_text(json.dumps(cases, ensure_ascii=False, indent=1))


def now():
    return datetime.now().isoformat(timespec="seconds")


def auth(authorization: str | None):
    if TOKEN and authorization not in (TOKEN, f"Bearer {TOKEN}"):
        raise HTTPException(401, "bad token")


def blank(v):
    # Bolna fills unset %(x)s params with empty strings or the literal "None"
    return v in (None, "", "None", "null")


def case_for(body: dict) -> dict:
    """Find the case for this call; Bolna's call id field name is not confirmed yet, so accept several."""
    global latest_id
    cid = next((str(body[k]) for k in ("call_sid", "execution_id", "call_id") if not blank(body.get(k))), None)
    if cid is None:
        cid = latest_id if latest_id and cases[latest_id]["status"] == "in_call" else f"demo-{datetime.now():%H%M%S}"
    if cid not in cases:
        cases[cid] = {"id": cid, "created_at": now(), "status": "in_call", "consent": None,
                      "transactions": [], "complaint": {}, "extracted": {}, "events": []}
    latest_id = cid
    return cases[cid]


def check_utr(mode: str, ref: str) -> str | None:
    digits = re.sub(r"\D", "", ref or "")
    if blank(ref):
        return "missing"
    if mode == "UPI" and len(digits) != 12:
        return f"UPI UTR should be 12 digits, got {len(digits)}"
    return None


def working_days_since(ts: str | None) -> int | None:
    try:
        d = datetime.fromisoformat(ts.replace(" ", "T"))
    except (AttributeError, ValueError):
        return None
    n, day = 0, d.date()
    while day < datetime.now().date():
        day += timedelta(days=1)
        if day.weekday() < 5:
            n += 1
    return n


def priority(c: dict) -> dict:
    """Rank cases for the bank: money at stake, weighted by how fresh the first debit is."""
    total = sum(t["amount_inr"] for t in c["transactions"])
    times = [t["datetime"] for t in c["transactions"] if not blank(t.get("datetime"))]
    wd = working_days_since(min(times)) if times else None
    fresh = 3 if wd is not None and wd == 0 else 2 if wd is not None and wd <= 3 else 1
    window = None if wd is None else "within 3 working days" if wd <= 3 else "4 to 7 working days" if wd <= 7 else "after 7 working days"
    return {"total_inr": total, "working_days": wd, "rbi_window": window, "score": round(total * fresh / 1000, 1)}


@app.post("/api/consent")
async def consent(req: Request, authorization: str | None = Header(None)):
    auth(authorization)
    b = await req.json()
    c = case_for(b)
    c["consent"] = {"caller_name": b.get("caller_name"), "is_account_holder": str(b.get("is_account_holder")).lower() in ("true", "1", "yes"),
                    "account_holder_name": None if blank(b.get("account_holder_name")) else b["account_holder_name"], "at": now()}
    c["events"].append([now(), "consent recorded"])
    save()
    return {"ok": True, "message": "Consent noted. Continue collecting details."}


@app.post("/api/transaction")
async def transaction(req: Request, authorization: str | None = Header(None)):
    auth(authorization)
    b = await req.json()
    c = case_for(b)
    try:
        amount = float(str(b.get("amount_inr")).replace(",", ""))
    except ValueError:
        return {"ok": False, "message": "Amount was not a number. Please ask the caller for the amount again."}
    t = {"amount_inr": amount, "mode": b.get("mode") or "Other", "utr_or_ref": "" if blank(b.get("utr_or_ref")) else re.sub(r"\s", "", b["utr_or_ref"]),
         "app": b.get("app"), "bank": b.get("bank"), "datetime": None if blank(b.get("datetime")) else b["datetime"]}
    t["utr_issue"] = check_utr(t["mode"], t["utr_or_ref"])
    c["transactions"].append(t)
    c["events"].append([now(), f"debit Rs {amount:,.0f} added"])
    save()
    if t["utr_issue"]:
        return {"ok": True, "message": f"Saved, but check the UTR: {t['utr_issue']}. Ask which label it had on the screen."}
    return {"ok": True, "message": f"Debit {len(c['transactions'])} saved. Ask if there were any other debits."}


@app.post("/api/submit")
async def submit(req: Request, authorization: str | None = Header(None)):
    auth(authorization)
    b = await req.json()
    c = case_for(b)
    c["complaint"] = {k: (None if blank(v) else v) for k, v in b.items() if k not in ("call_sid", "execution_id", "call_id")}
    c["status"] = "submitted"
    c["submitted_at"] = now()
    c["events"].append([now(), "complaint ready, sent to bank queue"])
    save()
    p = priority(c)
    missing = [i for i, t in enumerate(c["transactions"], 1) if t["utr_issue"]]
    note = f" UTR still needs checking for debit {', '.join(map(str, missing))}." if missing else ""
    return {"ok": True, "case_id": c["id"], "message": f"Complaint ready, total Rs {p['total_inr']:,.0f}, reported {p['rbi_window'] or 'date unknown'}.{note} Tell the caller the next steps."}


@app.post("/api/bolna/webhook")
async def bolna_webhook(req: Request):
    """Bolna post-call webhook: attach transcript and extractions to the case."""
    b = await req.json()
    c = case_for(b)
    c["extracted"] = b.get("extracted_data") or c["extracted"]
    c["transcript"] = b.get("transcript") or c.get("transcript")
    if c["status"] == "in_call":
        c["status"] = "call_ended"
    c["events"].append([now(), "call ended"])
    save()
    return {"ok": True}


@app.post("/api/demo/{caller_id}")
def demo(caller_id: str):
    """Replay a synthetic caller from callers.json as if the agent had collected it (for the screen demo without a phone)."""
    caller = next((x for x in json.loads(CALLERS.read_text()) if x["id"] == caller_id), None)
    if not caller:
        raise HTTPException(404, "no such caller")
    cid = f"demo-{caller_id}-{datetime.now():%H%M%S}"
    c = case_for({"call_sid": cid})
    c["consent"] = {"caller_name": caller["persona"].split(",")[0], "is_account_holder": True, "account_holder_name": None, "at": now()}
    for t in caller["transactions"]:
        c["transactions"].append({**t, "utr_issue": check_utr(t["mode"], t["utr_or_ref"])})
    c["complaint"] = {"fraud_type": caller["fraud_type"], "description": caller["complication"], "language": caller["language"],
                      "suspect_phone": caller["suspect"].get("phone"), "suspect_vpa_or_account": caller["suspect"].get("vpa") or caller["suspect"].get("account")}
    c["status"] = "submitted"
    c["submitted_at"] = now()
    save()
    return {"case_id": cid}


@app.get("/api/cases")
def list_cases():
    out = [{**c, "priority": priority(c)} for c in cases.values()]
    return sorted(out, key=lambda c: -c["priority"]["score"])


@app.get("/api/cases/{cid}")
def get_case(cid: str):
    if cid == "latest" and latest_id:
        cid = latest_id
    if cid not in cases:
        raise HTTPException(404)
    return {**cases[cid], "priority": priority(cases[cid])}


@app.post("/api/cases/{cid}/action")
async def bank_action(cid: str, req: Request):
    b = await req.json()
    cases[cid].setdefault("bank_actions", []).append([now(), b.get("action")])
    save()
    return {"ok": True}


def admin(token: str | None):
    if not TOKEN or token != TOKEN:
        raise HTTPException(401, "bad token")
    if not os.environ.get("BOLNA_API_KEY"):
        raise HTTPException(500, "BOLNA_API_KEY is not set on the server")


def bolna_call(method, path, body=None):
    try:
        return bolna.req(method, path, body)
    except urllib.error.HTTPError as e:
        return JSONResponse({"bolna_status": e.code, "bolna_error": e.read().decode(errors="replace")}, status_code=502)
    except urllib.error.URLError as e:
        return JSONResponse({"bolna_error": f"could not reach Bolna: {e.reason}"}, status_code=502)


@app.get("/admin/setup-agent")
def setup_agent(token: str | None = None):
    """Create the Bolna agent, or update it when BOLNA_AGENT_ID is set. Open in a browser with ?token=BACKEND_TOKEN."""
    admin(token)
    aid = os.environ.get("BOLNA_AGENT_ID")
    out = bolna_call("PUT", f"/v2/agent/{aid}", bolna.agent_payload()) if aid else bolna_call("POST", "/v2/agent", bolna.agent_payload())
    if isinstance(out, dict) and not aid:
        out["next_step"] = "Add this agent_id to Render's Environment as BOLNA_AGENT_ID"
    return out


@app.get("/admin/balance")
def balance(token: str | None = None):
    admin(token)
    return bolna_call("GET", "/user/me")


@app.get("/admin/result/{execution_id}")
def result(execution_id: str, token: str | None = None):
    admin(token)
    return bolna_call("GET", f"/executions/{execution_id}")


@app.post("/api/call-me")
async def call_me(req: Request):
    """Saathi calls the given number. Token-protected for now so nobody spends the credit."""
    b = await req.json()
    admin(b.get("token"))
    phone = re.sub(r"[^\d+]", "", b.get("phone") or "")
    if not re.fullmatch(r"\+91\d{10}", phone):
        raise HTTPException(400, "Use an Indian mobile in the form +91XXXXXXXXXX")
    if not os.environ.get("BOLNA_AGENT_ID"):
        raise HTTPException(500, "BOLNA_AGENT_ID is not set yet")
    return bolna_call("POST", "/call", {"agent_id": os.environ["BOLNA_AGENT_ID"], "recipient_phone_number": phone})


@app.get("/call")
def call_page():
    return FileResponse(HERE / "static" / "call.html")


@app.get("/health")
def health():
    return {"ok": True, "cases": len(cases)}


@app.get("/")
@app.get("/case/{cid}")
def case_page(cid: str = "latest"):
    return FileResponse(HERE / "static" / "case.html")


@app.get("/bank")
def bank_page():
    return FileResponse(HERE / "static" / "bank.html")
