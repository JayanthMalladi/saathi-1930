import { Github, Radio } from "lucide-react";

const LINKS = [
  { label: "/case/latest", desc: "live complaint page" },
  { label: "/bank", desc: "fraud-ops queue" },
  { label: "/call", desc: "Saathi calls you" },
  { label: "/bridge", desc: "voice test, two AI voices" },
];

export default function Footer() {
  return (
    <footer className="relative border-t px-6 py-14" style={{ borderColor: "var(--line)", background: "var(--bg2)" }}>
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl" style={{ background: "var(--glow-soft)", border: "1px solid var(--line)" }}>
              <Radio size={22} className="accent" />
            </div>
            <div>
              <p className="font-display text-[18px] font-bold">Saathi 1930</p>
              <p className="text-[12px] text-muted">a calm voice for the first minutes after fraud</p>
            </div>
          </div>
          <p className="mt-5 max-w-md text-[13px] leading-relaxed text-muted">
            A voice project for the BOLNA AI Symphony Buildathon. Built on Bolna (Sarvam STT/TTS + gpt-4.1-mini) with
            a FastAPI ops backend on Render. Hinglish-first, consent-first, and it never asks for an OTP.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {LINKS.map((l) => (
              <span key={l.label} className="tag">
                <span className="mono accent">{l.label}</span>
                <span className="text-muted">{l.desc}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="md:justify-self-end">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-muted">All data synthetic</p>
          <ul className="space-y-2 text-[13px] text-muted">
            <li>· Names, UTRs and amounts are made up.</li>
            <li>· UTRs start with <span className="mono accent">9999</span> so they can't match real transactions.</li>
            <li>· No real complaint is filed; nothing is sent to 1930. Saathi only drafts it for the bank.</li>
            <li>· RBI rules are public, sourced in <span className="mono">knowledge/</span>.</li>
          </ul>
          <a
            className="btn btn--ghost mt-6"
            href="https://github.com/JayanthMalladi/saathi-1930"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={16} /> View the repo
          </a>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t pt-6 text-[12px] text-muted" style={{ borderColor: "var(--line)" }}>
        <span>© 2026 · Saathi 1930 · demo build</span>
        <span>Never share your OTP or UPI PIN with anyone who calls you.</span>
      </div>
    </footer>
  );
}
