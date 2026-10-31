import Workflow from "../components/Workflow";

const STACK = ["Bolna (voice agent + telephony)", "Sarvam saaras (STT)", "Sarvam bulbul (TTS) · voice “Priya”", "gpt-4.1-mini", "FastAPI backend"];
const TOOLS = ["record_consent", "add_transaction", "submit_case"];

// "How it works" is the call as a live workflow, on the same clock as the recording above.
export default function HowItWorks() {
  return (
    <section className="sect" id="how">
      <h2 className="h2">How the call works · a live workflow</h2>
      <p className="h2-sub">
        One alert, end to end: the bank’s flag, the Bolna call, the branch Rohit’s answer takes, each tool call with the
        payload it sends, and the 1930-ready complaint draft that lands in the bank’s queue. It runs on the same clock as
        the call above: play or scrub either one.
      </p>

      <Workflow />

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
