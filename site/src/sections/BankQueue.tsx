import { motion } from "framer-motion";
import { Building2, Inbox, Flag, Check, X } from "lucide-react";

type Row = {
  name: string;
  status: "in_call" | "ready" | "genuine" | "no_answer";
  answer: "yes" | "no" | null;
  total: number;
  window: string;
  debits: number;
  utrs: number;
  bad: number;
};

const ROWS: Row[] = [
  { name: "Rohit · 27 · Hyderabad", status: "in_call", answer: "no", total: 28000, window: "within 3 working days", debits: 2, utrs: 2, bad: 0 },
  { name: "Kamla Devi · 71 · Patna", status: "ready", answer: null, total: 11500, window: "within 3 working days", debits: 1, utrs: 1, bad: 1 },
  { name: "Suresh · 45 · Bengaluru", status: "ready", answer: null, total: 250000, window: "4 to 7 working days", debits: 3, utrs: 3, bad: 0 },
  { name: "Priya · 31 · Bengaluru", status: "genuine", answer: "yes", total: 2500, window: "—", debits: 1, utrs: 1, bad: 0 },
  { name: "Imran · 38 · Hyderabad", status: "no_answer", answer: null, total: 27750, window: "within 3 working days", debits: 1, utrs: 1, bad: 0 },
];

const STATUS: Record<Row["status"], [string, string, string]> = {
  in_call: ["● On call", "pill--warn dot-live", "relative"],
  ready: ["Case ready", "pill--ok", "relative"],
  genuine: ["Genuine · cleared", "pill--ok", "relative"],
  no_answer: ["No answer", "pill--bad", "relative"],
};

export default function BankQueue() {
  return (
    <section id="queue" className="relative mx-auto max-w-6xl px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mb-10 max-w-2xl"
      >
        <span className="tag">03 · THE BANK'S SIDE</span>
        <h2 className="font-display mt-4 text-3xl font-bold sm:text-4xl">
          Cases land in a fraud-ops queue, ranked by money at stake × freshness.
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          The mock "Demo Wallet" ops desk, shown with sample rows (not live data). Every Saathi case arrives structured, with the RBI window pre-computed, so
          the fraud team knows exactly which debit needs a dispute filed first.
        </p>
      </motion.div>

      <div className="surface overflow-hidden rounded-3xl">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl" style={{ background: "var(--glow-soft)", color: "var(--accent)" }}>
              <Building2 size={20} />
            </div>
            <div>
              <p className="font-display text-[15px] font-bold">Demo Wallet · Fraud Ops <span className="text-muted">(mock)</span></p>
              <p className="text-[12px] text-muted">ranked by ₹ at stake × how fresh the fraud is</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <Inbox size={15} /> sample data · 5 cases
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">"Was this you?"</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium">RBI window</th>
                <th className="p-4 font-medium">UTRs</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => {
                const st = STATUS[r.status];
                const winTone = r.window === "within 3 working days" ? "pill--ok" : r.window === "4 to 7 working days" ? "pill--warn" : "";
                return (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.45, delay: i * 0.08 }}
                    className="border-t"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <td className="p-4">
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-[11px] text-muted">{r.debits} debit{r.debits === 1 ? "" : "s"} · {r.status.replace("_", " ")}</p>
                    </td>
                    <td className="p-4">
                      <span className={`pill ${st[1]}`}>
                        {st[0].includes("●") && <span className="relative z-10 mr-1 inline-block size-1.5 rounded-full" style={{ background: "currentColor" }} />}
                        {st[0].replace("● ", "")}
                      </span>
                    </td>
                    <td className="p-4">
                      {r.answer === "yes" ? (
                        <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: "var(--ok)" }}><Check size={14} /> yes, it was me</span>
                      ) : r.answer === "no" ? (
                        <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: "var(--bad)" }}><X size={14} /> no, not me</span>
                      ) : (
                        <span className="text-[12px] text-muted">—</span>
                      )}
                    </td>
                    <td className="p-4 font-semibold mono">₹{r.total.toLocaleString("en-IN")}</td>
                    <td className="p-4">
                      {r.window === "—" ? <span className="text-muted">—</span> : <span className={`pill ${winTone}`}>{r.window}</span>}
                    </td>
                    <td className="p-4">
                      {r.bad > 0 ? (
                        <span className="pill pill--bad">{r.bad} to fix</span>
                      ) : (
                        <span className="pill pill--ok">{r.utrs} ok</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* flag & call mini-flow */}
        <div className="border-t p-5" style={{ borderColor: "var(--line)", background: "var(--surface2)" }}>
          <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
            <Flag size={15} className="accent" /> Flag a suspicious debit → Saathi calls the customer
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
            <span className="surface2 hairline rounded-lg px-3 py-2">Customer name</span>
            <span className="surface2 hairline rounded-lg px-3 py-2">+91 98…</span>
            <span className="surface2 hairline rounded-lg px-3 py-2">₹ amount</span>
            <span className="surface2 hairline rounded-lg px-3 py-2">payee UPI ID</span>
            <span className="btn btn--primary !py-2 !text-[12px]">Flag &amp; call customer</span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="ml-2 text-[12px]"
              style={{ color: "var(--accent)" }}
            >
              → "Saathi is calling the customer now"
            </motion.span>
          </div>
        </div>
      </div>
    </section>
  );
}
