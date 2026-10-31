import { useRef, type ReactNode } from "react";

// 21st.dev-style "spotlight card": a cursor-tracked radial glow behind the card's content.
export default function GlowCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`group relative overflow-hidden surface rounded-2xl p-5 ${className}`}
      style={{
        background:
          "radial-gradient(260px circle at var(--mx, 50%) var(--my, 0%), var(--glow-soft), transparent 70%), var(--surface)",
        border: "1px solid var(--line)",
      }}
    >
      {children}
    </div>
  );
}
