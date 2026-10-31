import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { BEATS, PAYMENT_QUESTION } from "../data/callScript";
import { HOP, PAYLOADS, TOOL, at, workflow, type WfEdge, type WfNode } from "../data/workflow";
import { fmt, useCallEngine } from "../engine/CallEngine";

// The call as a live node graph, hand-built in SVG + DOM. It reads the page's one clock (useCallEngine), so the
// play button anywhere drives it and any seek jumps it. Every node and edge state is worked out from the time;
// the motion (packets, edges drawing, payloads typing) is CSS keyed to the moment each transition fires.

type State = "pending" | "reached" | "active" | "done" | "skip";
type Pt = [number, number];
type Box = { l: number; t: number; r: number; b: number };
type Route = { d: string; end: Pt; lab: Pt; side?: boolean };

function nodeState(n: WfNode, t: number): State {
  if (n.kind === "note") return "done";
  if (n.skipAt !== undefined) return t >= n.skipAt ? "skip" : "pending";
  if (t < n.reach) return "pending";
  if (t < n.s) return "reached";
  return t < n.e ? "active" : "done";
}

function useMedia(q: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(q);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(q).matches,
    () => false
  );
}

// an orthogonal path through the points, corners rounded ("smoothstep")
function smooth(p: Pt[], r = 8): string {
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) {
    const [a, b, c] = [p[i - 1], p[i], p[i + 1]];
    const d1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const d2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const k = Math.min(r, d1 / 2, d2 / 2);
    if (k < 0.5) {
      d += ` L${b[0]},${b[1]}`;
      continue;
    }
    const p1 = [b[0] + ((a[0] - b[0]) / d1) * k, b[1] + ((a[1] - b[1]) / d1) * k];
    const p2 = [b[0] + ((c[0] - b[0]) / d2) * k, b[1] + ((c[1] - b[1]) / d2) * k];
    d += ` L${p1[0]},${p1[1]} Q${b[0]},${b[1]} ${p2[0]},${p2[1]}`;
  }
  const z = p[p.length - 1];
  return `${d} L${z[0]},${z[1]}`;
}

// Desktop: a 6 x 3 grid; edges run along rows, drop through the row gaps, and tool results ride a bus under the
// last row. Single column: neighbours join straight down; an edge that jumps nodes takes a gutter lane on the right.
function route(e: WfEdge, a: Box, b: Box, from: WfNode, to: WfNode, col: boolean, all: Box[]): Route {
  const cx = (x: Box) => (x.l + x.r) / 2;
  let p: Pt[];
  let lab: Pt;
  let side = false;
  if (col) {
    const right = Math.max(...all.map((x) => x.r));
    if (to.o === from.o + 1) {
      p = [[cx(a), a.b], [cx(b), b.t]];
      lab = [cx(a), (a.b + b.t) / 2];
    } else if (to.o > from.o) {
      const x = right + 7 * (e.lane ?? 1);
      p = [[a.r, a.t + 30], [x, a.t + 30], [x, b.t + 14], [b.r, b.t + 14]];
      lab = [b.r, b.t - 18];
      side = true;
    } else {
      const x = Math.min(...all.map((x) => x.l)) - 9;
      p = [[a.l, a.t + 30], [x, a.t + 30], [x, b.t + 14], [b.l, b.t + 14]];
      lab = [x, (a.t + b.t) / 2];
    }
  } else if (from.r === to.r && Math.abs(to.c - from.c) === 1) {
    const y = a.t + 26;
    p = [[a.r, y], [b.l, y]];
    lab = [(a.r + b.l) / 2, y];
  } else if (from.r === to.r) {
    const y = Math.max(...all.map((x) => x.b)) + 12 + 6 * ((e.lane ?? 1) - 1);
    p = [[cx(a), a.b], [cx(a), y], [cx(b) - 8 * ((e.lane ?? 1) - 1), y], [cx(b) - 8 * ((e.lane ?? 1) - 1), b.b]];
    lab = [cx(b), y];
  } else {
    const y = b.t - 26;
    p = [[cx(a), a.b], [cx(a), y], [cx(b), y], [cx(b), b.t]];
    lab = [(cx(a) + cx(b)) / 2, y];
  }
  return { d: smooth(p), end: p[p.length - 1], lab, side };
}

