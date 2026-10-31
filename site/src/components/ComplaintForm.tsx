import { motion } from "framer-motion";
import { useCallEngine } from "../engine/CallEngine";
import { BEATS, CALL_META } from "../data/callScript";

// The 1930 complaint filling in LIVE as the call plays.
export default function ComplaintForm() {
  const { form, beat, idx } = useCallEngine();
  const inCall = idx >= 0 && idx < BEATS.length - 1 && !form.submitted;
  return (
    <div className="surface relative overflow-hidden rounded-3xl p-5 sm:p-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-[15px] font-bold">Cyber Fraud Complaint · draft</h3>
          <p className="text-[12px] text-muted">Live · fills as Rohit talks · NCRP / 1930 fields</p>
        </div>
        <span
          className={`pill ${inCall ? "pill--warn dot-live relative" : form.submitted ? "pill--ok" : ""}`}
        >
          <span className="relative z-10 grid size-1.5 place-items-center rounded-full" style={{ background: "currentColor" }} />
          {form.submitted ? "Complaint ready" : inCall ? "On call" : "Waiting"}
        </span>
      </div>

      {form.submitted && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: -8 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
          className="absolute right-6 top-16 select-none rounded-md border-2 px-3 py-1 font-display text-[13px] font-extrabold uppercase tracking-widest"
          style={{ borderColor: "var(--ok)", color: "var(--ok)" }}
        >
          Ready · ₹{CALL_META.total.toLocaleString("en-IN")}
        </motion.div>
      )}

      <div className="mt-5 space-y-4">
        <Block title="Complainant">
          <Row label="Name" v={form.consent?.name} flash={beat?.id === "consent"} />
          <Row label="Consent" v={form.consent ? "recorded ✓" : undefined} flash={beat?.id === "consent"} />
          <Row label="Mobile" v="Same as calling number" muted />
        </Block>

        <Block title="Incident">
          <Row label="Fraud type" v={form.incident?.fraudType} flash={beat?.id === "story"} />
          <Row label="When" v={form.incident?.when} />
          <Row label="Language" v={form.incident?.language} />
        </Block>

        <Block title="Transactions · one row per debit">
          {form.txns.length === 0 ? (
            <p className="text-[13px] text-muted">Waiting for Rohit to confirm a debit…</p>
          ) : (
            <div className="space-y-2">
              {form.txns.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="grid grid-cols-[1fr_1fr_1.6fr] gap-2 rounded-lg p-2.5"
                  style={{ background: "var(--surface2)" }}
                >
                  <Field l="Amount" v={`₹${t.amount.toLocaleString("en-IN")}`} />
                  <Field l="Mode · App" v={`${t.mode} · ${t.app}`} />
                  <Field l="UTR" v={t.utr.replace(/\d(?=(\d{4})+$)/g, " ")} mono accent />
                </motion.div>
              ))}
            </div>
          )}
          <p className="text-[12px] text-muted">
            Total: <b className="text-[var(--ink)]" style={{ color: "var(--ink)" }}>
              ₹{form.txns.reduce((a, t) => a + t.amount, 0).toLocaleString("en-IN")}
            </b>{" "}
            · {form.txns.length} debit{form.txns.length === 1 ? "" : "s"}
          </p>
        </Block>

        <Block title="Suspect">
          <Row label="Scammer phone" v={form.suspect?.phone} flash={beat?.id === "suspect"} />
          <Row label="UPI ID" v={form.suspect?.vpa} />
        </Block>

        {/* next steps, revealed at submit */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={form.submitted ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="rounded-xl p-3.5" style={{ background: "var(--glow-soft)" }}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider accent">Next steps sent to the caller</p>
            <ol className="space-y-1.5 text-[13px]">
              <li><b>1 · Call 1930 now</b> or file at cybercrime.gov.in with this summary.</li>
              <li><b>2 · Bank, in writing, today</b> — 3-working-day RBI window, keep the complaint no.</li>
              <li><b>3 · Keep evidence</b> — screenshots, bank SMS, chats. Never share OTP/PIN.</li>
            </ol>
          </div>
        </motion.div>
      </div>

      {/* tool toast */}
      {beat?.tool && (
        <motion.div
          key={beat.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-[12px] mono shadow-lg"
          style={{ background: "var(--ink)", color: "var(--bg)" }}
        >
          ⚙ Saathi called <b>{beat.tool}</b>() — case updated
        </motion.div>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, v, flash, muted }: { label: string; v?: string; flash?: boolean; muted?: boolean }) {
  return (
    <div
      className={`grid grid-cols-[110px_1fr] items-baseline gap-2 rounded px-1 ${flash ? "field-flash" : ""}`}
    >
      <span className="text-[12px] text-muted">{label}</span>
      <span className={`text-[13px] ${v ? "" : "text-muted"}`} style={muted ? { color: "var(--muted)" } : undefined}>
        {v || <span className="text-muted">waiting…</span>}
      </span>
    </div>
  );
}

function Field({ l, v, mono, accent }: { l: string; v: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted">{l}</p>
      <p
        className={`truncate text-[13px] ${mono ? "mono" : ""}`}
        style={accent ? { color: "var(--accent)" } : undefined}
      >
        {v}
      </p>
    </div>
  );
}
