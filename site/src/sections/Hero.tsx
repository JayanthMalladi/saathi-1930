import { Pause, Play, RotateCcw } from "lucide-react";
import { BEATS, PAYMENT_QUESTION } from "../data/callScript";
import { fmt, useCallEngine } from "../engine/CallEngine";
import Waveform from "../components/Waveform";

export default function Hero() {
  return (
    <section className="hero">
      <div>
        <div className="stamp-time">
          <b className="c-red">14:53</b> ₹18,000 debit flagged by Demo Wallet fraud engine &nbsp;→&nbsp;{" "}
          <b className="c-green">minutes later</b> Saathi dials
        </div>
        <h1>
          ₹18,000 left Rohit’s wallet at 14:53. <span className="c-green">Minutes later, his phone rang.</span>
        </h1>
        <p className="hero-sub">
          Saathi is a Hindi/English voice agent for fintech fraud teams. It calls the customer about a flagged UPI
          debit and asks one question. If the answer is no, the same call becomes a 1930-ready complaint draft in the
          bank’s fraud queue, and the customer is told to call 1930 themselves.
        </p>
        <p className="fork-q">
          “{PAYMENT_QUESTION.en}”
          <span lang="hi">“{PAYMENT_QUESTION.hi}”</span>
        </p>
        <div className="fork">
          <div>
            <b className="c-green">YES</b>
            <p>“Never share your OTP or PIN.” Call ends, the alert is cleared.</p>
          </div>
          <div>
            <b className="c-red">NO</b>
            <p>Hang up the scammer. Consent. Other debits, UTRs, scammer’s number. A draft for the bank; the customer calls 1930.</p>
          </div>
        </div>
      </div>
      <CallCard />
    </section>
  );
}

function CallCard() {
  const { time, total, beat, playing, hasPlayed, recording, toggle, skip, replay } = useCallEngine();
  const ended = time >= total;
  const state = playing ? "● on call" : !hasPlayed ? "preview · paused" : ended ? "call ended" : "paused";
  const rohit = beat.speaker === "rohit";

  return (
    <div className="callcard" id="call" aria-label="Call player">
      <div className="cc-top">
        <span>OUTBOUND · Bolna</span>
        <span className={playing ? "c-green" : ""}>{state}</span>
      </div>
      <div className="cc-name">
        Saathi → Rohit
        <small>Demo Wallet fraud team · voice “Priya” · English</small>
      </div>
      <div className="timer">
        {fmt(time)} <small>/ {fmt(total)}</small>
      </div>
      <div className="caption" aria-live={playing ? "off" : "polite"}>
        <div className={`who${rohit ? " is-r" : ""}`}>{rohit ? "Rohit" : "Saathi"}</div>
        {beat.hi ? <p lang="hi">{beat.hi}</p> : <p>{beat.text}</p>}
      </div>
      <Waveform />
      <div className="ctrl">
        <button className="skip" type="button" onClick={() => skip(-10)} aria-label="Back 10 seconds">
          -10s
        </button>
        <button className="play" type="button" onClick={ended ? replay : toggle} aria-pressed={playing}>
          {playing ? <Pause size={16} fill="currentColor" /> : ended ? <RotateCcw size={16} /> : <Play size={16} fill="currentColor" />}
          {playing ? "PAUSE" : ended ? "PLAY AGAIN" : hasPlayed ? "RESUME" : "PLAY THE CALL"}
        </button>
        <button className="skip" type="button" onClick={() => skip(10)} aria-label="Forward 10 seconds">
          +10s
        </button>
      </div>
      <div className="slot">
        {recording
          ? "// audio: the Bolna recording, Saathi and a synthetic caller"
          : `// no recording loaded: a ${BEATS.length}-line replay of the real call flow on a simulated clock`}
      </div>
    </div>
  );
}