// a packet along an edge, or the edge drawing itself: a CSS animation whose start is pinned to when the
// transition fired, so joining mid-flight lands at the right spot (the delay is fixed at mount)
function Packet({ d, since, data }: { d: string; since: number; data?: boolean }) {
  const [delay] = useState(-since);
  return <i className={`wf-pkt${data ? " is-data" : ""}`} style={{ offsetPath: `path("${d}")`, animationDelay: `${delay}s` } as CSSProperties} />;
}
function Draw({ d, since }: { d: string; since: number }) {
  const [delay] = useState(-since);
  return <path className="wf-draw" d={d} pathLength={1} style={{ animationDelay: `${delay}s` }} />;
}

const UTR = BEATS.flatMap((b, i) => (b.utr ? b.utr.map((u) => ({ g: u.digits, heard: b.t, echo: BEATS[i + 1].t })) : []));
const PHONE = BEATS.flatMap((b, i) => (b.phone ? [{ g: b.phone, heard: b.t, echo: BEATS[i + 1].t }] : []));
const MARK: Record<string, string> = { record_consent: "consent", add_transaction: "txn", submit_case: "submit" };
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// digit groups fill as Rohit reads them (grey) and then digit by digit as Saathi reads them back (ink)
function Slots({ groups, t, motion }: { groups: typeof UTR; t: number; motion: boolean }) {
  return (
    <span className="wf-slots">
      {groups.map(({ g, heard, echo }) => (
        <span key={g} className={t >= echo ? "f" : t >= heard ? "h" : ""}>
          {[...g].map((ch, k) => (
            <i key={k} className={t >= echo + (motion ? k * 0.28 : 0) ? "f" : ""}>
              {t >= heard ? ch : "·"}
            </i>
          ))}
        </span>
      ))}
    </span>
  );
}

