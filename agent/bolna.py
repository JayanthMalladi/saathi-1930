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


def req(method, path, body=None):
    r = urllib.request.Request(API + path, method=method,
                               data=json.dumps(body).encode() if body is not None else None,
                               headers={"Authorization": f"Bearer {os.environ['BOLNA_API_KEY']}",
                                        "Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read() or "{}")


def tool(name, description, props, required, path, pre_call=None):
    backend = os.environ.get("BACKEND_URL", "https://<backend>").rstrip("/")
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
]


def agent_payload():
    backend = os.environ.get("BACKEND_URL", "https://<backend>").rstrip("/")
    return {
        "agent_config": {
            "agent_name": "Saathi 1930",
            "agent_welcome_message": "Namaste, main Saathi hoon, ek AI helper. Aap safe hain. Kya aapke saath abhi koi online fraud hua hai?",
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
                    "transcriber": {"provider": "sarvam", "model": "saaras:v4", "language": "hi", "stream": True, "endpointing": 500},
                    "synthesizer": {"provider": "sarvam", "stream": True, "buffer_size": 150,
                                    "provider_config": {"voice": "Priya", "voice_id": "priya", "model": "bulbul:v3", "language": "hi", "speed": 1.0}},
                    "input": {"provider": "plivo", "format": "wav"},
                    "output": {"provider": "plivo", "format": "wav"},
                    "api_tools": {"tools": [{k: v for k, v in t.items() if k != "value"} | {"key": t["key"]} for t in TOOLS],
                                  "tools_params": {t["name"]: t["value"] for t in TOOLS}},
                },
                "task_config": {"call_terminate": 480, "hangup_after_silence": 20},
            }],
        },
        "agent_prompts": {"task_1": {"system_prompt": (HERE / "system_prompt.txt").read_text(encoding="utf-8")}},
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
        print(req("POST", "/call", {"agent_id": ID_FILE.read_text().strip(), "recipient_phone_number": sys.argv[2]}))
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
