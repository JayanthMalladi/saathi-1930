const STATS = [
  { value: "₹52,976 cr", label: "lost to cyber fraud across 6 years", sub: "I4C data via IANS, 2026" },
  { value: "19.19 lakh", label: "complaints filed in 2024", sub: "≈ ₹19,813 cr lost that year" },
  { value: "₹11,000 cr", label: "saved by the 1930 system since 2021", sub: "roughly 1 rupee in 5 of losses" },
  { value: "3 days", label: "RBI working-day window for strongest protection", sub: "RBI/2017-18/15" },
];

export default function Stats() {
  return (
    <section className="sect" id="stats">
      <h2 className="h2">Why the first minutes matter</h2>
      <p className="h2-sub">
        The reporting system saves about one rupee in five; the rest is gone before anyone acts. Saathi works in the
        first minutes, not the first weeks.
      </p>
      <div className="stats">
        {STATS.map((s) => (
          <div key={s.label}>
            <b>{s.value}</b>
            <p className="mt-2 text-[13px] leading-snug">{s.label}</p>
            <p className="mt-1 text-[11px] text-mute">{s.sub}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-mute">
        Figures are taken from public reports and press coverage (sources under each number); they are not Saathi’s own
        data.
      </p>
    </section>
  );
}
