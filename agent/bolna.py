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
         ["caller_name", "is_account_holder"], "/api/consent", "Theek hai, note kar rahi hoon."),
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
         ["fraud_type", "description"], "/api/submit", "Ek second, aapki complaint tayyar kar rahi hoon."),
    tool("confirm_alert",
         "Alert calls only: call once the customer says whether they made the flagged payment themselves.",
         {"customer_made_payment": {"type": "boolean"},
          "note": {"type": "string", "description": "What the customer said, in a few words"}},
         ["customer_made_payment"], "/api/alert-answer"),
]

# Every call is placed with user_data filling these (see app/main.py): {opening} is the first line Saathi says,
# {call_context} tells the prompt whether this is a helpline callback or a suspicious-debit alert.
HELPLINE_CONTEXT = "a helpline callback: the caller asked Saathi to call them about a fraud."

# Languages the caller can pick before the call. Each gets its own transcriber, voice and prompt line;
# the call starts in the picked one (agent_data.language) and the agent can still switch if the caller asks.
LANGS = {
    "hi": {"name": "Hindi",
           "rule": 'Speak Hinglish (everyday Hindi in Roman script, with common English words) for the whole call. Short replies like "haan", "ha", "ok" or "yes" are not a language change: keep speaking Hindi. Switch to English only if the caller asks for it or keeps speaking full English sentences.',
           "helpline_opening": "Namaste, main Saathi hoon, ek AI helper. Aap safe hain. Kya aapke saath abhi koi online fraud hua hai?"},
    "en": {"name": "English",
           "rule": "Speak simple Indian English for the whole call. Switch to Hindi only if the caller asks for it or keeps speaking full Hindi sentences.",
           "helpline_opening": "Hello, I'm Saathi, an AI helper. You're safe now. Has an online fraud just happened to you?"},
}
HELPLINE_OPENING = LANGS["hi"]["helpline_opening"]
# when the language isn't known before the call, the first line asks for it (by voice: keypad input didn't reach the agent)
LANGUAGE_MENU = "Aap Hindi mein baat karna chahenge, ya English mein?"


def prompt_for(lang: str) -> str:
    return (HERE / "system_prompt.txt").read_text(encoding="utf-8").replace("LANGUAGE_RULE", LANGS[lang]["rule"])


def transcriber(lang):
    return {"provider": "sarvam", "model": "saaras:v4", "language": lang, "stream": True, "endpointing": 700}


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
                        "enabled": True, "active_language": "hi",
                        "languages": {k: {"transcriber": transcriber(k), "synthesizer": synthesizer(k), "system_prompt": prompt_for(k)} for k in LANGS},
                        # Bolna's default also switches on auto-detected language, which flipped to English on a bare "haa"
                        "language_switch_trigger": "caller_requested",
                        "switch_tool_description": "Switch language only when the caller asks for another language or keeps speaking full sentences in it. Never switch because of a short reply like haan, ha, ok or yes.",
                    },
                    "input": {"provider": "plivo", "format": "wav"},
                    "output": {"provider": "plivo", "format": "wav"},
                    "api_tools": {"tools": [{k: v for k, v in t.items() if k != "value"} | {"key": t["key"]} for t in TOOLS],
                                  "tools_params": {t["name"]: t["value"] for t in TOOLS}},
                },
                # callers pause mid-story and while reading UTRs: wait ~1.2 s of silence before replying,
                # and treat a 1-word sound ("haan", "hmm") as backchannel, not an interruption
                "task_config": {"call_terminate": 480, "hangup_after_silence": 20, "incremental_delay": 1200,
                                "number_of_words_for_interruption": 2, "backchanneling": True,
                                # let the LLM end the call once the conversation is over
                                "hangup_after_LLMCall": True,
                                "call_cancellation_prompt": "End the call if Saathi has said goodbye, or the customer confirmed they made the flagged payment and was thanked, or the next steps were given and the caller has no more questions, or it was a prank call that Saathi closed.",
                                # the prompt already says goodbye; a hang-up message on top made it say goodbye twice
                                "call_hangup_message": None, "dtmf_enabled": False},
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
                                    "user_data": {"opening": HELPLINE_OPENING, "call_context": HELPLINE_CONTEXT}, "agent_data": {"language": "hi"}}))
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
