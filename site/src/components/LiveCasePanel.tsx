import { useEffect, useRef, useState } from "react";
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

const STATUS: Record<string, [string, "live" | "ok" | "warn" | "bad"]> = {
  in_call: ["On call", "live"],
  alert_calling: ["Calling customer", "live"],
  submitted: ["Draft ready", "ok"],
  cleared: ["Genuine · cleared", "ok"],
  call_ended: ["Call ended", "warn"],
  ended_no_reply: ["Hung up, no reply", "bad"],
  no_answer: ["No answer", "bad"],
  call_failed: ["Call failed", "bad"],
};
const TONE = { live: "o-live", ok: "o-yes", warn: "o-miss", bad: "o-no" };

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
  const st = data ? STATUS[data.status] : undefined;

  return (
    <div className="box min-w-0 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-bold">Live case · {data?.id ?? "…"}</p>
          <p className="text-[11px] text-mute" style={{ overflowWrap: "anywhere" }}>
            real backend · {s.backend.replace(/^https?:\/\//, "")}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[13px]">
          {data && <span className={st ? TONE[st[1]] : "o-miss"}> {st?.[0] ?? data.status}</span>}
          <a href={`${s.backend}/case/${data?.id ?? "latest"}`} target="_blank" rel="noreferrer" title="Open the backend's own page" className="text-mute underline">
            open ↗
          </a>
        </div>
      </div>

      {!data ? (
        <div className="mt-4 py-8 text-center text-[13px] text-mute" style={{ border: "1px dashed var(--line)" }}>
          {!ready ? (
            <p className="px-4">Add the backend URL and token in settings to see a live case here.</p>
          ) : err ? (
            <div className="px-4">
              <p>
                Can’t reach the backend yet: <span className="c-red" style={{ overflowWrap: "anywhere" }}>{err}</span>
              </p>
              <p className="mt-1 text-[12px]">Check the backend URL + token in settings, and that it allows this site’s origin.</p>
            </div>
          ) : (
            <div className="px-4">
              <p className="r-pend">{busy ? "Connecting…" : "Waiting for a call to start…"}</p>
              <p className="mt-1 text-[12px]">Place a bridge or phone call and this fills in live, like the bank’s fraud-ops desk.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3">
          {data.status === "submitted" && (
            <p className="mb-2 px-3 py-2 text-[13px] font-bold" style={{ background: "var(--hl)", color: "var(--hl-ink)" }}>
              1930-ready draft · ₹{total.toLocaleString("en-IN")} · in the bank queue
            </p>
          )}

          <Row label="Complainant" v={data.consent?.caller_name ? `${data.consent.caller_name} · consent recorded ✓` : undefined} />
          <Row label="Fraud type" v={data.complaint?.fraud_type || undefined} />
          <Row label="Description" v={data.complaint?.description || undefined} />
          <Row label="Suspect" v={data.complaint?.suspect_phone ? data.complaint.suspect_phone : data.complaint?.suspect_vpa_or_account || undefined} />
          <Row label="RBI window" v={p?.rbi_window || undefined} />

          <p className="mt-3 mb-1 text-[11px] uppercase tracking-wider text-mute">
            Debits · {data.transactions.length}
            {data.transactions.length > 0 && <b style={{ color: "var(--ink)" }}> · ₹{total.toLocaleString("en-IN")}</b>}
          </p>
          {data.transactions.length === 0 ? (
            <p className="text-[13px] text-mute">No debits recorded yet.</p>
          ) : (
            data.transactions.map((t, i) => (
              <div key={i} className="kv" style={{ gridTemplateColumns: "auto minmax(0,1fr)" }}>
                <span style={{ color: "var(--ink)", fontWeight: 700, fontSize: 13 }}>₹{t.amount_inr.toLocaleString("en-IN")}</span>
                <span>
                  {t.mode} · {t.app || "—"} · {t.bank || "—"} ·{" "}
                  <span className={t.utr_issue ? "c-red" : "c-green"}>{t.utr_or_ref || "pending"}</span>
                </span>
              </div>
            ))
          )}

          {data.status === "submitted" && (
            <div className="mt-3 p-3 text-[13px]" style={{ border: "1px dashed var(--line)" }}>
              <p className="mb-1 text-[11px] uppercase tracking-wider c-green">Next steps the caller was given</p>
              <ol className="space-y-1">
                <li>1 · Call 1930 now or file at cybercrime.gov.in with this summary.</li>
                <li>2 · Tell the bank in writing today: RBI 3-working-day window; keep the complaint number.</li>
                <li>3 · Keep evidence: screenshots, SMS, chats. Never share OTP/PIN.</li>
              </ol>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-between gap-2 pt-2 text-[11px] text-mute" style={{ borderTop: "1px dashed var(--line)" }}>
        <span>{ready ? `polling every ${pollMs / 1000}s` : "not polling"}</span>
        <span>{data?.events?.length ? `${data.events.length} events` : "no events yet"}</span>
      </div>
    </div>
  );
}

function Row({ label, v }: { label: string; v?: string }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <span>{v || <span className="text-mute">—</span>}</span>
    </div>
  );
}
