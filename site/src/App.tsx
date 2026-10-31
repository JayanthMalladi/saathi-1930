import { CallEngineProvider } from "./engine/CallEngine";
import { JudgeSettingsProvider } from "./lib/JudgeSettings";
import AuroraBackground from "./components/AuroraBackground";
import ThemeSwitcher from "./components/ThemeSwitcher";
import Hero from "./sections/Hero";
import TheCall from "./sections/TheCall";
import HowItWorks from "./sections/HowItWorks";
import BankQueue from "./sections/BankQueue";
import JudgeConsole from "./sections/JudgeConsole";
import Stats from "./sections/Stats";
import Footer from "./sections/Footer";
import { Radio, Crosshair } from "lucide-react";

export default function App() {
  return (
    <CallEngineProvider>
      <JudgeSettingsProvider>
        <AuroraBackground />

        {/* sticky nav */}
        <nav
          className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6"
          style={{
            borderColor: "var(--line)",
            background: "color-mix(in srgb, var(--bg) 78%, transparent)",
            backdropFilter: "blur(14px)",
          }}
        >
          <a href="#top" className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl" style={{ background: "var(--glow-soft)", border: "1px solid var(--line)" }}>
              <Radio size={18} className="accent" />
            </div>
            <div>
              <p className="font-display text-[14px] font-bold leading-none">Saathi 1930</p>
              <p className="text-[10px] text-muted">first five minutes</p>
            </div>
          </a>
          <div className="hidden items-center gap-5 text-[13px] text-muted md:flex">
            <a href="#call" className="transition-colors hover:!text-[var(--ink)]">The call</a>
            <a href="#how" className="transition-colors hover:!text-[var(--ink)]">How it works</a>
            <a href="#queue" className="transition-colors hover:!text-[var(--ink)]">Bank queue</a>
            <a href="#demo" className="flex items-center gap-1.5 font-semibold" style={{ color: "var(--accent)" }}>
              <Crosshair size={14} /> Judge demo
            </a>
          </div>
          <ThemeSwitcher />
        </nav>

        <main id="top">
          <Hero />
          <TheCall />
          <HowItWorks />
          <BankQueue />
          <JudgeConsole />
          <Stats />
          <Footer />
        </main>
      </JudgeSettingsProvider>
    </CallEngineProvider>
  );
}
