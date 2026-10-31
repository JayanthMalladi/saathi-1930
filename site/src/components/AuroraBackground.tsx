import { useEffect, useRef } from "react";

// Full-viewport canvas: slow-drifting radial gradient blobs ("aurora") plus a faint
// grid. Colors read the theme's CSS vars so it re-skins on theme change.
export default function AuroraBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let w = 0;
    let h = 0;
    let t = 0;

    const blobs = [
      { x: 0.22, y: 0.28, r: 0.42, sp: 0.00023, ph: 0, key: "--accent" },
      { x: 0.74, y: 0.6, r: 0.5, sp: 0.00018, ph: 2.1, key: "--accent2" },
      { x: 0.5, y: 0.9, r: 0.44, sp: 0.00013, ph: 4.2, key: "--glow" },
    ];

    function cssVar(name: string) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function frame() {
      t += 1;
      ctx.clearRect(0, 0, w, h);
      const light = document.documentElement.getAttribute("data-theme") === "saathi";
      // faint grid
      ctx.strokeStyle = `rgba(${light ? "40,60,90" : "150,170,210"}, ${light ? 0.05 : 0.05})`;
      ctx.lineWidth = 1;
      const gs = 56;
      ctx.beginPath();
      for (let x = 0; x < w; x += gs) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += gs) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      ctx.globalCompositeOperation = light ? "multiply" : "lighter";
      for (const b of blobs) {
        const cx = (b.x + Math.sin(t * b.sp + b.ph) * 0.06) * w;
        const cy = (b.y + Math.cos(t * b.sp * 1.3 + b.ph) * 0.06) * h;
        const rr = b.r * Math.min(w, h);
        const col = cssVar(b.key) || "#22d3ee";
        const a = light ? 0.1 : 0.32;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
        g.addColorStop(0, hexToRgba(col, a));
        g.addColorStop(1, hexToRgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    }
    frame();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="fixed inset-0 -z-10 h-full w-full" aria-hidden />;
}

function hexToRgba(hex: string, a: number) {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
