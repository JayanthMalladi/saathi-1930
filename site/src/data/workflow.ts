// The "How it works" workflow graph: one alert, end to end, as nodes and edges on the call's clock.
// Every time below comes from a beat in callScript.ts (by id or by the tool it fires), so retiming the
// recording there retimes the graph too. The only numbers kept here are the short animation spans.
import { BEATS, beatIndex, type Txn } from "./callScript";

/** when the beat with this id starts, in seconds */
export const at = (id: string) => BEATS[beatIndex(id)].t;
const toolAt = (name: string) => BEATS.find((b) => b.tool === name)!.t;

/** a tool node's life after its beat starts: payload types out, the 200 comes back, the result flies to the draft */
export const TOOL = { type: 2, reply: 2.3, send: 2.6, span: 3.4 };
/** seconds a packet takes along an edge (the edge draws itself over the same span) */
export const HOP = 0.8;

export type NodeKind = "step" | "decision" | "tool" | "plain" | "note";

export type WfNode = {
  id: string;
  tag: string;
  title: string;
  kind: NodeKind;
  /** desktop grid cell (6 x 3) */
  c: number;
  r: number;
  /** position in the single-column (mobile) flow */
  o: number;
  /** reached at `reach` (drawn solid), live over [s, e), done after; a skipped branch goes dim at `skipAt` */
  reach: number;
  s: number;
  e: number;
  skipAt?: number;
  /** tool nodes: the backend route, the JSON the agent sends, and what comes back */
  tool?: { route: string; payload: string; reply: string };
};

export type WfEdge = {
  id: string;
  from: string;
  to: string;
  /** when the packet leaves `from` */
  at: number;
  /** event and guard, Stately style: `UTR.CONFIRMED` / `[12 digits]` */
  ev?: string;
  guard?: string;
  /** skip: the branch not taken · back: the webhook backstop · data: a tool result going to the draft */
  kind?: "skip" | "back" | "data";
  /** which gutter lane the edge uses in the single column when it jumps over nodes */
  lane?: number;
};

const second = BEATS.find((b) => b.tool === "add_transaction")!.form!.txn as Txn;
const flagged = BEATS.find((b) => b.form?.txn?.known)!.form!.txn as Txn;
const json = (o: object) => JSON.stringify(o, null, 1);

export const PAYLOADS = {
  alert: json({ name: "Rohit", amount: flagged.amount, payee: "refund.help@ybl" }),
  record_consent: json({ caller_name: "Rohit", is_account_holder: true }),
  add_transaction: json({
    amount_inr: second.amount,
    utr_or_ref: second.utr.replace(/\s/g, ""),
    mode: second.mode,
    app: second.app,
    bank: second.bank,
  }),
  submit_case: json({
    fraud_type: "fake customer care, remote app",
    suspect_phone: "+91 90000 68912",
    suspect_vpa_or_account: "refund.help@ybl",
    language: "en",
  }),
};

