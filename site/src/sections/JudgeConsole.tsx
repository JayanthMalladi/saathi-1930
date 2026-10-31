import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Cpu,
  PhoneCall,
  Settings2,
  ChevronDown,
  Link2,
  Circle,
  Loader2,
  KeyRound,
  Check,
  Info,
} from "lucide-react";
import { useJudgeSettings } from "../lib/JudgeSettings";
import { api } from "../lib/backend";
import { useCallEngine } from "../engine/CallEngine";
import LiveCasePanel from "../components/LiveCasePanel";

// The judge demo console: three rungs of the live demo, safest to flashiest.
//  Rung 1 · Replay  — offline simulated call + complaint (always works)
//  Rung 2 · Bridge   — two real AI voices on Bolna, no phone needed
//  Rung 3 · Phone    — Saathi dials a real number; the complaint fills live
export default function JudgeConsole() {
  const { s, set } = useJudgeSettings();
  const eng = useCallEngine();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [run, setRun] = useState<{ rung: 1 | 2 | 3; msg: string; ok?: boolean; caseId?: string; url?: string } | null>(null);
  const [phone, setPhone] = useState("+91 ");
  const [busy, setBusy] = useState<1 | 2 | 3 | null>(null);

  const settingsReady = !!s.backend && !!s.token;

  // ---- rung 2: mint the bridge page URL (audio happens on /bridge, reuses tested wiring) ----
  async function runBridge() {
    if (!settingsReady) return;
    setBusy(2);
    setRun({ rung: 2, msg: "Opening the two-voice bridge…" });
    const hash = `token=${encodeURIComponent(s.token)}&botkey=${encodeURIComponent(s.botKey)}&scenario=${encodeURIComponent(s.scenario)}`;
    // navigate the live panel target; open the bridge page in a new tab for the audio
    window.open(`${s.backend}/bridge#${hash}`, "_blank", "noopener");
    setRun({ rung: 2, msg: `Bridge opened in a new tab — pick ${s.scenario} and press “Start test call”. This panel tracks the case it creates.`, ok: true, url: `${s.backend}/bridge#${hash}` });
    setBusy(null);
  }

  // ---- rung 3: dial a real number (alert call). The response now carries the case id. ----
  async function runPhone() {
    if (!settingsReady) return;
    const phoneClean = phone.replace(/\D/g, "");
    if (phoneClean.length < 12) {
      setRun({ rung: 3, msg: "Enter a full Indian mobile in +91XXXXXXXXXX form." });
      return;
    }
    setBusy(3);
    setRun({ rung: 3, msg: "Asking Saathi to dial " + phone + "…" });
    try {
      const out = await api(s, "/api/alert-call", {
        method: "POST",
        body: JSON.stringify({ phone: phoneClean, name: "Judge", amount: 15000, payee: "demo.payee@upi", token: s.token }),
      });
      const caseId = out.case_id;
      setRun({
        rung: 3,
        msg: caseId ? "Call placed. Watch the case fill in below — and listen for your phone." : "Call placed (no case id returned yet; tracking the latest).",
        ok: !!caseId,
        caseId,
      });
    } catch (e) {
      setRun({ rung: 3, msg: "Could not place the call: " + String((e as Error).message || e), ok: false });
    }
    setBusy(null);
  }

  // tracked case: the latest one rung 3 just dialed, else /case/latest
  const trackedCaseId = run?.caseId;

  return (
    <section id="demo" className="relative mx-auto max-w-6xl px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mb-8 max-w-2xl"
      >
        <span className="tag tag--accent">
          <Circle size={9} className="dot-live" /> JUDGE DEMO
        </span>
        <h2 className="font-display mt-4 text-3xl font-bold sm:text-4xl">
          Run the live demo in front of the judges.
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Three rungs, safest first. Start on <b>Replay</b> (always works), move to <b>Bridge</b> (two real AI
          voices), then end on <b>Phone</b> — Saathi dials a judge's number and the complaint fills in live. The
          panel below tracks the <b>real</b> backend case.
        </p>
      </motion.div>

      {/* settings bar */}
      <div className="surface overflow-hidden rounded-2xl">
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl" style={{ background: "var(--glow-soft)" }}>
              <KeyRound size={17} className="accent" />
            </div>
            <div>
              <p className="text-[14px] font-semibold">
                {settingsReady ? "Backend connected" : "Backend not configured yet"}
                <span className="ml-2 text-[12px] text-muted">
                  {s.backend.replace(/^https?:\/\//, "")} · token {s.token ? "set" : "missing"}
                </span>
              </p>
              <p className="text-[12px] text-muted">The demo calls your real backend. Keys stay in this browser only.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settingsReady && <Check size={16} style={{ color: "var(--ok)" }} />}
            <span className="text-[13px] text-muted flex items-center gap-1">
              <Settings2 size={15} /> Settings <ChevronDown size={14} className={settingsOpen ? "rotate-180 transition-transform" : "transition-transform"} />
            </span>
          </div>
        </button>

        <AnimatePresence>
          {settingsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t"
              style={{ borderColor: "var(--line)" }}
            >
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <Field label="Backend URL" hint="your Render deploy (or http://localhost:8000)" value={s.backend} onChange={(v) => set({ backend: v })} placeholder="https://saathi-1930.onrender.com" />
                <Field label="BACKEND_TOKEN" hint="same value the backend runs with" value={s.token} onChange={(v) => set({ token: v })} placeholder="••••••••" />
                <Field label="Caller-bot Bolna key (BOT_API_KEY)" hint="the 2nd account that hosts the voice test callers" value={s.botKey} onChange={(v) => set({ botKey: v })} placeholder="bn-…" />
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-muted">Bridge scenario</label>
                  <select
                    value={s.scenario}
                    onChange={(e) => set({ scenario: e.target.value })}
                    className="surface2 hairline rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="rohit">Rohit — English, “no”, AnyDesk + 2nd debit</option>
                    <option value="sunita">Sunita — Hindi, “no”, shared OTP</option>
                    <option value="priya">Priya — English, “yes” (cleared)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* the three rungs */}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {/* Rung 1 */}
        <RungCard
          n={1}
          title="Replay"
          tag="safe · always works"
          desc="The simulated Saathi ↔ Rohit call with the complaint filling in. No backend, no phone, no credit."
          accent
        >
          <button className="btn btn--primary w-full justify-center" onClick={() => { eng.replay(); document.getElementById("call")?.scrollIntoView({ behavior: "smooth" }); }}>
            <Play size={15} /> Play the replay
          </button>
        </RungCard>

        {/* Rung 2 */}
        <RungCard n={2} title="Two-voice bridge" tag="real voices · no phone" desc="Saathi and a synthetic caller hold a real Bolna call. Opens in a new tab; this panel tracks it." requiresBackend={!settingsReady} busy={busy === 2} onRun={runBridge}>
          <button className="btn btn--primary w-full justify-center" onClick={runBridge} disabled={!settingsReady || busy === 2}>
            {busy === 2 ? <Loader2 size={15} className="animate-spin" /> : <Cpu size={15} />} Open the bridge
          </button>
        </RungCard>

        {/* Rung 3 */}
        <RungCard n={3} title="Dial a judge" tag="the climax · live phone" desc="Saathi calls a real mobile and runs the alert flow. The complaint below fills in as it happens." requiresBackend={!settingsReady} busy={busy === 3} onRun={runPhone}>
          <div className="flex w-full gap-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98XXXXXXXX"
              inputMode="tel"
              className="surface2 hairline min-w-0 flex-1 rounded-lg px-3 py-2 text-[14px] outline-none focus:border-[var(--accent)]"
            />
            <button className="btn btn--primary" onClick={runPhone} disabled={!settingsReady || busy === 3} style={{ background: settingsReady ? undefined : "var(--muted)" }}>
              {busy === 3 ? <Loader2 size={15} className="animate-spin" /> : <PhoneCall size={15} />}
            </button>
          </div>
        </RungCard>
      </div>

      {/* run status */}
      {run && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-[13px] ${run.ok ? "pill--ok" : ""}`}
          style={{
            background: run.ok ? "color-mix(in srgb, var(--ok) 12%, transparent)" : "var(--surface2)",
            border: `1px solid ${run.ok ? "color-mix(in srgb, var(--ok) 40%, transparent)" : "var(--line)"}`,
            color: run.ok ? "var(--ok)" : "var(--ink)",
          }}
        >
          <Info size={15} />
          <span className="flex-1">{run.msg}</span>
          {run.url && (
            <a className="mono text-[12px] accent inline-flex items-center gap-1" href={run.url} target="_blank" rel="noreferrer">
              open <Link2 size={12} />
            </a>
          )}
        </motion.div>
      )}

      {/* live panel + backend's own pages */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <LiveCasePanel s={s} caseId={trackedCaseId} />

        <div className="surface flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
          <div>
            <p className="font-display text-[15px] font-bold">Open the backend's own pages</p>
            <p className="text-[12px] text-muted">Project these next to the console during the demo.</p>
          </div>
          <div className="grid gap-2.5">
            <BackendLink s={s} href={`${s.backend}/case/${trackedCaseId ?? "latest"}`} label="Live complaint page" desc="/case — the 1930 form as it fills" />
            <BackendLink s={s} href={`${s.backend}/bank`} label="Bank fraud-ops queue" desc="/bank — cases ranked by ₹ × freshness" />
            {run?.url && <BackendLink s={s} href={run.url} label="Two-voice bridge" desc="/bridge — Saathi + caller, live audio" />}
          </div>
          <div className="mt-auto rounded-xl p-3.5 text-[12px] text-muted" style={{ background: "var(--surface2)" }}>
            <b style={{ color: "var(--ink)" }}>Fallback rule:</b> if a phone rung times out or no-answers, keep the bridge
            tab open — it already proves the voice pipeline end to end, and the replay always works offline.
          </div>
        </div>
      </div>
    </section>
  );
}

function RungCard({
  n,
  title,
  tag,
  desc,
  children,
  accent,
  requiresBackend,
  busy,
  onRun,
}: {
  n: number;
  title: string;
  tag: string;
  desc: string;
  children?: React.ReactNode;
  accent?: boolean;
  requiresBackend?: boolean;
  busy?: boolean;
  onRun?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: n * 0.08 }}
      className="surface relative flex flex-col overflow-hidden rounded-2xl p-5"
      style={accent ? { border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)", boxShadow: "0 0 44px -22px var(--glow)" } : undefined}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg text-[13px] font-bold" style={{ background: "var(--glow-soft)", color: "var(--accent)" }}>
            {n}
          </div>
          <p className="font-display text-[16px] font-bold">{title}</p>
        </div>
        <span className={`pill ${accent ? "pill--ok" : ""}`}>{tag}</span>
      </div>
      <p className="mb-4 flex-1 text-[13px] leading-relaxed text-muted">{desc}</p>
      {requiresBackend && <p className="mb-3 text-[12px]" style={{ color: "var(--warn)" }}>Needs the backend URL + token in Settings.</p>}
      {busy && <div className="mb-3 text-[12px] text-muted">working…</div>}
      {children}
    </motion.div>
  );
}

function BackendLink({ s, href, label, desc }: { s: { backend: string }; href: string; label: string; desc: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="surface2 hairline group flex items-center gap-3 rounded-xl p-3 transition-colors hover:!border-[var(--accent)]">
      <div className="grid size-9 place-items-center rounded-lg" style={{ background: "var(--glow-soft)" }}>
        <Link2 size={16} className="accent" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold">{label}</p>
        <p className="truncate text-[11px] text-muted">{desc}</p>
      </div>
    </a>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-muted">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="surface2 hairline rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-[var(--accent)]"
      />
      <span className="text-[11px] text-muted">{hint}</span>
    </div>
  );
}
