import { motion } from "framer-motion";
import { THEMES, useTheme } from "../theme";
import { Moon, Sun, TerminalSquare } from "lucide-react";

const ICONS: Record<string, typeof Moon> = {
  noir: Moon,
  saathi: Sun,
  ops: TerminalSquare,
};

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      className="hairline surface flex items-center gap-1 rounded-full p-1"
      style={{ backdropFilter: "blur(10px)" }}
      role="tablist"
      aria-label="Design theme"
    >
      {THEMES.map((t) => {
        const I = ICONS[t.id];
        const on = theme === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            onClick={() => setTheme(t.id)}
            className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors"
            style={{ color: on ? "var(--bg)" : "var(--muted)" }}
          >
            {on && (
              <motion.span
                layoutId="theme-pill"
                className="absolute inset-0 rounded-full"
                style={{ background: "var(--accent)" }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <I size={13} />
              <span className="hidden sm:inline">{t.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
