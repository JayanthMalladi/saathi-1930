import { motion } from "framer-motion";
import AnimatedCounter from "../components/AnimatedCounter";

const STATS = [
  { to: 52976, prefix: "₹", suffix: " cr", label: "lost to cyber fraud across 6 years", sub: "I4C data via IANS, 2026" },
  { to: 19.19, decimals: 2, suffix: " lakh", label: "complaints filed in 2024", sub: "≈ ₹19,813 cr lost that year" },
  { to: 11000, prefix: "₹", suffix: " cr", label: "saved by the 1930 system since 2021", sub: "roughly 1 rupee in 5 of losses" },
  { to: 3, prefix: "", suffix: " days", label: "RBI working-day window for strongest protection", sub: "RBI/2017-18/15" },
];

export default function Stats() {
  return (
    <section id="stats" className="relative mx-auto max-w-6xl px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mb-10 max-w-2xl"
      >
        <span className="tag">04 · WHY IT MATTERS</span>
        <h2 className="font-display mt-4 text-3xl font-bold sm:text-4xl">
          Speed and complete details are the only lever.
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          The reporting system saves about one rupee in five — the rest is gone before anyone acts. Saathi works in
          the first minutes, not the first weeks.
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="surface relative overflow-hidden rounded-2xl p-5"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full" style={{ background: "var(--glow-soft)" }} />
            <p className="font-display text-3xl font-bold sm:text-[32px]" style={{ color: "var(--ink)" }}>
              <AnimatedCounter to={s.to} prefix={s.prefix ?? ""} suffix={s.suffix ?? ""} decimals={s.decimals ?? 0} />
            </p>
            <p className="mt-2 text-[13px] leading-snug">{s.label}</p>
            <p className="mt-1 text-[11px] text-muted">{s.sub}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
