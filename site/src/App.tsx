import { CallEngineProvider, useCallEngine } from "./engine/CallEngine";
import { JudgeSettingsProvider } from "./lib/JudgeSettings";
import ThemeToggle from "./components/ThemeToggle";
import PlayerBar from "./components/PlayerBar";
import Hero from "./sections/Hero";
import TheCall from "./sections/TheCall";
import HowItWorks from "./sections/HowItWorks";
import BankQueue from "./sections/BankQueue";
import JudgeConsole from "./sections/JudgeConsole";
import Stats from "./sections/Stats";
import Footer from "./sections/Footer";

export default function App() {
  return (
    <CallEngineProvider>
      <JudgeSettingsProvider>
        <div className="wrap" id="top">
          <StatusLine />
          <header className="topbar">
            <a className="logo" href="#top">
              saathi<span>/1930</span>
            </a>
            <nav className="topnav" aria-label="Sections">
              <a href="#record">the call</a>
              <a href="#queue">bank queue</a>
              <a href="#how">how it works</a>
              <a href="#demo">judge demo</a>
            </nav>
            <ThemeToggle />
          </header>
          <Hero />
        </div>

        <PlayerBar />

        <main className="wrap">
          <TheCall />
          <BankQueue />
          <HowItWorks />
          <JudgeConsole />
          <Stats />
        </main>
        <Footer />
      </JudgeSettingsProvider>
    </CallEngineProvider>
  );
}

function StatusLine() {
  const { recording } = useCallEngine();
  return (
    <div className="status">
      <span className="rec-dot c-red">{recording ? "REENACTMENT · Saathi's real lines and voice, synthetic data" : "REPLAY · simulated call, synthetic data"}</span>
      <span>Bolna Symphony Buildathon · voice entry</span>
      <span>
        <b>Demo Wallet</b> is fictional · UTRs start 9999
      </span>
    </div>
  );
}
