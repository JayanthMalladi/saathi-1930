const LINKS = [
  { label: "/case/latest", desc: "live complaint page" },
  { label: "/bank", desc: "fraud-ops queue" },
  { label: "/call", desc: "Saathi calls you" },
  { label: "/bridge", desc: "voice test, two AI voices" },
];

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="logo" style={{ fontSize: 15 }}>
            saathi<span>/1930</span>
          </p>
          <p className="mt-2 max-w-[44em]">
            A voice project for the Bolna Symphony Buildathon. Built on Bolna (Sarvam STT/TTS + gpt-4.1-mini) with a
            FastAPI ops backend. Hindi/English, consent first, and it never asks for an OTP.
          </p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {LINKS.map((l) => (
              <span key={l.label}>
                <span className="c-green">{l.label}</span> {l.desc}
              </span>
            ))}
          </p>
        </div>
        <div>
          <p className="h2" style={{ fontSize: 11 }}>
            All data synthetic
          </p>
          <ul className="space-y-1">
            <li>· Names, phone numbers, UTRs and amounts are made up. Demo Wallet is fictional.</li>
            <li>
              · UTRs start with <b style={{ color: "var(--ink)" }}>9999</b> so they can’t match real transactions.
            </li>
            <li>· No real complaint is filed and nothing is sent to 1930. Saathi only drafts it for the bank.</li>
            <li>· Not affiliated with I4C or any bank. RBI rules are public, sourced in knowledge/.</li>
          </ul>
          <a className="btn-b mt-4" href="https://github.com/JayanthMalladi/saathi-1930" target="_blank" rel="noreferrer">
            View the repo →
          </a>
        </div>
      </div>
      <div className="wrap mt-6 flex flex-wrap justify-between gap-2">
        <span>saathi/1930 · Bolna Symphony Buildathon 2026 · demo build</span>
        <span>Never share your OTP or UPI PIN with anyone who calls you.</span>
      </div>
    </footer>
  );
}
