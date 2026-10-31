import { useMemo } from "react";

// A voice waveform strip. When `active`, bars animate (a speaking voice); when idle,
// they rest at a low baseline. Uses the theme accent.
export default function Waveform({
  active,
  bars = 36,
  height = 40,
  className = "",
  seed = 1,
}: {
  active: boolean;
  bars?: number;
  height?: number;
  className?: string;
  seed?: number;
}) {
  const phases = useMemo(
    () => Array.from({ length: bars }, (_, i) => (i * 1.7 + seed) % (Math.PI * 2)),
    [bars, seed]
  );

  return (
    <div
      className={`flex items-center gap-[3px] ${className}`}
      style={{ height, width: bars * 7 }}
      aria-hidden
    >
      {phases.map((ph, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full"
          style={{
            background: "var(--accent)",
            height: active ? "100%" : `${18 + (ph % 14)}%`,
            animation: active ? `wf ${0.9 + (ph % 0.9).toFixed(2)}s ease-in-out ${ph}s infinite` : "none",
            transform: active ? "scaleY(1)" : `scaleY(0.25)`,
            transformOrigin: "center",
            opacity: active ? 1 : 0.4,
            transition: "height .4s, opacity .4s",
          }}
        />
      ))}
      <style>{`@keyframes wf {0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}`}</style>
    </div>
  );
}
