import { motion } from "framer-motion";
import { Play, Pause, RotateCcw } from "lucide-react";
import { BEATS, CALL_META, formAfterBeat } from "../data/callScript";
import { useCallEngine } from "../engine/CallEngine";
import VoiceAvatar from "./VoiceAvatar";
import Waveform from "./Waveform";

// The simulated call: two speaking avatars, a word-by-word transcript, the UTR slot
// readout, and a scrubber. Everything is driven by the shared CallEngine.
export default function CallReplay() {
  const eng = useCallEngine();
  const { idx, progress, playing, beat, toggle, jumpTo, replay } = eng;
  const active = beat ? beat.speaker : null;

  // typed words of the active line (while paused at a beat, show the whole line)
  const words = beat ? beat.text.split(" ") : [];
  const shown = !beat ? [] : playing ? words.slice(0, Math.max(1, Math.ceil(progress * words.length))) : words;

  // UTR slot: cumulative digits read so far
  const filled = formAfterBeat(idx).txns.length >= 2 ? 12 : utrDigits(idx);
  const utrDone = filled === 12;

  // elapsed clock
  const clock = clockAt(idx, progress);

  return (
    <div className="surface relative overflow-hidden rounded-3xl p-5 sm:p-7">
      {/* top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="pill pill--warn dot-live inline-flex items-center gap-2 !py-1.5">
            <span className="relative z-10 grid size-1.5 place-items-center rounded-full" style={{ background: "var(--warn)" }} />
            LIVE SIMULATION
          </span>
          <div className="text-[13px] text-muted">
            <b className="text-[var(--ink)]" style={{ color: "var(--ink)" }}>{CALL_META.caller}</b> · {CALL_META.fraud}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="mono text-[13px] text-muted">{clock}</span>
          <button className="btn btn--ghost !p-2" onClick={toggle} title={playing ? "Pause" : "Play"}>
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button className="btn btn--ghost !p-2" onClick={replay} title="Replay">
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* the two voices: side-by-side above the transcript on mobile, flanking it on sm+ */}
      <div className="mt-8 flex flex-col gap-4 sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-start sm:gap-6">
        <div className="flex justify-center gap-5 sm:contents">
          <div className="sm:col-start-1"><VoiceAvatar label="Saathi" role="AI first-response" active={active === "saathi"} side="left" /></div>
          <div className="sm:col-start-3"><VoiceAvatar label="Rohit" role="caller · victim" active={active === "rohit"} side="right" /></div>
        </div>

        <div className="min-w-0 sm:col-start-2 sm:row-start-1">
          {/* transcript: recent lines, active one typing in */}
          <div className="mx-auto flex w-full flex-col gap-2.5 sm:max-w-[430px]">
            {recent(idx).map(([i, b]) => {
              const isNow = i === idx;
              return (
                <div key={b.id} className={isNow ? "" : "opacity-45"}>
                  <Bubble who={b.speaker} text={isNow ? shown.join(" ") + (playing && idx >= 0 ? "▍" : "") : b.text} tool={b.tool} note={b.note} />
                </div>
              );
            })}
          </div>

          {/* waveform between/below */}
          <div className="mt-4 flex justify-center">
            <Waveform active={playing} bars={42} height={34} seed={active === "rohit" ? 5 : 2} />
          </div>
        </div>
      </div>

      {/* UTR readout */}
      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-muted">UTR read-back · 12 digits</span>
          {utrDone ? (
            <span className="pill pill--ok">✓ 9999 8885 9278 verified</span>
          ) : (
            <span className="pill" style={{ color: "var(--muted)" }}>
              {filled}/12
            </span>
          )}
        </div>
        <UtrSlots filled={filled} done={utrDone} />
      </div>

      {/* scrubber */}
      <div className="mt-7">
        <div className="flex flex-wrap items-center gap-1.5">
          {BEATS.map((b, i) => {
            const st = i < idx ? "past" : i === idx ? "now" : "future";
            return (
              <button
                key={b.id}
                title={`${b.id}${b.note ? " — " + b.note : ""}`}
                onClick={() => jumpTo(i)}
                className="group relative h-5 w-5"
              >
                <span
                  className={`grid size-5 place-items-center rounded-full border text-[10px] transition-all ${
                    st === "now" ? "scale-110" : st === "past" ? "" : "opacity-45"
                  }`}
                  style={{
                    borderColor: st === "now" ? "var(--accent)" : st === "past" ? "var(--accent)" : "var(--line)",
                    background: st === "past" ? "var(--glow-soft)" : st === "now" ? "var(--accent)" : "transparent",
                    color: st === "now" ? "var(--bg)" : "var(--muted)",
                  }}
                >
                  {i + 1}
                </span>
              </button>
            );
          })}
          <span className="ml-2 text-[11px] text-muted">click any step to jump · loop plays on its own</span>
        </div>
      </div>
    </div>
  );
}