/** the graph for a call of length `total` (the webhook runs as the call ends) */
export function workflow(total: number): { nodes: WfNode[]; edges: WfEdge[] } {
  const rc = toolAt("record_consent");
  const tx = toolAt("add_transaction");
  const sc = toolAt("submit_case");
  const draftS = sc + TOOL.send + HOP; // submit_case's result lands
  const queueS = draftS + 1.6;
  const hookS = Math.min(at("bye") + 2, total - 1);

  const n = (
    id: string,
    tag: string,
    title: string,
    kind: NodeKind,
    [c, r, o]: [number, number, number],
    s: number,
    e: number,
    extra: Partial<WfNode> = {}
  ): WfNode => ({ id, tag, title, kind, c, r, o, reach: s, s, e, ...extra });
  const tool = (id: string, name: string, route: string, reply: string, cell: [number, number, number]) =>
    n(id, "tool call", `${name}()`, "tool", cell, toolAt(name), toolAt(name) + TOOL.span, {
      tool: { route, payload: PAYLOADS[name as keyof typeof PAYLOADS], reply },
    });

  const nodes: WfNode[] = [
    n("flag", "trigger", "Fraud engine flags a debit", "plain", [1, 1, 1], -2, -1),
    n("api", "backend", "POST /api/alert-call", "plain", [2, 1, 2], -1, 0),
    n("call", "bolna", "Saathi calls Rohit", "step", [3, 1, 3], 0, at("lang")),
    n("lang", "bolna", "Language choice", "step", [4, 1, 4], at("lang"), at("alert")),
    n("q", "decision", "Was this you?", "decision", [5, 1, 5], at("alert"), at("no")),
    n("yes", "yes path", "Genuine payment", "step", [6, 1, 6], Infinity, Infinity, { reach: Infinity, skipAt: at("no") }),
    n("safe", "no path", "Safety step first", "step", [1, 2, 7], at("no"), at("consent")),
    n("consent", "bolna", "AI disclosure + consent", "step", [2, 2, 8], at("consent"), at("other-debits")),
    n("utr", "bolna", "Other debits + UTR", "step", [3, 2, 10], at("other-debits"), at("access")),
    n("scam", "bolna", "How they got in + read-back", "step", [4, 2, 12], at("access"), at("next-1930")),
    n("next", "bolna", "Next steps", "step", [5, 2, 16], at("next-1930"), hookS),
    n("hook", "webhook", "Post-call backstop", "step", [6, 2, 17], hookS, hookS + 0.8),
    n("rules", "guardrails", "Saathi never…", "note", [1, 3, 18], -9, -9),
    tool("rc", "record_consent", "/api/consent", '{"ok":true}', [2, 3, 9]),
    tool("at", "add_transaction", "/api/transaction", '{"ok":true}', [3, 3, 11]),
    tool("sc", "submit_case", "/api/submit", '{"ok":true,"case_id":"DW-0412"}', [4, 3, 13]),
    // the draft is touched by each tool result, and goes live when submit_case's lands
    n("draft", "backend", "1930-ready complaint draft", "plain", [5, 3, 14], draftS, queueS, { reach: rc + TOOL.send + HOP }),
    n("queue", "bank", "Fraud-ops queue", "plain", [6, 3, 15], queueS, at("next-1930")),
  ];

  const e = (from: string, to: string, extra: Partial<WfEdge> = {}): WfEdge => {
    const target = nodes.find((x) => x.id === to)!;
    return { id: `${from}-${to}`, from, to, at: target.reach, ...extra };
  };
  const edges: WfEdge[] = [
    e("flag", "api"),
    e("api", "call"),
    e("call", "lang"),
    e("lang", "q"),
    e("q", "yes", { kind: "skip", at: at("no") }),
    e("q", "safe", { ev: "ANSWER", guard: "[answer = no]", lane: 1 }),
    e("safe", "consent"),
    e("consent", "rc", { ev: "CONSENT", guard: "[consent = yes]" }),
    e("consent", "utr", { lane: 1 }),
    e("utr", "at", { ev: "UTR.CONFIRMED", guard: "[12 digits]" }),
    e("utr", "scam", { lane: 1 }),
    e("scam", "sc", { ev: "PHONE.CONFIRMED", guard: "[10 digits]" }),
    e("scam", "next", { lane: 1 }),
    e("next", "hook"),
    e("rc", "draft", { kind: "data", at: rc + TOOL.send, lane: 3 }),
    e("at", "draft", { kind: "data", at: tx + TOOL.send, lane: 2 }),
    e("sc", "draft", { kind: "data", at: sc + TOOL.send }),
    e("draft", "queue", { ev: "enqueue", at: queueS - HOP }),
    e("hook", "draft", { kind: "back", ev: "call.ended", guard: "[a tool was skipped]", at: Infinity }),
  ];
  return { nodes, edges };
}
