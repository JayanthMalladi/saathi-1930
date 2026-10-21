"""Create or update the Saathi 1930 agent on Bolna, place test calls, and fetch results.

Uses only the standard library. Needs BOLNA_API_KEY; BACKEND_URL (public https URL of app/)
and BACKEND_TOKEN (same value the backend runs with) for the tool calls.

    python agent/bolna.py agent --dry-run     # print the payload, spend nothing
    python agent/bolna.py agent               # create (first time) or update the agent
    python agent/bolna.py call +9198XXXXXXXX  # outbound test call to your own phone
    python agent/bolna.py result <execution_id>
    python agent/bolna.py me                  # wallet balance
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
API = "https://api.bolna.ai"
ID_FILE = HERE / "agent_id.txt"


def backend_url():
    return (os.environ.get("BACKEND_URL") or os.environ.get("RENDER_EXTERNAL_URL") or "https://<backend>").rstrip("/")


def req(method, path, body=None):
    r = urllib.request.Request(API + path, method=method,
                               data=json.dumps(body).encode() if body is not None else None,
                               headers={"Authorization": f"Bearer {os.environ['BOLNA_API_KEY']}",
                                        "Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read() or "{}")


def tool(name, description, props, required, path, pre_call=None):
    backend = backend_url()
    t = {
        "name": name,
        "description": description,
        "parameters": {"type": "object", "properties": props, "required": required},
        "key": "custom_task",
        "value": {
            "method": "POST",
            "url": backend + path,
            "api_token": f"Bearer {os.environ.get('BACKEND_TOKEN', '')}",
            "headers": {"Content-Type": "application/json"},
            # call id is not passed: Bolna's docs don't confirm system variables in params,
            # so the backend attaches tool calls to the call that is currently in progress
            "param": {k: f"%({k})s" for k in props},
        },
    }
    if pre_call:
        t["pre_call_message"] = pre_call
    return t


S = {"type": "string"}
TOOLS = [
    tool("record_consent",
         "Call once the caller agrees that their details can be noted and shared with the cyber cell and their bank.",
         {"caller_name": S, "is_account_holder": {"type": "boolean"},
          "account_holder_name": {"type": "string", "description": "Only if the caller is calling for someone else"}},
         ["caller_name", "is_account_holder"], "/api/consent"),
    tool("add_transaction",
         "Call after the caller confirms one fraudulent debit: amount, UTR or transaction ID, app, bank and time. Call once per debit.",
         {"amount_inr": {"type": "number"}, "utr_or_ref": S,
          "mode": {"type": "string", "enum": ["UPI", "IMPS", "NEFT", "Card", "Wallet", "Other"]},
          "app": S, "bank": S, "datetime": {"type": "string", "description": "YYYY-MM-DD HH:MM"}},
         ["amount_inr", "mode", "bank"], "/api/transaction"),
    tool("submit_case",
         "Call when all details are collected and the caller has confirmed the read-back summary.",
         {"mobile": S, "fraud_type": S, "incident_datetime": S, "description": S,
          "suspect_phone": S, "suspect_vpa_or_account": S, "language": S},
         ["fraud_type", "description"], "/api/submit"),
]

# Every call is placed with user_data filling these (see app/main.py): {opening} is the first line Saathi says,
# {call_context} tells the prompt whether this is a helpline callback or a suspicious-debit alert.
HELPLINE_CONTEXT = "a helpline callback: the caller asked Saathi to call them about a fraud."

# Every call opens by asking which language the caller wants. Answering that question counts as a request in
# Bolna's "caller_requested" mode, so Bolna itself switches voice, listener and prompt; the prompts hold no
# switching instructions (Bolna's docs say not to add them).
LANGUAGE_MENU = "Aap Hindi mein baat karna chahenge, ya English mein?"
HELPLINE_OPENING = f"Namaste, main Saathi hoon, online fraud mein madad ke liye ek AI helper. {LANGUAGE_MENU}"
LANGS = {
    "hi": {"rule": "Speak Hinglish: everyday Hindi in Roman script, with common English words.",
           "question": "Kya yeh payment aapne khud kiya tha, haan ya nahi?",
           "closing": "Theek hai, dhanyavaad. Kabhi bhi kisi ko OTP ya PIN mat batayiye.",
           "goodbye": "Apna dhyan rakhiye. Namaste.", "listen": "haan"},
    "en": {"rule": "Speak simple Indian English.",
           "question": "Did you make this payment yourself, yes or no?",
           "closing": "Okay, thank you. Never share your OTP or PIN with anyone.",
           "goodbye": "Take care. Goodbye.", "listen": "okay"},
}


def prompt_for(lang: str) -> str:
    L = LANGS[lang]
    return ((HERE / "system_prompt.txt").read_text(encoding="utf-8").replace("LANGUAGE_RULE", L["rule"])
            .replace("PAYMENT_QUESTION", L["question"]).replace("CLOSING_LINE", L["closing"]).replace("LISTEN_WORD", L["listen"]))


def transcriber(lang):
    return {"provider": "sarvam", "model": "saaras:v4", "language": lang, "stream": True, "endpointing": 1200}


def synthesizer(lang):
    return {"provider": "sarvam", "stream": True, "buffer_size": 150,
            "provider_config": {"voice": "Priya", "voice_id": "priya", "model": "bulbul:v3", "language": lang, "speed": 1.0}}


def agent_payload():
    backend = backend_url()
    return {
        "agent_config": {
            "agent_name": "Saathi 1930",
            "agent_welcome_message": "{opening}",
            "webhook_url": backend + "/api/bolna/webhook",
            "tasks": [{
                "task_type": "conversation",
                "toolchain": {"execution": "parallel", "pipelines": [["transcriber", "llm", "synthesizer"]]},
                "tools_config": {
                    "llm_agent": {
                        "agent_type": "simple_llm_agent",
                        "agent_flow_type": "streaming",
                        "llm_config": {"provider": "openai", "model": "gpt-4.1-mini", "max_tokens": 200, "temperature": 0.2},
                    },
                    # Sarvam STT/TTS are in Bolna's flat per-minute rate; Kalpa is not listed there
                    "transcriber": transcriber("hi"),
                    "synthesizer": synthesizer("hi"),
                    "multilingual_config": {
                        "enabled": True, "active_language": "hi", "language_switch_trigger": "caller_requested",
                        "languages": {k: {"transcriber": transcriber(k), "synthesizer": synthesizer(k), "system_prompt": prompt_for(k)} for k in LANGS},
                    },
                    "input": {"provider": "plivo", "format": "wav"},
                    "output": {"provider": "plivo", "format": "wav"},
                    "api_tools": {"tools": [{k: v for k, v in t.items() if k != "value"} | {"key": t["key"]} for t in TOOLS],
                                  "tools_params": {t["name"]: t["value"] for t in TOOLS}},
                },
                # callers pause mid-story and while reading UTRs: the transcriber waits 1.2 s of silence (endpointing) plus a 1.2 s delay before replying,
                # and treat a 1-word sound ("haan", "hmm") as backchannel, not an interruption
                # silence hang-up (12 s) comes before the "are you still there?" check (15 s), so a call
                # that missed its hang-up still ends shortly after the goodbye
                "task_config": {"call_terminate": 480, "hangup_after_silence": 12, "check_if_user_online": True,
                                "trigger_user_online_message_after": 15, "incremental_delay": 1200,
                                # 1 word: a caller reading digits ("8885") must be able to cut in
                                "number_of_words_for_interruption": 1,
                                # backchanneling spoke Hindi fillers ("main sun rahi hoon") over English callers' pauses
                                "backchanneling": False,
                                # "hang up using a prompt": the model ends the call with Bolna's end-call tool, so the
                                # turn that ends a call must not also call one of our tools (that turn never hung up)
                                "hangup_after_LLMCall": True,
                                "call_cancellation_prompt": (
                                    "A conversation is considered complete if any of the following conditions are met:\n"
                                    "1. On an alert call, the customer said they made the flagged payment themselves and the assistant "
                                    "has thanked them and reminded them not to share their OTP or PIN.\n"
                                    "2. The assistant has given the next steps and the caller has no more questions, or says bye, thank you or ok.\n"
                                    "3. The call is a prank or not about fraud, and the assistant has closed it politely."),
                                # the goodbye is Bolna's hang-up message (per language); the prompt doesn't say its own
                                "call_hangup_message": {k: v["goodbye"] for k, v in LANGS.items()}, "dtmf_enabled": False},
            }],
        },
        "agent_prompts": {"task_1": {"system_prompt": prompt_for("hi")}},
    }


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "agent":
        body = agent_payload()
        if "--dry-run" in sys.argv:
            print(json.dumps(body, indent=1, ensure_ascii=False))
            return
        if ID_FILE.exists():
            aid = ID_FILE.read_text().strip()
            print(req("PUT", f"/v2/agent/{aid}", body))
        else:
            out = req("POST", "/v2/agent", body)
            ID_FILE.write_text(out["agent_id"])
            print(out)
    elif cmd == "call":
        print(req("POST", "/call", {"agent_id": ID_FILE.read_text().strip(), "recipient_phone_number": sys.argv[2],
                                    "user_data": {"opening": HELPLINE_OPENING, "call_context": HELPLINE_CONTEXT}}))
    elif cmd == "result":
        e = req("GET", f"/executions/{sys.argv[2]}")
        print(json.dumps({k: e.get(k) for k in ("status", "conversation_duration", "total_cost", "transcript", "extracted_data")},
                         indent=1, ensure_ascii=False))
    elif cmd == "me":
        print(req("GET", "/user/me"))
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
