import Transcript from "../components/Transcript";
import Receipt from "../components/Receipt";
import { useCallEngine } from "../engine/CallEngine";

export default function TheCall() {
  const { recording } = useCallEngine();
  return (
    <section className="record" id="record">
      <div className="min-w-0">
        <h2 className="h2">Call record</h2>
        <p className="h2-sub">
          {recording
            ? "Transcript of the recorded call. Timestamps jump the audio."
            : "The call script, line by line, on a simulated clock. Timestamps jump the replay."}{" "}
          Saathi’s lines follow the real Bolna call flow; names and numbers are synthetic.
        </p>
        <Transcript />
      </div>
      <div className="rcpt-wrap">
        <h2 className="h2">Complaint draft</h2>
        <p className="h2-sub">Prints as Saathi hears it. The customer still calls 1930.</p>
        <Receipt />
      </div>
    </section>
  );
}
