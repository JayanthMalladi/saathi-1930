import { motion, useScroll, useTransform } from "framer-motion";
import { PhoneCall, ShieldCheck, ArrowDown, Radio } from "lucide-react";
import { useRef } from "react";
import Marquee from "../components/Marquee";

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const op = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[92vh] overflow-hidden">
      {/* parallax ring hero */}
      <motion.div style={{ y, opacity: op }} className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="relative grid size-[340px] place-items-center sm:size-[440px]">
          {[1, 0.82, 0.64].map((s, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                inset: 0,
                scale: s,
                border: "1px solid var(--line)",
                boxShadow: i === 2 ? "0 0 90px -20px var(--glow)" : "none",
              }}
              animate={{ scale: [s, s * 1.05, s] }}
              transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
          <motion.div
            className="relative grid size-24 place-items-center rounded-full"
            style={{ background: "var(--glow-soft)", border: "1px solid var(--accent)" }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Radio size={34} className="accent" />
          </motion.div>
        </div>
      </motion.div>

      <div className="relative mx-auto max-w-5xl px-6 pt-24 sm:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="tag tag--accent"
        >
          <span className="size-1.5 rounded-full dot-live" style={{ background: "var(--accent)" }} />
          BOLNA AI · SYMPHONY BUILDATHON · VOICE PROJECT
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display mt-6 max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl"
        >
          The first <span className="accent">five minutes</span> after a UPI fraud decide everything.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted"
        >
          <b style={{ color: "var(--ink)" }}>Saathi</b> is a calm Hinglish voice agent that calls the victim in the
          moment of shock, hears the story as it happens, and fills a{" "}
          <b style={{ color: "var(--ink)" }}>1930-ready complaint draft</b> live on screen — every UTR read
          back and checked. The caller is told to call 1930, and the case lands in the bank's fraud-ops queue, ranked
          by money at stake and how fresh the fraud is.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <a href="#call" className="btn btn--primary">
            <PhoneCall size={16} /> Watch the call
          </a>
          <a href="#queue" className="btn btn--ghost">
            <ShieldCheck size={16} /> Bank fraud-ops queue
          </a>
          <a href="#how" className="btn btn--ghost">
            How it works
          </a>
        </motion.div>

        <motion.a
          href="#call"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 flex items-center gap-2 text-[13px] text-muted"
        >
          <ArrowDown size={15} className="pulse-soft" /> the call, then the complaint, then the queue
        </motion.a>
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <Marquee
          items={[
            "Never asks for OTP, PIN or CVV",
            "Fills the 1930 complaint fields while they talk",
            "Every UTR read back & checked",
            "Bank queue ranked by money × freshness",
            "RBI 3-day window tracked per case",
            "Hindi, English, Hinglish",
            "Warns about fake recovery agents",
          ]}
        />
      </div>
    </section>
  );
}
