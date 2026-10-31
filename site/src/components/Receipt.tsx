import type { ReactNode } from "react";
import { BEATS, beatIndex, type Txn } from "../data/callScript";
import { fmt, useCallEngine } from "../engine/CallEngine";

// The complaint draft as a thermal-paper receipt that prints line by line as the call reaches each beat.
// Every value comes from the call script; the UTR and the scammer's phone fill in box groups as they are read.

const FLAGGED = BEATS.find((b) => b.form?.txn?.known)!.form!.txn as Txn;
const SECOND = BEATS.find((b) => b.tool === "add_transaction")!.form!.txn as Txn;
const UTR_GROUPS = BEATS.flatMap((b, i) => (b.utr ? b.utr.map((u) => ({ digits: u.digits, at: i })) : []));
const PHONE_GROUPS = BEATS.flatMap((b, i) => (b.phone ? [{ digits: b.phone, at: i }] : []));

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const stamp = (id: string) => `+${fmt(BEATS[beatIndex(id)].t)}`;

export default function Receipt() {
  const { idx, form, time, total } = useCallEngine();
  const reached = (id: string) => idx >= beatIndex(id);
  const done = time >= total;
  const atStake = FLAGGED.amount + (reached("other-debits-ok") ? SECOND.amount : 0);

  return (
    <div className="rcpt" aria-live="off">
      <div className="r-c r-big">SAATHI · CASE DW-0412</div>
      <div className="r-c">
        Demo Wallet fraud team
        <br />
        1930-ready complaint draft
      </div>
      <hr className="r-hr" />

      <Row k={FLAGGED.time}>
        FLAGGED {inr(FLAGGED.amount)} → {form.suspect?.vpa ?? "refund.help@ybl"}
        <br />
        <small className="text-[11px]" style={{ color: "var(--rcpt-mute)" }}>on file from the bank’s alert</small>
      </Row>
      {reached("no") && (
        <Row k={stamp("no")}>
          <span className="r-red">CUSTOMER: “NOT ME”</span>
          {form.incident?.fraudType && <><br />{form.incident.fraudType}</>}
        </Row>
      )}
      {reached("hangup-ok") && (
        <Row k={stamp("hangup-ok")}>
          Scammer call ended, remote app closed <span className="r-ok">✓</span>
        </Row>
      )}
      {reached("consent-ok") && (
        <Row k={stamp("consent-ok")}>
          AI disclosed · consent to share <span className="r-ok">✓</span>
          <br />
          <span className="r-tool">record_consent()</span>
        </Row>
      )}
      {reached("other-debits-ok") && (
        <>
          <Row k={stamp("other-debits-ok")}>
            2ND DEBIT {inr(SECOND.amount)} · {SECOND.bank} · {SECOND.app} · {SECOND.time}
          </Row>
          <Row k="UTR">
            <Digits groups={UTR_GROUPS} idx={idx} label="UTR" />
          </Row>
        </>
      )}
      {reached("utr-3-echo") && (
        <Row k="">
          12 digits read back <span className="r-ok">✓</span>
          <br />
          <span className="r-tool">add_transaction()</span>
        </Row>
      )}
      {reached("access-ok") && form.incident?.description && (
        <Row k={stamp("access-ok")}>HOW: {form.incident.description}</Row>
      )}
      {reached("suspect-1") && (
        <Row k={stamp("suspect-1")}>
          SCAMMER PH
          <Digits groups={PHONE_GROUPS} idx={idx} label="Scammer phone" />
        </Row>
      )}

      <hr className="r-hr2" />
      <div className="r-tot">
        <span>AT STAKE</span>
        <span>{inr(atStake)}</span>
      </div>
      <Row k="RBI">strongest protection if the bank hears within 3 working days</Row>
      <hr className="r-hr" />

      {reached("submit") && (
        <div className="print-in">
          <span className="r-tool">submit_case()</span> &nbsp;draft queued for the bank’s fraud ops
        </div>
      )}
      {reached("next-1930") && (
        <div className="print-in">
          NEXT: customer calls <b>1930</b> or files at cybercrime.gov.in
        </div>
      )}
      {reached("next-bank") && <div className="print-in">+ tells the bank in writing today</div>}
      {!done ? <div className="r-pend">listening…</div> : <div className="print-in">-- call ended --</div>}

      <div className="barcode" aria-hidden="true" />
      <div className="r-note">
        Draft only. Saathi does not file with 1930 and never promises a refund. Synthetic data: UTRs start 9999.
      </div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="r-row print-in">
      <span className="k">{k}</span>
      <span className="v">{children}</span>
    </div>
  );
}

function Digits({ groups, idx, label }: { groups: { digits: string; at: number }[]; idx: number; label: string }) {
  const filled = groups.filter((g) => idx >= g.at).map((g) => g.digits);
  return (
    <span className="digits" role="img" aria-label={`${label}: ${filled.join(" ") || "not read yet"}`}>
      {groups.map((g, gi) => (
        <span key={gi} className={`dg${idx >= g.at ? " filled" : ""}`}>
          {g.digits.split("").map((d, di) => (
            <i key={di}>{idx >= g.at ? d : ""}</i>
          ))}
        </span>
      ))}
    </span>
  );
}
