import { useMemo } from "react";
import { BEATS, beatAt } from "../data/callScript";
import { useCallEngine } from "../engine/CallEngine";

// Deterministic bars across the whole call: Saathi's turns louder (ink), Rohit's quieter (red).
// Bars up to the current time are lit; clicking seeks.
export default function Waveform({ bars = 80 }: { bars?: number }) {
  const { time, total, seek } = useCallEngine();

  const shape = useMemo(() => {
    let seed = 7;
    return Array.from({ length: bars }, (_, i) => {
      seed = (seed * 9301 + 49297) % 233280;
      const r = seed / 233280;
      const at = (i / bars) * total;
      const who = BEATS[beatAt(at)].speaker;
      return { at, who, h: who === "saathi" ? 30 + r * 70 : 15 + r * 45 };
    });
  }, [bars, total]);

  return (
    <button
      type="button"
      className="wave"
      aria-label="Seek in the call"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        seek(((e.clientX - r.left) / r.width) * total);
      }}
    >
      {shape.map((b, i) => {
        const on = b.at <= time;
        const now = on && (i + 1 >= bars || shape[i + 1].at > time);
        return <i key={i} className={`wv wv--${b.who}${on ? " on" : ""}${now ? " now" : ""}`} style={{ height: `${b.h.toFixed(0)}%` }} />;
      })}
    </button>
  );
}
