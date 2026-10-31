import { motion } from "framer-motion";
import {
  Phone,
  Mic,
  Cpu,
  Volume2,
  Wrench,
  Webhook,
  FileText,
  Building2,
  ShieldCheck,
  Ban,
  AlertTriangle,
  Clock,
  MessageSquare,
} from "lucide-react";
import GlowCard from "../components/GlowCard";

const PIPELINE = [
  { icon: Phone, label: "Caller dials in", sub: "Hindi / English / Hinglish", c: "var(--accent)" },
  { icon: Mic, label: "Sarvam STT", sub: "Hindi+English, 1.6s patient", c: "var(--accent2)" },
  { icon: Cpu, label: "gpt-4.1-mini", sub: "tool-calling, temp 0.2", c: "var(--accent)" },
  { icon: Volume2, label: "Sarvam TTS", sub: "voice: Priya", c: "var(--accent2)" },
];

const TOOLS = ["record_consent", "add_transaction", "submit_case"];
const SINKS = [
  { icon: FileText, label: "/case/latest", sub: "1930-ready complaint draft" },
  { icon: Building2, label: "/bank", sub: "bank gets the case" },
];

const SAFETY = [
  { icon: Ban, title: "Never asks for OTP", body: "If the caller offers an OTP or PIN, Saathi stops them. No CVV, no password, no remote app." },
  { icon: MessageSquare, title: "Never promises a refund", body: "Says reporting fast with exact details gives the best chance the money is held. No guesses on timing." },
  { icon: ShieldCheck, title: "Warns about fake agents", body: "Anyone calling to 'recover' the money for a fee is a second scammer. 1930 and banks never charge." },
  { icon: Clock, title: "Tracks the RBI window", body: "Each case carries how many working days since fraud — 3-day and 7-day protection tiers." },
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative mx-auto max-w-6xl px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mb-10 max-w-2xl"
      >
        <span className="tag">02 · HOW IT WORKS</span>
        <h2 className="font-display mt-4 text-3xl font-bold sm:text-4xl">
          A voice pipeline on Bolna, wired to a FastAPI ops backend.
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          The caller talks to a phone agent. The same conversation drives the live complaint page and the bank queue.
          Follow the dots.
        </p>
      </motion.div>

      {/* pipeline */}
      <div className="surface overflow-hidden rounded-3xl p-6 sm:p-8">
        {/* voice chain */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {PIPELINE.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="surface2 hairline relative rounded-2xl p-4"
            >
              <div className="mb-3 grid size-10 place-items-center rounded-xl" style={{ background: "var(--glow-soft)", color: p.c }}>
                <p.icon size={20} />
              </div>
              <p className="text-[14px] font-semibold">{p.label}</p>
              <p className="text-[12px] text-muted">{p.sub}</p>
              {i < PIPELINE.length - 1 && (
                <motion.span
                  className="absolute right-[-14px] top-1/2 z-10 hidden size-2 -translate-y-1/2 rounded-full sm:block"
                  style={{ background: "var(--accent)" }}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.3 }}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* connector */}
        <div className="relative my-6 grid place-items-center">
          <div className="h-px w-full" style={{ background: "var(--line)" }} />
          <div className="absolute flex items-center gap-2 rounded-full px-4 py-1.5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
            <span className="text-[12px] text-muted">three tool calls fire mid-conversation</span>
            {TOOLS.map((t) => (
              <span key={t} className="mono rounded px-1.5 py-0.5 text-[11px]" style={{ background: "var(--glow-soft)", color: "var(--accent)" }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* sinks */}
        <div className="grid gap-4 sm:grid-cols-2">
          {SINKS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="surface2 hairline flex items-center gap-4 rounded-2xl p-4"
            >
              <div className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: "var(--glow-soft)", color: "var(--accent)" }}>
                <s.icon size={22} />
              </div>
              <div>
                <p className="mono text-[14px] font-semibold">{s.label}</p>
                <p className="text-[12px] text-muted">{s.sub}</p>
              </div>
              <Webhook className="ml-auto text-muted" size={16} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* safety rails */}
      <div className="mt-10">
        <p className="mb-4 text-[12px] font-bold uppercase tracking-wider text-muted">Built-in safety rails</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SAFETY.map((s, i) => (
            <GlowCard key={s.title} className="h-full">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <div className="mb-3 grid size-10 place-items-center rounded-xl" style={{ background: "var(--glow-soft)", color: "var(--accent)" }}>
                  <s.icon size={19} />
                </div>
                <p className="text-[14px] font-semibold">{s.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{s.body}</p>
              </motion.div>
            </GlowCard>
          ))}
        </div>
      </div>

      {/* alert flow mini-card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="mt-10 overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{ background: "linear-gradient(135deg, var(--glow-soft), var(--surface))", border: "1px solid var(--line)" }}
      >
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="accent" />
              <span className="tag tag--accent">The alert call · fintech flow</span>
            </div>
            <h3 className="font-display text-[20px] font-bold">
              The bank flags a suspicious debit → Saathi calls the customer: <i>"was this you?"</i>
            </h3>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted">
              "Yes, it was me" clears the alert in one line. "No, not me" starts the full fraud intake — consent
              first, then the other debits, then next steps. One question decides the whole call.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="surface2 hairline rounded-2xl px-5 py-4 text-center">
              <div className="font-display text-2xl font-bold accent">Yes</div>
              <div className="text-[12px] text-muted">genuine · cleared</div>
            </div>
            <div className="surface2 hairline rounded-2xl px-5 py-4 text-center" style={{ border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)" }}>
              <div className="font-display text-2xl font-bold" style={{ color: "var(--warn)" }}>No</div>
              <div className="text-[12px] text-muted">fraud · full intake</div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