function Bubble({ who, text, tool, note }: { who: "saathi" | "rohit"; text: string; tool?: string; note?: string }) {
  const isS = who === "saathi";
  return (
    <div className={isS ? "self-start" : "self-end"}>
      <div
        className="surface2 hairline max-w-[95%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed"
        style={{
          background: isS ? "var(--surface)" : "var(--surface2)",
          border: `1px solid ${isS ? "color-mix(in srgb, var(--accent) 35%, transparent)" : "var(--line)"}`,
          boxShadow: isS ? "0 0 24px -12px var(--glow)" : "none",
        }}
      >
        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: isS ? "var(--accent)" : "var(--muted)" }}>
          {isS ? "Saathi" : "Rohit"}
        </div>
        {text || <span className="text-muted">▍</span>}
      </div>
      {tool && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 flex items-center gap-1.5 text-[11px] mono"
          style={{ color: "var(--accent)" }}
        >
          <span className="size-1.5 rounded-full dot-live" style={{ background: "var(--accent)" }} />
          ⚙ {tool}() called
        </motion.div>
      )}
      {note && <div className="mt-1 text-[11px] italic text-muted">{note}</div>}
    </div>
  );
}

function UtrSlots({ filled, done }: { filled: number; done: boolean }) {
  const digits = "999988859278".slice(0, filled);
  return (
    <div className="flex gap-1.5 sm:gap-2">
      {Array.from({ length: 12 }).map((_, i) => {
        const group = Math.floor(i / 4);
        const gap = group > 0 && i % 4 === 0 ? 14 : undefined;
        const d = digits[i];
        return (
          <span
            key={i}
            className={`grid h-9 w-7 place-items-center rounded-md border text-[15px] sm:h-10 sm:w-8 sm:text-[17px] ${d ? "slot-in" : ""}`}
            style={{
              marginLeft: gap,
              borderColor: done ? "var(--ok)" : d ? "var(--accent)" : "var(--line)",
              color: d ? "var(--ink)" : "var(--muted)",
              background: d ? "var(--glow-soft)" : "transparent",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {d ?? "–"}
          </span>
        );
      })}
    </div>
  );
}

function recent(idx: number): [number, (typeof BEATS)[number]][] {
  const out: [number, (typeof BEATS)[number]][] = [];
  for (let i = Math.max(0, idx - 3); i <= idx; i++) out.push([i, BEATS[i]]);
  return out;
}

function clockAt(idx: number, progress: number) {
  let s = 0;
  for (let i = 0; i < idx; i++) s += durOf(i);
  if (idx >= 0) s += durOf(idx) * Math.min(progress, 1);
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

function durOf(i: number) {
  const b = BEATS[i];
  return b.dur ?? Math.max(3, Math.min(11, b.text.length / 2.6));
}

function utrDigits(idx: number) {
  // pieces are read on beats "utr-1","utr-2","utr-3"; each adds 4 digits
  const ids = BEATS.slice(0, idx + 1).map((b) => b.id);
  return ["utr-1", "utr-2", "utr-3"].filter((x) => ids.includes(x)).length * 4;
}
