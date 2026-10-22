"""A Bolna "caller bot" that plays a fraud victim, so Saathi can be tested by voice without a person on the line.

Both agents join as web calls and app/static/bridge.html wires each one's audio into the other's microphone.
The bot lives on its own Bolna account (BOT_API_KEY) so its minutes don't eat Saathi's credit.

    BOT_API_KEY=bn-... python agent/caller_bot.py agents   # create or update the en and hi bots
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
API = "https://api.bolna.ai"
ID_FILE = HERE / "bot_agents.json"  # {"en": agent_id, "hi": agent_id}; ids aren't secret

# Each scenario: the alert Saathi raises (fills /api/alert-call's fields) and who the bot plays.
SCENARIOS = {
    "rohit": {
        "lang": "en", "name": "Rohit", "amount": 18000, "payee": "refund.help@ybl",
        "persona": (
            "You are Rohit, 27, from Hyderabad. A few minutes ago a man calling himself Google Pay customer care made you install AnyDesk "
            "and Rs 18,000 left your Demo Wallet account. You are panicking and talk in short, broken sentences. You did NOT make the payment. "
            "When asked the language, say English. You are still on your other phone with the 'customer care' man until you are told to hang up. "
            "There was also a second debit: Rs 10,000 by Google Pay from your HDFC Bank account at 9:44 pm tonight, transaction number 999988859278. "
            "Read that number in three pieces, one piece per turn: '9999', then '8885', then '9278', waiting for a reply after each. "
            "The scammer's number is 90000 68912. Agree to consent and give your name as Rohit. The number they called is linked to your bank."),
    },
    "sunita": {
        "lang": "hi", "name": "Sunita", "amount": 31000, "payee": "kyc.update@ibl",
        "persona": (
            "Aap Sunita hain, 52 saal, Lucknow se. Ek aadmi ne phone karke kaha ki KYC update karna hai, aur aapne usko OTP bata diya; "
            "uske baad Rs 31,000 aapke Demo Wallet account se chale gaye. Yeh payment aapne NAHI kiya. Bhasha poochhi jaaye to 'Hindi' boliye. "
            "Aap Hinglish mein, chhote aur ghabraaye hue vaakyon mein baat karti hain. Koi aur paisa nahi gaya. "
            "Scammer ka number 90000 31091 hai. Consent ke liye haan boliye, naam Sunita."),
    },
    "priya": {
        "lang": "en", "name": "Priya", "amount": 2500, "payee": "shop@okaxis",
        "persona": (
            "You are Priya. When asked the language, say English. First be a little suspicious ('who is this? do you want my OTP?'), "
            "then remember you paid Rs 2,500 at a new kirana shop today and say yes, you made the payment."),
    },
}

PROMPT = """You are taking part in a phone test as a CALLER, not as an assistant. Someone from a bank's fraud team is calling you.
Play this person, and stay in character the whole call:
{persona}

How to talk:
- You are on a phone call. Say only your own words: one or two short spoken sentences per turn, no lists, no stage directions.
- Let them finish. If what you heard sounds cut off or unfinished, reply only "hmm" and wait.
- Answer only what you were asked. Don't volunteer every detail at once; give details when asked for them.
- Never act like a helper or assistant, never ask "how can I help", and never say you are an AI or a test.
- If they read a number back to you, check it digit by digit against yours and say exactly which part is wrong.
- If they tell you to do something (hang up the other call, uninstall an app), say you have done it.
- Read a number only after they ask for it, and only the next piece.
- Never say goodbye first. Only when they have said goodbye, say a short thanks and goodbye. If they ask "are you still there?", say yes and carry on."""


def req(method, path, body=None, key=None):
    r = urllib.request.Request(API + path, method=method,
                               data=json.dumps(body).encode() if body is not None else None,
                               headers={"Authorization": f"Bearer {key or os.environ['BOT_API_KEY']}",
                                        "Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read() or "{}")


def payload(lang):
    voice = {"provider": "sarvam", "stream": True, "buffer_size": 150,
             "provider_config": {"voice": "Rahul", "voice_id": "rahul", "model": "bulbul:v3", "language": lang, "speed": 1.0}}
    return {
        "agent_config": {
            "agent_name": f"Saathi test caller ({lang})",
            "agent_welcome_message": "Hello?",
            "tasks": [{
                "task_type": "conversation",
                "toolchain": {"execution": "parallel", "pipelines": [["transcriber", "llm", "synthesizer"]]},
                "tools_config": {
                    "llm_agent": {"agent_type": "simple_llm_agent", "agent_flow_type": "streaming",
                                  "llm_config": {"provider": "openai", "model": "gpt-4.1-mini", "max_tokens": 120, "temperature": 0.6}},
                    "transcriber": {"provider": "sarvam", "model": "saaras:v4", "language": lang, "stream": True, "endpointing": 2000},
                    "synthesizer": voice,
                    "input": {"provider": "default", "format": "wav"},
                    "output": {"provider": "default", "format": "wav"},
                    "api_tools": None,
                },
                "task_config": {"call_terminate": 480, "hangup_after_silence": 40, "check_if_user_online": False,
                                "backchanneling": False, "number_of_words_for_interruption": 4, "incremental_delay": 1500,
                                # the bot never hangs up: Saathi ends the call, or the silence timeout does
                                "hangup_after_LLMCall": False},
            }],
        },
        "agent_prompts": {"task_1": {"system_prompt": PROMPT}},
    }


def main():
    if (sys.argv[1:] or [""])[0] != "agents":
        print(__doc__)
        return
    ids = json.loads(ID_FILE.read_text()) if ID_FILE.exists() else {}
    for lang in ("en", "hi"):
        if lang in ids:
            print(lang, req("PUT", f"/v2/agent/{ids[lang]}", payload(lang)))
        else:
            ids[lang] = req("POST", "/v2/agent", payload(lang))["agent_id"]
            print(lang, "created", ids[lang])
    ID_FILE.write_text(json.dumps(ids, indent=1) + "\n")


if __name__ == "__main__":
    main()
