import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Cpu, PhoneCall, ChevronDown, Loader2 } from "lucide-react";
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
    // backend wants +91XXXXXXXXXX: accept "+91 98…", "098…" or a bare 10-digit mobile
    const digits = phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
    const phoneClean = "+91" + digits;
    if (digits.length !== 10) {
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
      if (!out.placed) {
        // trial Bolna accounts refuse numbers that are not verified in the dashboard
        setRun({ rung: 3, msg: "Could not place the call: " + (out.error || "Bolna did not accept it"), ok: false, caseId });
      } else {
        setRun({ rung: 3, msg: "Call placed. Watch the case fill in below — and listen for your phone.", ok: true, caseId });
      }
    } catch (e) {
      setRun({ rung: 3, msg: "Could not place the call: " + String((e as Error).message || e), ok: false });
    }
    setBusy(null);
  }

  // tracked case: the latest one rung 3 just dialed, else /case/latest
  const trackedCaseId = run?.caseId;

  return (
    <section id="demo" className="sect">
      <h2 className="h2">Judge demo console</h2>
      <p className="h2-sub max-w-[60em]">
        Three rungs, safest first. Start on Replay (always works), move to Bridge (two real AI voices), then end on
        Phone: Saathi dials a verified number and the complaint fills in live. The panel below tracks the real backend
        case.
      </p>

      {/* settings */}
      <div className="box">
        <button onClick={() => setSettingsOpen((v) => !v)} className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left" aria-expanded={settingsOpen}>
          <span className="min-w-0">
            <span className="block text-[14px] font-bold">
              <span className={settingsReady ? "c-green" : "c-red"}>●</span> {settingsReady ? "Backend connected" : "Backend not configured yet"}
            </span>
            <span className="block text-[12px] text-mute" style={{ overflowWrap: "anywhere" }}>
              {s.backend.replace(/^https?:\/\//, "")} · token {s.token ? "set" : "missing"} · keys stay in this browser only
            </span>
          </span>
          <span className="flex items-center gap-1 text-[13px] text-mute">
            [ settings <ChevronDown size={14} className={settingsOpen ? "rotate-180 transition-transform" : "transition-transform"} /> ]
          </span>
        </button>

        <AnimatePresence>
          {settingsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
              style={{ borderTop: "1px dashed var(--line)" }}
            >
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <Field label="Backend URL" hint="your Render deploy (or http://localhost:8000)" value={s.backend} onChange={(v) => set({ backend: v })} placeholder="https://saathi-1930.onrender.com" />
                <Field label="BACKEND_TOKEN" hint="same value the backend runs with" value={s.token} onChange={(v) => set({ token: v })} placeholder="••••••••" />
                <Field label="Caller-bot Bolna key (BOT_API_KEY)" hint="the 2nd account that hosts the voice test callers" value={s.botKey} onChange={(v) => set({ botKey: v })} placeholder="bn-…" />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label className="text-[12px] text-mute" htmlFor="scenario">Bridge scenario</label>
                  <select id="scenario" value={s.scenario} onChange={(e) => set({ scenario: e.target.value })} className="field-b">
                    <option value="rohit">Rohit: English, “no”, AnyDesk + 2nd debit</option>
                    <option value="sunita">Sunita: Hindi, “no”, shared OTP</option>
                    <option value="priya">Priya: English, “yes” (cleared)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* the three rungs */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <RungCard n={1} title="Replay" tag="safe · always works" desc="The reenacted Saathi ↔ Rohit call (her real lines and voice) with the complaint draft printing. No backend, no phone, no credit.">
          <button
            className="btn-b btn-b--go w-full"
            onClick={() => {
              eng.replay();
              document.getElementById("record")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <Play size={15} fill="currentColor" /> PLAY THE REPLAY
          </button>
        </RungCard>

        <RungCard n={2} title="Two-voice bridge" tag="real voices · no phone" desc="Saathi and a synthetic caller hold a real Bolna call. Opens in a new tab; this panel tracks it." requiresBackend={!settingsReady} busy={busy === 2}>
          <button className="btn-b btn-b--go w-full" onClick={runBridge} disabled={!settingsReady || busy === 2}>
            {busy === 2 ? <Loader2 size={15} className="spin" /> : <Cpu size={15} />} OPEN THE BRIDGE
          </button>
        </RungCard>

        <RungCard n={3} title="Dial a verified phone" tag="live phone" desc="Saathi calls a real mobile and runs the alert flow. Trial account: only numbers verified in Bolna can be called." requiresBackend={!settingsReady} busy={busy === 3}>
          <div className="flex w-full gap-2">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98XXXXXXXX" inputMode="tel" aria-label="Phone number to dial" className="field-b flex-1" />
            <button className="btn-b btn-b--go" onClick={runPhone} disabled={!settingsReady || busy === 3} aria-label="Dial">
              {busy === 3 ? <Loader2 size={15} className="spin" /> : <PhoneCall size={15} />}
            </button>
          </div>
        </RungCard>
      </div>

      {/* run status */}
      {run && (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center gap-3 px-4 py-3 text-[13px]"
          style={{ border: `1.5px solid ${run.ok ? "var(--green)" : run.ok === false ? "var(--red)" : "var(--line)"}`, background: "var(--paper)", color: run.ok ? "var(--green)" : run.ok === false ? "var(--red)" : "var(--ink)" }}
        >
          <span className="min-w-0 flex-1" style={{ overflowWrap: "anywhere" }}>
            {run.ok ? "✓ " : run.ok === false ? "✕ " : "… "}
            {run.msg}
          </span>
          {run.url && (
            <a className="text-[12px] underline" href={run.url} target="_blank" rel="noreferrer">
              open →
            </a>
          )}
        </div>
      )}

      {/* live panel + backend's own pages */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <LiveCasePanel s={s} caseId={trackedCaseId} />

        <div className="box flex min-w-0 flex-col gap-3 p-4">
          <div>
            <p className="text-[14px] font-bold">Open the backend’s own pages</p>
            <p className="text-[12px] text-mute">Project these next to the console during the demo.</p>
          </div>
          <div>
            <BackendLink href={`${s.backend}/case/${trackedCaseId ?? "latest"}`} label="Live complaint page" desc="/case: the 1930-ready draft as it fills" />
            <BackendLink href={`${s.backend}/bank`} label="Bank fraud-ops queue" desc="/bank: cases ranked by ₹ × freshness" />
            {run?.url && <BackendLink href={run.url} label="Two-voice bridge" desc="/bridge: Saathi + caller, live audio" />}
          </div>
          <div className="mt-auto p-3 text-[12px] text-mute" style={{ border: "1px dashed var(--line)" }}>
            <b style={{ color: "var(--ink)" }}>Fallback rule:</b> if a phone rung times out or no-answers, keep the bridge
            tab open: it already proves the voice pipeline end to end, and the replay always works offline.
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
  requiresBackend,
  busy,
}: {
  n: number;
  title: string;
  tag: string;
  desc: string;
  children?: React.ReactNode;
  requiresBackend?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="rung">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[16px] font-extrabold">
          <span className="rung-n">RUNG {n} · </span>
          {title}
        </p>
        <span className="text-[11px] text-mute">{tag}</span>
      </div>
      <p className="mb-4 flex-1 text-[13px] text-mute">{desc}</p>
      {requiresBackend && <p className="mb-3 text-[12px] c-red">Needs the backend URL + token in settings.</p>}
      {busy && <div className="mb-3 text-[12px] text-mute">working…</div>}
      {children}
    </div>
  );
}

function BackendLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="kv" style={{ textDecoration: "none" }}>
      <span>{label}</span>
      <span>
        <span className="c-green">{desc}</span> ↗
      </span>
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
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[12px] text-mute">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field-b" />
      <span className="text-[11px] text-mute">{hint}</span>
    </label>
  );
}
