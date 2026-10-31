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
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from html import escape
from fastapi.staticfiles import StaticFiles

HERE = Path(__file__).resolve().parent
STORE = HERE / "cases.json"
TOKEN = os.environ.get("BACKEND_TOKEN")  # Bolna sends this as its api_token; unset = open (local dev)
CALLERS = HERE.parent / "test_calls" / "callers.json"
sys.path.insert(0, str(HERE.parent / "agent"))
import bolna  # noqa: E402  (agent config and Bolna API helper, shared with the CLI)
import caller_bot  # noqa: E402
import simulate  # noqa: E402

app = FastAPI(title="Saathi 1930 backend")
app.mount("/static", StaticFiles(directory=HERE / "static"), name="static")

# The judge demo console (site/) fetches /api/case/* and POSTs /api/alert-call from its own
# origin, so allow cross-origin reads. The API is token-gated, not cookie-authed, so a
# permissive allow-origin is safe here. Pin specific origins in production via CORS_ORIGINS.
_CORS = os.environ.get("CORS_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS.split(",") if _CORS != "*" else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
cases: dict[str, dict] = json.loads(STORE.read_text()) if STORE.exists() else {}
latest_id: str | None = max(cases, key=lambda k: cases[k]["created_at"]) if cases else None
ORG = os.environ.get("ORG_NAME", "Demo Wallet")  # the made-up fintech whose fraud team uses Saathi in the demo


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


def new_case(cid: str, **extra) -> dict:
    global latest_id
    base, n = cid, 1
    while cid in cases:  # two calls placed in the same second
        n += 1
        cid = f"{base}-{n}"
    cases[cid] = {"id": cid, "created_at": now(), "status": "in_call", "consent": None,
                  "transactions": [], "complaint": {}, "extracted": {}, "events": [], **extra}
    latest_id = cid
    return cases[cid]


def case_for(body: dict) -> dict:
    """Find the case for this call; Bolna's call id field name is not confirmed yet, so accept several."""
    global latest_id
    ids = {str(body[k]) for k in ("call_sid", "execution_id", "call_id", "id") if not blank(body.get(k))}
    cid = next((k for k, c in cases.items() if k in ids or c.get("execution_id") in ids), None)
    if cid is None and latest_id and cases[latest_id]["status"] in ("in_call", "alert_calling"):
        cid = latest_id  # tool calls carry no call id: they belong to the call in progress
    if cid is None:
        return new_case(next(iter(ids), f"demo-{datetime.now():%H%M%S}"))
    latest_id = cid
    return cases[cid]


def alert_reminder(c: dict) -> str:
    """Tool replies remind the model which debit is already on the case (it kept asking for the flagged one's UTR)."""
    a = c.get("alert")
    if not a:
        return ""
    return (f"The flagged Rs {a['amount_inr']:,.0f} debit is already recorded with its transaction number: "
            f"never ask about it again. Only collect details of OTHER debits. ")


def intake_started(c: dict):
    """On an alert call the fraud intake only starts after the customer said "not me"."""
    if c.get("mode") == "alert" and not c["alert"].get("answer"):
        c["alert"].update(answer="NOT the customer", answered_at=now())
        c["status"] = "in_call"
        log(c, "customer says: this was not me")


def log(c: dict, what: str):
    c["events"].append([now(), what])


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
    fraud_at = (c.get("alert") or {}).get("debit_at") or (min(times).replace(" ", "T") if times else c["created_at"])
    return {"total_inr": total, "working_days": wd, "rbi_window": window, "score": round(total * fresh / 1000, 1), "fraud_at": fraud_at}


def sms_text(c: dict) -> str:
    p, k = priority(c), c["complaint"]
    utrs = ", ".join(t["utr_or_ref"] for t in c["transactions"] if t.get("utr_or_ref")) or "not given"
    return (f"Saathi: your fraud report {c['id']} is ready. Total Rs {p['total_inr']:,.0f}. Transaction no.: {utrs}. "
            f"1) Call 1930 or file at cybercrime.gov.in with these details. 2) Tell your bank in writing today and keep the complaint no. "
            f"3) Keep screenshots. Never share OTP/PIN. Anyone asking a fee to recover money is a scammer.")


@app.post("/api/consent")
async def consent(req: Request, authorization: str | None = Header(None)):
    auth(authorization)
    b = await req.json()
    c = case_for(b)
    intake_started(c)
    c["consent"] = {"caller_name": b.get("caller_name"), "is_account_holder": str(b.get("is_account_holder")).lower() in ("true", "1", "yes"),
                    "account_holder_name": None if blank(b.get("account_holder_name")) else b["account_holder_name"], "at": now()}
    log(c, "consent recorded")
    save()
    return {"ok": True, "message": "Consent noted. " + alert_reminder(c) + "Continue collecting details, one question at a time."}


@app.post("/api/transaction")
async def transaction(req: Request, authorization: str | None = Header(None)):
    auth(authorization)
    b = await req.json()
    c = case_for(b)
    intake_started(c)
    try:
        amount = float(str(b.get("amount_inr")).replace(",", ""))
    except ValueError:
        return {"ok": False, "message": "Amount was not a number. Please ask the caller for the amount again."}
    t = {"amount_inr": amount, "mode": b.get("mode") or "Other", "utr_or_ref": "" if blank(b.get("utr_or_ref")) else re.sub(r"\s", "", b["utr_or_ref"]),
         "app": b.get("app"), "bank": b.get("bank"), "datetime": None if blank(b.get("datetime")) else b["datetime"]}
    t["utr_issue"] = check_utr(t["mode"], t["utr_or_ref"])
    c["transactions"].append(t)
    log(c, f"debit Rs {amount:,.0f} added")
    save()
    if t["utr_issue"]:
        return {"ok": True, "message": f"Saved, but check the UTR: {t['utr_issue']}. Ask which label it had on the screen."}
    return {"ok": True, "message": f"Debit {len(c['transactions'])} saved. " + alert_reminder(c) + "Ask if there were any other debits."}


@app.post("/api/submit")
async def submit(req: Request, authorization: str | None = Header(None)):
    auth(authorization)
    b = await req.json()
    c = case_for(b)
    intake_started(c)
    c["complaint"] = {k: (None if blank(v) else v) for k, v in b.items() if k not in ("call_sid", "execution_id", "call_id")}
    if len(re.sub(r"\D", "", c["complaint"].get("mobile") or "")) < 10 and c.get("caller_phone"):
        c["complaint"]["mobile"] = c["caller_phone"]  # Saathi dialled the caller, so we already have their number
    c["status"] = "submitted"
    c["submitted_at"] = now()
    log(c, "complaint ready, sent to bank queue")
    c["sms"] = sms_text(c)
    log(c, "SMS summary sent to the caller (mock)")
    save()
    p = priority(c)
    missing = [i for i, t in enumerate(c["transactions"], 1) if t["utr_issue"]]
    note = f" UTR still needs checking for debit {', '.join(map(str, missing))}." if missing else ""
    return {"ok": True, "case_id": c["id"], "message": f"Complaint ready, total Rs {p['total_inr']:,.0f}, reported {p['rbi_window'] or 'date unknown'}.{note} Tell the caller the next steps."}


@app.post("/api/alert-answer")
async def alert_answer(req: Request, authorization: str | None = Header(None)):
    auth(authorization)
    b = await req.json()
    c = case_for(b)
    made = str(b.get("customer_made_payment")).lower() in ("true", "1", "yes")
    c.setdefault("alert", {})["answer"] = "customer made it" if made else "NOT the customer"
    c["alert"]["answered_at"] = now()
    c["status"] = "cleared" if made else "in_call"
    log(c, f"customer says: {'I made this payment' if made else 'this was not me'}" + ("" if blank(b.get("note")) else f" ({b['note']})"))
    save()
    if made:
        return {"ok": True, "message": "Marked as genuine. Thank the customer and end the call."}
    return {"ok": True, "message": "Marked as fraud; the flagged debit is already on the case. Start the fraud intake (consent first)."}


@app.post("/api/bolna/webhook")
async def bolna_webhook(req: Request):
    """Bolna execution webhook. It fires on every status change (queued, ringing, in-progress, ...), not only at the end."""
    b = await req.json()
    c = case_for(b)
    st = str(b.get("status") or "").lower()
    c["extracted"] = b.get("extracted_data") or c["extracted"]
    c["transcript"] = b.get("transcript") or c.get("transcript")
    if st and st != c.get("call_status"):
        c["call_status"] = st
        log(c, f"call status: {st}")
    if st in NOT_ANSWERED and c["status"] in ("in_call", "alert_calling"):
        c["status"] = "no_answer"
    elif st in ENDED:
        if c["status"] == "in_call":
            c["status"] = "call_ended"
        elif c["status"] == "alert_calling":
            guess = answer_from_transcript(c.get("transcript"))
            if guess is None:
                c["status"] = "ended_no_reply"  # picked up, but never said yes or no
            else:  # the agent skipped confirm_alert: read the answer from the transcript instead
                c["alert"].update(answer="customer made it" if guess else "NOT the customer", answered_at=now(), from_transcript=True)
                c["status"] = "cleared" if guess else "call_ended"
                log(c, f"customer's answer read from the transcript: {'made the payment' if guess else 'not me'}")
    if st in ENDED and c.get("mode") == "alert" and not c.get("consent") and consent_from_transcript(c.get("transcript")):
        # the agent asked for consent and got a yes but didn't call record_consent (seen in bridge tests)
        c["consent"] = {"caller_name": c["alert"]["name"], "is_account_holder": True, "account_holder_name": None, "at": now(), "from_transcript": True}
        log(c, "consent read from the transcript")
    if (st in ENDED and c.get("mode") == "alert" and c.get("consent") and c["status"] != "submitted"
            and (c.get("alert") or {}).get("answer") == "NOT the customer"):
        # the agent told the caller it was submitting but never called submit_case (seen in bridge tests):
        # file what the case already holds so it still reaches the bank queue
        c["complaint"] = {"fraud_type": "Reported on alert call", "description": "Filed after the call from the case and transcript; the agent did not submit it.",
                          "mobile": c.get("caller_phone"), **{k: v for k, v in (c.get("complaint") or {}).items() if v}}
        c["status"], c["submitted_at"] = "submitted", now()
        log(c, "complaint filed from the call record (agent skipped submit_case)")
        c["sms"] = sms_text(c)
    save()
    return {"ok": True}


CONSENT_ASK = re.compile(r"note|consent|share|cyber cell", re.I)


def consent_from_transcript(transcript) -> bool:
    """Did the caller say yes right after the agent asked to note and share their details?"""
    lines = [l.strip() for l in str(transcript or "").splitlines() if l.strip()]
    for i, line in enumerate(lines):
        if line.startswith("assistant:") and CONSENT_ASK.search(line) and "?" in line:
            reply = next((l[5:] for l in lines[i + 1:] if l.startswith("user:")), "")
            if (YES_WORDS.search(reply) or re.search(r"\b(ok|okay|sure|please|can)\b|ओके|कैन", reply, re.I)) and not NO_WORDS.search(reply):
                return True
    return False


YES_WORDS = re.compile(r"\b(yes|haan|haa|ha|ji|i did|it was me|maine kiya)\b|हाँ|हां|हा(?![\u0900-\u0963\u0966-\u097F])|जी|येस|यस|आई डिड|मैंने किया", re.I)
NO_WORDS = re.compile(r"\b(no|nahi|nahin|not me|didn'?t)\b|नहीं|नही|नो(?![\u0900-\u0963\u0966-\u097F])", re.I)


def answer_from_transcript(transcript) -> bool | None:
    """The caller's reply to the "did you make this payment" question, if it was a plain yes or no."""
    lines = [l.strip() for l in str(transcript or "").splitlines() if l.strip()]
    for i, line in enumerate(lines):
        if line.startswith("assistant:") and re.search(r"yes or no|haan ya nahi|khud kiya", line, re.I):
            reply = next((l[5:] for l in lines[i + 1:] if l.startswith("user:")), "")
            yes, no = bool(YES_WORDS.search(reply)), bool(NO_WORDS.search(reply))
            if yes != no:
                return yes
    return None


NOT_ANSWERED = {"no-answer", "busy", "failed", "canceled", "cancelled", "balance-low", "error"}
ENDED = {"completed", "call-disconnected", "stopped"}


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


@app.get("/api/config")
def config():
    return {"org": ORG}


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


@app.get("/admin/agent")
def agent_config(token: str | None = None):
    """What Bolna actually stored for the agent: shows whether the hang-up settings were accepted."""
    admin(token)
    out = bolna_call("GET", f"/v2/agent/{os.environ.get('BOLNA_AGENT_ID', '')}")
    if not isinstance(out, dict):
        return out
    task = ((out.get("agent_config") or out).get("tasks") or [{}])[0]
    tools = task.get("tools_config") or {}
    keys = ("hangup_after_LLMCall", "call_cancellation_prompt", "call_hangup_message", "dtmf_enabled", "call_terminate", "incremental_delay")
    return {"welcome": (out.get("agent_config") or out).get("agent_welcome_message"),
            "task_config": {k: (task.get("task_config") or {}).get(k) for k in keys},
            "multilingual": tools.get("multilingual_config"), "tools": [t.get("name") for t in (tools.get("api_tools") or {}).get("tools", [])],
            "raw_keys": sorted(out)}


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
    phone = check_phone(b.get("phone"))
    c = new_case(f"call-{datetime.now():%m%d-%H%M%S}", caller_phone=phone, mode="helpline")
    log(c, "caller asked for a call back; Saathi calling")
    return place_call(c, {"opening": bolna.HELPLINE_OPENING, "call_context": bolna.HELPLINE_CONTEXT})


def check_phone(raw: str | None) -> str:
    phone = re.sub(r"[^\d+]", "", raw or "")
    if not re.fullmatch(r"\+91\d{10}", phone):
        raise HTTPException(400, "Use an Indian mobile in the form +91XXXXXXXXXX")
    if not os.environ.get("BOLNA_AGENT_ID"):
        raise HTTPException(500, "BOLNA_AGENT_ID is not set yet")
    return phone


def place_call(c: dict, user_data: dict):
    """Ask Bolna to dial the case's number; user_data fills {opening} and {call_context} in the agent."""
    out = bolna_call("POST", "/call", {"agent_id": os.environ["BOLNA_AGENT_ID"], "recipient_phone_number": c["caller_phone"],
                                       "user_data": user_data})
    if isinstance(out, dict):
        c["execution_id"] = out.get("execution_id") or out.get("id")
    else:
        c["status"] = "call_failed"
        log(c, "call could not be placed")
    save()
    return out


def alert_case(phone: str, name: str, amount, payee: str) -> tuple[dict, dict]:
    """Open the case for a flagged debit and build the user_data Saathi's alert call opens with."""
    try:
        amount = float(str(amount).replace(",", ""))
    except ValueError:
        raise HTTPException(400, "amount must be a number")
    name = (name or "").strip()[:40] or "customer"
    payee = (payee or "").strip()[:60] or "an unknown UPI ID"
    at = datetime.now()
    utr = f"9999{at:%d%H%M%S}"  # mock bank-side UTR; the 9999 prefix marks it as fake
    alert = {"name": name, "amount_inr": amount, "payee": payee, "debit_at": at.isoformat(timespec="seconds"), "utr": utr, "answer": None}
    c = new_case(f"alert-{at:%m%d-%H%M%S}", caller_phone=phone, mode="alert", status="alert_calling", alert=alert,
                 consent=None, complaint={"suspect_vpa_or_account": payee},
                 transactions=[{"amount_inr": amount, "mode": "UPI", "utr_or_ref": utr, "app": ORG, "bank": ORG,
                                "datetime": f"{at:%Y-%m-%d %H:%M}", "utr_issue": None}])
    log(c, f"debit of Rs {amount:,.0f} to {payee} flagged as suspicious; Saathi calling the customer")
    # the customer picks the language first; the prompt then tells them about the payment in that language
    opening = f"Namaste {name}, main Saathi hoon, {ORG} ki fraud team se, aapke account ki ek payment ke baare mein. {bolna.LANGUAGE_MENU}"
    context = (f"an alert call from {ORG}'s fraud team. The customer, {name}, was just debited Rs {amount:,.0f} by UPI to {payee} "
               f"at {at:%H:%M} today from their {ORG} account, and the payment was flagged as suspicious. The bank already has this "
               f"debit's amount, time and transaction number: never ask the customer for them. If there were other debits, those are separate "
               f"and are the only ones to collect details for.")
    return c, {"opening": opening, "call_context": context}


@app.post("/api/alert-call")
async def alert_call(req: Request):
    """Demo of the fintech flow: the fraud team flags a debit and Saathi calls the customer to ask "was this you?"."""
    b = await req.json()
    admin(b.get("token"))
    phone = check_phone(b.get("phone"))
    c, user_data = alert_case(phone, b.get("name"), b.get("amount"), b.get("payee"))
    # place the call; place_call returns the Bolna response dict on success, a JSONResponse on
    # failure — so don't embed that object here, just report what the case knows
    out = place_call(c, user_data)
    placed = isinstance(out, dict)
    return {"case_id": c["id"], "status": c.get("status"), "placed": placed,
            "execution_id": c.get("execution_id"), "caller": c.get("caller_phone")}


@app.get("/bridge")
def bridge_page():
    return FileResponse(HERE / "static" / "bridge.html")


@app.post("/api/bridge")
async def bridge(req: Request):
    """Voice test without a phone: mint a web-call session for Saathi (this server's Bolna account) and one for the
    caller bot (its own account, key sent by the bridge page and not stored), for one scenario in caller_bot.SCENARIOS."""
    b = await req.json()
    admin(b.get("token"))
    sc = caller_bot.SCENARIOS.get(b.get("scenario"))
    if not sc or not b.get("botkey"):
        raise HTTPException(400, f"need botkey and scenario, one of {', '.join(caller_bot.SCENARIOS)}")
    bots = json.loads(caller_bot.ID_FILE.read_text())
    try:
        bot = caller_bot.req("POST", "/web-call/session", {"agent_id": bots[sc["lang"]], "user_data": {"persona": sc["persona"]}}, key=b["botkey"])
    except urllib.error.HTTPError as e:
        return JSONResponse({"bolna_status": e.code, "bolna_error": e.read().decode(errors="replace"), "side": "bot"}, status_code=502)
    c, user_data = alert_case("web test", sc["name"], sc["amount"], sc["payee"])
    saathi = bolna_call("POST", "/web-call/session", {"agent_id": os.environ["BOLNA_AGENT_ID"], "user_data": user_data})
    if not isinstance(saathi, dict):
        c["status"] = "call_failed"
        save()
        return saathi
    c["execution_id"] = saathi.get("run_id")
    log(c, f"bridge test with the caller bot ({b['scenario']})")
    save()
    return {"case_id": c["id"], "saathi": saathi, "bot": bot}


# Auto mode: the bridge page, left open in a browser, polls for runs queued here and reports what it is doing,
# so test runs can be started and watched without anyone at the laptop.
bridge_queue: list[str] = []
bridge_page_status: dict = {}


@app.post("/api/bridge/queue")
async def bridge_enqueue(req: Request):
    b = await req.json()
    admin(b.get("token"))
    if b.get("scenario") not in caller_bot.SCENARIOS:
        raise HTTPException(400, f"scenario must be one of {', '.join(caller_bot.SCENARIOS)}")
    bridge_queue.append(b["scenario"])
    return {"queued": list(bridge_queue), "page": bridge_page_status}


@app.post("/api/bridge/next")
async def bridge_next(req: Request):
    """The page's poll: report its state, and take the next queued run if it is free."""
    b = await req.json()
    admin(b.get("token"))
    bridge_page_status.update(state=b.get("state"), log=(b.get("log") or "")[-3000:], at=now())
    return {"scenario": bridge_queue.pop(0) if bridge_queue and b.get("state") == "idle" else None}


@app.get("/api/bridge/status")
def bridge_status(token: str | None = None):
    admin(token)
    return {"queued": bridge_queue, "page": bridge_page_status}


@app.get("/api/cases/{cid}/audit")
def audit(cid: str):
    """Everything that happened on a case, with timestamps, as a file the bank's compliance team can keep."""
    if cid not in cases:
        raise HTTPException(404)
    c = cases[cid]
    keep = ("id", "mode", "created_at", "submitted_at", "status", "caller_phone", "execution_id", "alert", "consent",
            "transactions", "complaint", "sms", "bank_actions", "events")
    body = {"exported_at": now(), "organisation": ORG, **{k: c.get(k) for k in keep}, "priority": priority(c)}
    return JSONResponse(body, headers={"Content-Disposition": f'attachment; filename="saathi-audit-{cid}.json"'})


@app.get("/call")
def call_page():
    return FileResponse(HERE / "static" / "call.html")


@app.get("/admin/simulate")
def start_simulation(token: str | None = None, ids: str = ""):
    """Run text simulations of the synthetic callers (all, or ?ids=V01,V08). Needs LLM_API_KEY or OPENAI_API_KEY on the server."""
    if not TOKEN or token != TOKEN:
        raise HTTPException(401, "bad token")
    if not (os.environ.get("LLM_API_KEY") or os.environ.get("OPENAI_API_KEY")):
        raise HTTPException(500, "LLM_API_KEY is not set on the server")
    rid = simulate.start([i.strip() for i in ids.split(",") if i.strip()], f"http://127.0.0.1:{os.environ.get('PORT', '8000')}", TOKEN)
    return HTMLResponse(f'<meta http-equiv="refresh" content="0;url=/admin/sim/{rid}?token={escape(token)}">')


@app.get("/admin/llm-check")
def llm_check(token: str | None = None):
    """Check the simulator's LLM settings: list the provider's models and send a one-word test to each configured model."""
    if not TOKEN or token != TOKEN:
        raise HTTPException(401, "bad token")
    out = {"base_url": simulate.BASE_URL, "key_set": bool(os.environ.get("LLM_API_KEY") or os.environ.get("OPENAI_API_KEY"))}
    try:
        key = os.environ.get("LLM_API_KEY") or os.environ.get("OPENAI_API_KEY", "")
        r = urllib.request.Request(simulate.BASE_URL + "/models", headers={"Authorization": f"Bearer {key}", "User-Agent": "saathi-1930-sim/1.0"})
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read()
            ctype = resp.headers.get("Content-Type", "")
        try:
            out["models_available"] = sorted(m.get("id") for m in json.loads(raw).get("data", []))
        except ValueError:  # not JSON: show what the provider actually sent back
            out["models_available"] = {"status": resp.status, "content_type": ctype, "body_start": raw[:400].decode(errors="replace")}
    except Exception as e:
        out["models_available"] = f"error: {e!r}"
    for role, model in (("agent", simulate.AGENT_MODEL), ("victim", simulate.VICTIM_MODEL), ("judge", simulate.JUDGE_MODEL)):
        try:
            reply = simulate.chat(model, [{"role": "user", "content": "Reply with the single word: ok"}])
            out[role] = {"model": model, "ok": True, "reply": (reply.get("content") or "")[:40]}
        except urllib.error.HTTPError as e:
            out[role] = {"model": model, "ok": False, "error": f"{e.code} {e.read().decode(errors='replace')[:300]}"}
        except Exception as e:
            out[role] = {"model": model, "ok": False, "error": repr(e)}
    return out


@app.get("/admin/sim/{rid}")
def simulation_report(rid: str, token: str | None = None):
    if not TOKEN or token != TOKEN:
        raise HTTPException(401, "bad token")
    run = simulate.runs.get(rid)
    if not run:
        raise HTTPException(404, "no such run (runs are lost when the server restarts)")
    res = run["results"]
    rows = "".join(
        f"<tr><td>{escape(r['id'])}</td><td>{escape(r['fraud_type'])}</td>"
        f"<td><span class='pill {'ok' if r.get('passed') else 'bad'}'>{'pass' if r.get('passed') else 'fail'}</span></td>"
        f"<td>{escape(str(r.get('utrs', '')))}</td><td>{'✓' if r.get('route_ok') else '✗'}</td>"
        f"<td>{'✗' if r.get('asked_for_secret') or r.get('promised_refund') else '✓'}</td>"
        f"<td>{'✓' if r.get('handled_special') else '✗'}</td><td>{'✗' if r.get('cut_caller_off') else '✓'}</td>"
        f"<td>{escape(r.get('note') or r.get('error') or '')}"
        + (f"<details><summary>transcript</summary>{''.join(f'<p><b>{escape(w)}:</b> {escape(t)}</p>' for w, t in r['transcript'])}</details>" if r.get('transcript') else "")
        + "</td></tr>" for r in res)
    passed = sum(1 for r in res if r.get("passed"))
    refresh = '<meta http-equiv="refresh" content="10">' if run["status"] == "running" else ""
    return HTMLResponse(f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">{refresh}
<title>Simulation {escape(rid)}</title><link rel="stylesheet" href="/static/style.css"></head><body>
<header><h1>Simulated test calls · {escape(rid)}</h1><span>{escape(run['status'])}: {len(res)}/{run['total']} done · {passed} passed</span></header>
<main><div class="card" style="overflow-x:auto"><table><thead><tr><th>Caller</th><th>Type</th><th>Result</th><th>UTRs</th><th>Route</th><th>Safety</th><th>Special case</th><th>Let caller finish</th><th>Notes</th></tr></thead>
<tbody>{rows}</tbody></table></div></main></body></html>""")


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
