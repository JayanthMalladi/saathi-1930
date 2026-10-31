import { motion } from "framer-motion";

// An SVG person whose mouth opens while speaking and who emits expanding voice rings.
// `active` = this person is the one talking right now.
export default function VoiceAvatar({
  label,
  role,
  active,
  side = "left",
}: {
  label: string;
  role: string;
  active: boolean;
  side?: "left" | "right";
}) {
  const accent = "var(--accent)";
  return (
    <div
      className="relative flex flex-col items-center gap-3"
      style={{ width: 148 }}
      aria-hidden={!active ? undefined : undefined}
    >
      <div className="relative">
        {/* voice rings, only while active */}
        {[0, 1, 2].map((i) =>
          active ? (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full"
              style={{ border: `1.5px solid ${accent}`, opacity: 0 }}
              initial={false}
              animate={{ scale: [1, 1.85], opacity: [0.55, 0] }}
              transition={{ duration: 1.8, delay: i * 0.55, repeat: Infinity, ease: "easeOut" }}
            />
          ) : null
        )}

        <motion.div
          className="relative grid place-items-center rounded-full"
          style={{
            width: 120,
            height: 120,
            background: active ? "var(--glow-soft)" : "var(--surface2)",
            border: `1px solid ${active ? accent : "var(--line)"}`,
            boxShadow: active ? `0 0 44px -6px var(--glow)` : "none",
            transition: "background .4s, box-shadow .4s",
          }}
          animate={{ scale: active ? [1, 1.03, 1] : 1 }}
          transition={{ duration: active ? 1.1 : 0.4, repeat: active ? Infinity : 0, ease: "easeInOut" }}
        >
          <PersonIcon active={active} flip={side === "right"} />
        </motion.div>
      </div>

      <div className="text-center">
        <div className="font-display text-[15px] font-semibold">{label}</div>
        <div className="text-[12px] text-muted">{role}</div>
      </div>
    </div>
  );
}

// Simple, expressive speaker glyph: head + shoulders, mouth that opens/closes.
function PersonIcon({ active, flip }: { active: boolean; flip: boolean }) {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
      {/* shoulders */}
      <path d="M12 62c0-9 9-15 24-15s24 6 24 15" fill="none" stroke="var(--ink)" strokeWidth="2" opacity="0.25" />
      {/* head */}
      <circle cx="36" cy="27" r="13" fill="none" stroke="var(--ink)" strokeWidth="2.4" opacity="0.75" />
      {/* eyes */}
      <circle cx="31.5" cy="25.5" r="1.4" fill="var(--ink)" opacity="0.7" />
      <circle cx="40.5" cy="25.5" r="1.4" fill="var(--ink)" opacity="0.7" />
      {/* mouth: a line that becomes an open ellipse while active */}
      {active ? (
        <motion.ellipse
          cx="36"
          cy="31"
          rx="3.4"
          fill="var(--accent)"
          initial={{ ry: 1 }}
          animate={{ ry: [1, 3.4, 2.2, 3.2] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : (
        <path d="M33 31.5c1.6 1.2 4.4 1.2 6 0" fill="none" stroke="var(--ink)" strokeWidth="1.8" opacity="0.6" strokeLinecap="round" />
      )}
      {/* a phone/earpiece hint */}
      <path d="M48 21c3 1 5 4 5 7" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" opacity={active ? 0.9 : 0.35} />
    </svg>
  );
}