export default function Workflow() {
  const { time: t, total, playing, beat, toggle, seek } = useCallEngine();
  const reduce = useMedia("(prefers-reduced-motion: reduce)");
  const col = useMedia("(max-width: 899px)");
  const { nodes, edges } = useMemo(() => workflow(total), [total]);
  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);

  const root = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const els = useRef<Record<string, HTMLElement | null>>({});
  const [geo, setGeo] = useState<Record<string, Route>>({});
  const [inView, setInView] = useState(false);
  const motion = !reduce && inView;
  const moving = motion && playing;

  // measure the nodes and route every edge; again whenever any node changes size
  useLayoutEffect(() => {
    const st = stage.current;
    if (!st) return;
    let raf = 0;
    let last = "";
    const layout = () => {
      const box: Record<string, Box> = {};
      for (const n of nodes) {
        const el = els.current[n.id];
        if (el) box[n.id] = { l: el.offsetLeft, t: el.offsetTop, r: el.offsetLeft + el.offsetWidth, b: el.offsetTop + el.offsetHeight };
      }
      const all = Object.values(box);
      const next: Record<string, Route> = {};
      for (const e of edges) next[e.id] = route(e, box[e.from], box[e.to], byId[e.from], byId[e.to], col, all);
      const sig = JSON.stringify(next);
      if (sig !== last) {
        last = sig;
        setGeo(next);
      }
    };
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(layout);
    });
    ro.observe(st);
    for (const n of nodes) if (els.current[n.id]) ro.observe(els.current[n.id]!);
    layout();
    document.fonts?.ready.then(layout);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [nodes, edges, byId, col]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([x]) => setInView(x.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const states = Object.fromEntries(nodes.map((n) => [n.id, nodeState(n, t)])) as Record<string, State>;
  // the node the call is at now: the live one that started last
  const focus = nodes.filter((n) => states[n.id] === "active").sort((a, b) => b.s - a.s)[0]?.id;

  // one column: keep the live node in view by scrolling the graph's own box, never the page
  useEffect(() => {
    const box = cv.current;
    const el = focus && els.current[focus];
    if (!col || !box || !el || !inView) return;
    const top = Math.max(0, el.offsetTop - (box.clientHeight - el.offsetHeight) / 2);
    if (Math.abs(box.scrollTop - top) > 4) box.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  }, [focus, col, inView, reduce]);

  // a packet runs along an edge for HOP seconds after it fires (never along the branch not taken)
  const hopping = (e: WfEdge) => moving && e.kind !== "skip" && t >= e.at && t < e.at + HOP;
  const edgeState = (e: WfEdge) => {
    if (e.kind === "skip") return t >= byId[e.to].skipAt! ? "skip" : "pending";
    if (e.kind === "back") return states[e.from] === "done" ? "done" : "idle";
    if (t < e.at) return "pending";
    return states[e.to] === "active" && !e.kind ? "live" : "done";
  };

  // the last thing that happened, for the one-line event log
  const lastEdge = edges.filter((e) => e.at >= 0 && e.at <= t && isFinite(e.at)).sort((a, b) => b.at - a.at)[0];
  const event = lastEdge
    ? lastEdge.kind === "data"
      ? `${byId[lastEdge.from].title} → 200 · draft updated`
      : `${lastEdge.ev ? `${lastEdge.ev} ${lastEdge.guard ?? ""} ` : ""}→ ${byId[lastEdge.to].title}`
    : "call placed";

  const marks = [
    { t: at("no"), l: "no", br: true },
    ...BEATS.filter((b) => b.tool).map((b) => ({ t: b.t, l: MARK[b.tool!] ?? b.tool!, br: false })),
  ];
  const pct = (s: number) => `${Math.min(100, (s / total) * 100)}%`;

  const body = (n: WfNode, s: State): ReactNode => {
    const past = (id: string) => t >= at(id);
    switch (n.id) {
      case "flag":
        return <>UPI {inr(18000)} → refund.help@ybl · Demo Wallet · 14:53</>;
      case "api":
        return <pre className="wf-pre">{PAYLOADS.alert}</pre>;
      case "call":
        return (
          <>
            Bolna · saaras STT · gpt-4.1-mini · bulbul “Priya”
            <span className="wf-k">{s === "pending" ? "dialling…" : s === "active" ? `connected ${fmt(t)}` : t >= total - 0.5 ? `ended ${fmt(total)}` : `on call ${fmt(t)}`}</span>
          </>
        );
      case "lang":
        return past("lang") ? <>English · Bolna switches voice and prompt</> : <span lang="hi">“हिंदी में, या English में?”</span>;
      case "q":
        return (
          <>
            <span lang="hi">{PAYMENT_QUESTION.hi}</span>
            {past("no") && (
              <span className="wf-k">
                answer = <b className="c-red">no</b>
              </span>
            )}
          </>
        );
      case "yes":
        return <>[answer = yes] OTP/PIN reminder → marked genuine → hang up</>;
      case "safe":
        return <>Hang up the scammer, close the remote app.{past("hangup-ok") && <b> “Done.”</b>}</>;
      case "consent":
        return <>“I am an AI helper, not police or bank.”{past("consent-ok") && <b> “Yes, please.”</b>}</>;
      case "utr":
        return (
          <>
            {past("other-debits-ok") ? `${inr(10000)} · Google Pay · HDFC · 21:44` : "“Did any other money leave?”"}
            <Slots groups={UTR} t={t} motion={motion} />
          </>
        );
      case "scam":
        return (
          <>
            {past("access-ok") ? "AnyDesk → uninstall, change UPI PIN" : "“How did the scammer get in?”"}
            <Slots groups={PHONE} t={t} motion={motion} />
          </>
        );
      case "next":
        return <>Call 1930 or cybercrime.gov.in · tell the bank in writing today · keep screenshots</>;
      case "hook":
        return s === "done" ? <>guard false: 3/3 tools fired, nothing to backfill</> : <>idle · after hang-up, fills the case from the transcript if a tool was skipped</>;
      case "rules":
        return (
          <ul className="wf-never">
            <li>asks for an OTP or PIN</li>
            <li>files with 1930 itself</li>
            <li>claims to send an SMS</li>
            <li>promises a refund</li>
          </ul>
        );
      case "draft": {
        // each tool result changes a line when its packet lands; the line flashes for a moment
        const landAt = (id: string) => byId[id].s + TOOL.send + HOP;
        const [rc, tx, sc] = ["rc", "at", "sc"].map(landAt);
        const kv: [string, string, number][] = [
          ["consent", t >= rc ? "Rohit ✓" : "·", rc],
          ["debits", t >= tx ? `2 · ${inr(28000)}` : `1 · ${inr(18000)}`, tx],
          ["suspect", t >= sc ? "+91 90000 68912" : "refund.help@ybl", sc],
          ["status", t >= sc ? "ready for the bank" : t >= rc ? "building" : "waiting", t >= sc ? sc : rc],
        ];
        return (
          <dl className="wf-kv">
            {kv.map(([k, v, when]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd key={v} className={motion && t >= when && t - when < 1.5 ? "wf-new" : undefined}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        );
      }
      case "queue": {
        const rows = [
          ["Kamla Devi", inr(11500), "day 2 of 3"],
          ["Suresh", inr(250000), "day 5"],
        ];
        const ours = s !== "pending";
        return (
          <ol className="wf-q">
            {ours && (
              <li className="wf-q-new">
                <b>#1</b>
                <span>Rohit</span>
                <span>{inr(28000)}</span>
                <small>RBI window, day 1/3</small>
              </li>
            )}
            {rows.map(([nm, amt, w], i) => (
              <li key={nm}>
                <b>#{i + (ours ? 2 : 1)}</b>
                <span>{nm}</span>
                <span>{amt}</span>
                <small>{w}</small>
              </li>
            ))}
          </ol>
        );
      }
    }
    if (n.tool) {
      const { route, payload, reply } = n.tool;
      const since = t - n.s;
      const typing = s === "active" && motion && since < TOOL.type;
      const shown = typing ? Math.round(payload.length * Math.max(0, Math.min(1, (since - 0.15) / (TOOL.type - 0.15)))) : payload.length;
      return (
        <>
          <pre className="wf-pre">
            {payload.slice(0, shown)}
            {typing && <i className="wf-caret" />}
            <span className="wf-ghost">{payload.slice(shown)}</span>
          </pre>
          <span className="wf-res">
            {s === "pending" ? (
              <span className="text-mute">not called yet</span>
            ) : since < TOOL.reply && s === "active" ? (
              <>POST {route} …</>
            ) : (
              <>
                <b>200</b> {reply}
              </>
            )}
          </span>
        </>
      );
    }
    return null;
  };

  const status = (n: WfNode, s: State) =>
    s === "skip" ? "not taken" : s === "active" ? (n.kind === "tool" ? "firing" : "live") : s === "done" && n.kind !== "note" ? "✓" : n.id === "hook" ? "idle" : "";

  return (
    <div className={`wf${inView ? "" : " is-off"}`} ref={root}>
      <div className="wf-bar">
        <button className="wf-pp" type="button" onClick={toggle} aria-label={playing ? "Pause the call" : "Play the call"} aria-pressed={playing}>
          {playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
        </button>
        <span className="wf-tt">
          {fmt(t)} / {fmt(total)}
        </span>
        <div className="wf-scrub">
          <input type="range" min={0} max={total} step={0.1} value={Math.min(t, total)} onChange={(e) => seek(+e.target.value)} aria-label="Scrub through the call" />
          <span className="wf-rail">
            <i style={{ width: pct(t) }} />
          </span>
          {marks.map((m) => (
            <span key={m.l} className={`wf-mk${m.br ? " br" : ""}`} style={{ left: pct(m.t) }}>
              {m.l}
            </span>
          ))}
        </div>
        <span className="wf-run">
          <b>saathi-alert-call</b> · run DW-0412 · {playing ? "running" : t >= total - 0.25 ? "completed" : "paused"}
        </span>
      </div>
      <div className="wf-ev" aria-live="off">
        <span>{lastEdge ? fmt(lastEdge.at) : "00:00"}</span> {event}
      </div>

      <div className="wf-cv" ref={cv}>
        <div className="wf-stage" ref={stage}>
          <svg className="wf-svg" aria-hidden="true">
            {edges.map((e) => {
              const g = geo[e.id];
              if (!g) return null;
              const s = edgeState(e);
              return (
                <g key={e.id} className={`wf-e is-${s}${e.kind === "back" ? " is-back" : ""}`}>
                  <path d={g.d} />
                  <circle cx={g.end[0]} cy={g.end[1]} r={2.5} />
                  {hopping(e) && <Draw key={e.at} d={g.d} since={t - e.at} />}
                </g>
              );
            })}
          </svg>

          {edges.map((e) => {
            const g = geo[e.id];
            if (!g || !e.guard) return null;
            return (
              <span key={e.id} className={`wf-lab is-${edgeState(e)}${g.side ? " is-side" : ""}${e.kind === "back" ? " is-bk" : ""}`} style={{ left: g.lab[0], top: g.lab[1] }}>
                {e.ev && <b>{e.ev}</b>}
                {e.guard}
              </span>
            );
          })}

          {nodes.map((n) => {
            const s = states[n.id];
            const step = n.kind === "step" || n.kind === "decision";
            const say = s === "active" && step && beat.t >= n.s ? beat : null;
            return (
              <article
                key={n.id}
                ref={(el) => {
                  els.current[n.id] = el;
                }}
                className={`wf-n k-${n.kind} is-${s}`}
                style={{ "--c": n.c, "--r": n.r, "--o": n.o } as CSSProperties}
                aria-current={n.id === focus ? "step" : undefined}
              >
                <div className="wf-nh">
                  <span>{n.tag}</span>
                  <span className="wf-st">
                    {s === "active" && <i className="wf-dot" />}
                    {status(n, s)}
                  </span>
                </div>
                <div className="wf-in">
                  <h4 className="wf-nt">{n.title}</h4>
                  <div className="wf-nb">{body(n, s)}</div>
                  {step && n.id !== "yes" && (
                    <p className="wf-say">
                      {say ? (
                        <>
                          <b className={say.speaker === "rohit" ? "c-red" : "c-green"}>{say.speaker}</b> {say.text}
                        </>
                      ) : s === "done" ? (
                        <button type="button" onClick={() => seek(n.s)} aria-label={`Jump to ${n.title}`}>
                          {fmt(n.s)}–{fmt(n.e)}
                        </button>
                      ) : null}
                    </p>
                  )}
                </div>
              </article>
            );
          })}

          {moving &&
            edges.map((e) => {
              const g = geo[e.id];
              return g && hopping(e) ? <Packet key={`${e.id}@${e.at}`} d={g.d} since={t - e.at} data={e.kind === "data"} /> : null;
            })}
        </div>
      </div>

      <div className="wf-legend">
        <span>
          <i className="is-done" />
          done
        </span>
        <span>
          <i className="is-live" />
          live
        </span>
        <span>
          <i className="is-pending" />
          waiting
        </span>
        <span>
          <i className="is-skip" />
          not taken
        </span>
        <span>
          <i className="is-back" />
          backstop
        </span>
      </div>
    </div>
  );
}
