import { PAYMENT_QUESTION, YES_CLOSING } from "../data/callScript";

const STACK = ["Bolna (voice agent + telephony)", "Sarvam saaras (STT)", "Sarvam bulbul (TTS) · voice “Priya”", "gpt-4.1-mini", "FastAPI backend"];
const TOOLS = ["record_consent", "add_transaction", "submit_case"];

// "How it works" is the branch of the call: one question decides it.
export default function HowItWorks() {
  return (
    <section className="sect" id="how">
      <h2 className="h2">How the call works · built on Bolna</h2>
      <p className="h2-sub">One outbound Bolna agent. Three tools. One question decides the branch.</p>

      <div className="flow">
        <div className="fl-q">
          “{PAYMENT_QUESTION.en}”
          <small lang="hi">“{PAYMENT_QUESTION.hi}”</small>
        </div>
        <div className="fl-b">
          <h4 className="c-green">YES → protect</h4>
          <ol>
            <li>“{YES_CLOSING}”</li>
            <li>Call ends. No intake, no tools. The alert is marked genuine in the queue.</li>
          </ol>
        </div>
        <div className="fl-b">
          <h4 className="c-red">NO → intake</h4>
          <ol>
            <li>Safety first: hang up the scammer’s call, close any remote app. “Done?”</li>
            <li>
              “I am an AI helper, not police or bank.” Consent → <code>record_consent</code>
            </li>
            <li>
              Any other debits; each 12-digit UTR read 4 digits at a time and read back → <code>add_transaction</code>
            </li>
            <li>How the scammer got in, and the fix; the scammer’s phone (5 digits at a time) or UPI ID.</li>
            <li>
              Short summary read back → <code>submit_case</code> → the bank’s fraud-ops queue.
            </li>
            <li>Next steps: call 1930 or file at cybercrime.gov.in, tell the bank in writing today, keep every screenshot and chat.</li>
          </ol>
        </div>
      </div>
      <div className="never">
        <div>
          <b>✕</b> never asks for OTP / PIN
        </div>
        <div>
          <b>✕</b> never promises a refund
        </div>
        <div>
          <b>✕</b> never files with 1930 itself
        </div>
        <div>
          <b>✕</b> never claims to send an SMS
        </div>
      </div>

      <div className="stack" aria-label="Built on Bolna">
        <span className="h2" style={{ margin: 0 }}>
          Built on
        </span>
        <div className="chips">
          {STACK.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <span className="h2" style={{ margin: 0 }}>
          Tools
        </span>
        <div className="chips">
          {TOOLS.map((t) => (
            <span key={t} className="tl">
              {t}()
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
