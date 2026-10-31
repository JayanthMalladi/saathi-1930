import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Radio, ExternalLink, RefreshCw, FileCheck2, Loader2 } from "lucide-react";
import { api, type Settings } from "../lib/backend";

type RealCase = {
  id: string;
  status: string;
  mode?: string;
  consent?: { caller_name?: string; is_account_holder?: boolean; at?: string } | null;
  transactions: { amount_inr: number; mode?: string; utr_or_ref?: string; app?: string; bank?: string; datetime?: string | null; utr_issue?: string | null }[];
  complaint?: Record<string, string | null>;
  sms?: string | null;
  events?: [string, string][];
  alert?: Record<string, unknown>;
  priority?: { total_inr: number; rbi_window: string | null; score: number };
};

const STATUS: Record<string, [string, string]> = {
  in_call: ["On call", "warn live"],
  alert_calling: ["Calling customer", "warn live"],
  submitted: ["Complaint ready", "ok"],
  cleared: ["Genuine · cleared", "ok"],
  call_ended: ["Call ended", "warn"],
  ended_no_reply: ["Hung up, no reply", "bad"],
  no_answer: ["No answer", "bad"],
  call_failed: ["Call failed", "bad"],
};

// Polls the real backend case and renders it. `caseId` optional = /case/latest.
export default function LiveCasePanel({ s, caseId, pollMs = 2500 }: { s: Settings; caseId?: string; pollMs?: number }) {
  const [data, setData] = useState<RealCase | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dataRef = useRef<RealCase | null>(null);

  const ready = !!(s.backend && s.token);

  useEffect(() => {
    if (!ready) return; // nothing to poll until the backend and token are set
    let stop = false;
    const tick = async () => {
      try {
        const c = await api(s, `/api/cases/${caseId ?? "latest"}`);
        if (!stop) {
          setData((prev) => {
            // flash fields that just changed
            if (prev && c.id === prev.id) {
              for (const k of ["consent", "complaint", "sms"] as const)
                if (JSON.stringify((c as any)[k]) !== JSON.stringify((prev as any)[k])) (c as any)[`__flash_${k}`] = true;
            }
            dataRef.current = c;
            return c;
          });
          setErr(null);
        }
      } catch (e) {
        if (!stop) setErr(String((e as Error).message || e));
      } finally {
        if (!stop) setBusy(false);
      }
    };
    setBusy(true);
    tick();
    const id = setInterval(tick, pollMs);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [s, caseId, pollMs, ready]);

  const p = data?.priority;
  const total = p?.total_inr ?? (data ? data.transactions.reduce((a, t) => a + t.amount_inr, 0) : 0);
  const st = data ? STATUS[data.status] || ["", ""] : null;

  return (
    <div className="surface relative overflow-hidden rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl" style={{ background: "var(--glow-soft)", border: "1px solid var(--line)" }}>
            <Radio size={17} className="accent" />
          </div>
          <div>
            <p className="font-display text-[14px] font-bold leading-none">Live case · {data?.id ?? "…"}</p>
            <p className="mt-0.5 text-[11px] text-muted">real backend · {s.backend.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {st && (
            <span className={`pill ${st[1].includes("ok") ? "pill--ok" : st[1].includes("bad") ? "pill--bad" : "pill--warn"} ${st[1].includes("live") ? "dot-live relative" : ""}`}>
              {st[1].includes("live") && <span className="relative z-10 mr-1 inline-block size-1.5 rounded-full" style={{ background: "currentColor" }} />}
              {st[0] || data?.status}
            </span>
          )}
          <a className="btn btn--ghost !p-2" href={`${s.backend}/case/${data?.id ?? "latest"}`} target="_blank" rel="noreferrer" title="Open the backend's own page">
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* body */}
      {!data ? (
        <div className="mt-6 flex flex-col items-center gap-3 py-10 text-center">
          {!ready ? (
            <>
              <RefreshCw size={22} className="text-muted" />
              <p className="text-[13px] text-muted">Add the backend URL and token in Settings to see a live case here.</p>
            </>
          ) : err ? (
            <>
              <RefreshCw size={22} className="text-muted" />
              <p className="text-[13px] text-muted">
                Can't reach the backend yet: <span className="mono accent">{err}</span>
              </p>
              <p className="text-[12px] text-muted">Check the backend URL + token in Settings, and that it allows this site's origin.</p>
            </>
          ) : (
            <>
              <Loader2 size={22} className="pulse-soft accent" />
              <p className="text-[13px] text-muted">Waiting for a call to start…</p>
              <p className="max-w-[280px] text-[12px] text-muted">Place a bridge or phone call and this fills in live, exactly like the bank's fraud-ops desk.</p>
            </>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {data.status === "submitted" && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: -8 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-bold"
              style={{ background: "color-mix(in srgb, var(--ok) 14%, transparent)", color: "var(--ok)" }}
            >
              <FileCheck2 size={16} /> 1930-ready draft · ₹{total.toLocaleString("en-IN")} · sent to the bank queue
            </motion.div>
          )}

          <Row label="Complainant" v={data.consent?.caller_name ? `${data.consent.caller_name} · consent recorded ✓` : undefined} />
          <Row label="Fraud type" v={data.complaint?.fraud_type || undefined} />
          <Row label="Description" v={data.complaint?.description || undefined} />
          <Row label="Suspect" v={data.complaint?.suspect_phone ? data.complaint.suspect_phone : data.complaint?.suspect_vpa_or_account || undefined} />
          <Row label="RBI window" v={p?.rbi_window || undefined} />

          {/* transactions */}
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
              Debits · {data.transactions.length}
              {data.transactions.length > 0 && (
                <span className="ml-2 font-semibold" style={{ color: "var(--ink)" }}>
                  ₹{total.toLocaleString("en-IN")}
                </span>
              )}
            </p>
            {data.transactions.length === 0 ? (
              <p className="text-[13px] text-muted">No debits recorded yet.</p>
            ) : (
              <div className="space-y-1.5">
                {data.transactions.map((t, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg px-3 py-2"
                    style={{ background: "var(--surface2)" }}
                  >
                    <span className="font-semibold">₹{t.amount_inr.toLocaleString("en-IN")}</span>
                    <span className="text-[12px] text-muted">
                      {t.mode} · {t.app || "—"} · {t.bank || "—"}
                    </span>
                    <span className="mono text-[12px]" style={{ color: t.utr_issue ? "var(--warn)" : "var(--accent)" }}>
                      {t.utr_or_ref || "pending"}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* next steps */}
          {data.status === "submitted" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden rounded-xl p-3.5 text-[13px]"
              style={{ background: "var(--glow-soft)" }}
            >
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider accent">Next steps the caller was given</p>
              <ol className="space-y-1">
                <li><b>1 · Call 1930 now</b> or file at cybercrime.gov.in with this summary.</li>
                <li><b>2 · Bank, in writing, today</b> — RBI 3-working-day window; keep the complaint number.</li>
                <li><b>3 · Keep evidence</b> — screenshots, SMS, chats. Never share OTP/PIN.</li>
              </ol>
            </motion.div>
          )}
        </div>
      )}

      {/* status footer */}
      <div className="mt-5 flex items-center justify-between border-t pt-3 text-[11px] text-muted" style={{ borderColor: "var(--line)" }}>
        <span>{ready ? `polling every ${pollMs / 1000}s` : "not polling"}</span>
        <span>{data?.events?.length ? `${data.events.length} events` : "no events yet"}</span>
      </div>
    </div>
  );
}

function Row({ label, v }: { label: string; v?: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-2">
      <span className="text-[12px] text-muted">{label}</span>
      <span className="text-[13px]">{v || <span className="text-muted">—</span>}</span>
    </div>
  );
}
