// Infinite horizontal ticker. Children are duplicated so the -50% translate loops seamlessly.
export default function Marquee({ items, className = "" }: { items: string[]; className?: string }) {
  const row = (
    <div className="marquee-track">
      {[...items, ...items].map((s, i) => (
        <span key={i} className="mx-6 inline-flex items-center gap-6 text-[13px] text-muted">
          <span className="inline-block size-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          {s}
        </span>
      ))}
    </div>
  );
  return (
    <div className={`surface hairline overflow-hidden py-3 ${className}`}>
      <div className="relative flex overflow-hidden">
        {row}
      </div>
    </div>
  );
}
