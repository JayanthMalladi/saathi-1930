import { fmt, useCallEngine } from "../engine/CallEngine";
import { beatIndex } from "../data/callScript";

type Row = {
  when: string;
  name: string;
  meta: string;
  out: "live" | "no" | "yes" | "miss";
  outText: string;
  total: number;
  window: string;
  /** share of the RBI window used up, for the bar (0..100) */
  used: number;
  top?: boolean;
};

// Sample rows, not live data. The real queue is the backend's /bank page.
const ROWS: Row[] = [
  { when: "yest · 4:02", name: "Kamla Devi · 71 · Patna", meta: "Hindi · 1 debit · 1 UTR to re-check", out: "no", outText: "No · draft ready", total: 11500, window: "within 3 working days", used: 55 },
  { when: "mon · 5:40", name: "Suresh · 45 · Bengaluru", meta: "3 debits · 3 UTRs read back", out: "no", outText: "No · draft ready", total: 250000, window: "4 to 7 working days", used: 100 },
  { when: "13:20 · 0:48", name: "Priya · 31 · Bengaluru", meta: "1 debit", out: "yes", outText: "Yes · OTP/PIN reminder, cleared", total: 2500, window: "—", used: 0 },
  { when: "14:41 · —", name: "Imran · 38 · Hyderabad", meta: "1 debit", out: "miss", outText: "No answer", total: 27750, window: "within 3 working days", used: 14 },
];

// The bank's fraud-ops queue as a call log. Rohit's row follows the replay above.
export default function BankQueue() {
  const { idx, form, hasPlayed, playing, total } = useCallEngine();
  const saidNo = idx >= beatIndex("no");
  const twoDebits = idx >= beatIndex("other-debits-ok");
  const rohit: Row = {
    when: form.submitted ? `14:56 · ${fmt(total)}` : "14:56 · on call",
    name: "Rohit · 27 · Hyderabad",
    meta: !twoDebits ? "1 debit, on file from the alert" : `2 debits · ${idx >= beatIndex("utr-3-echo") ? "2nd UTR read back ✓" : "2nd UTR being read"}`,
    out: form.submitted ? "no" : "live",
    outText: form.submitted ? "No · draft DW-0412 ready" : saidNo ? "On call · said “not me”" : "On call · asking",
    total: twoDebits ? 28000 : 18000,
    window: "within 3 working days",
    used: 8,
    top: true,
  };

  const rows = [rohit, ...ROWS];

  return (
    <section className="sect" id="queue">
      <h2 className="h2">After the call: the bank’s queue</h2>
      <p className="h2-sub">
        Demo Wallet fraud ops sees every Saathi call as a log line with the RBI window worked out. Sample data, not
        live: Rohit’s row follows the replay{hasPlayed && playing ? " as it plays" : ""}; the others are made up. The
        live queue is the backend’s <span className="c-green">/bank</span> page.
      </p>
      <div className="log">
        <div className="lg hdr">
          <span>Called</span>
          <span>Customer</span>
          <span>“Was this you?”</span>
          <span style={{ textAlign: "right" }}>At stake</span>
          <span>RBI window</span>
        </div>
        {rows.map((r) => (
          <div key={r.name} className={`lg${r.top ? " top1" : ""}`}>
            <span className="when">{r.when}</span>
            <span className="nm">
              <b>{r.name}</b>
              <small>{r.meta}</small>
            </span>
            <span className={`out o-${r.out}`}>{r.outText}</span>
            <span className="amt">₹{r.total.toLocaleString("en-IN")}</span>
            <span className="win">
              {r.window}
              {r.window !== "—" && (
                <span className="win-bar">
                  <i style={{ width: `${r.used}%` }} />
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
