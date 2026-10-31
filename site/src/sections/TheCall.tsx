import { motion } from "framer-motion";
import CallReplay from "../components/CallReplay";
import ComplaintForm from "../components/ComplaintForm";

export default function TheCall() {
  return (
    <section id="call" className="relative mx-auto max-w-6xl px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mb-10 max-w-2xl"
      >
        <span className="tag">01 · THE CALL</span>
        <h2 className="font-display mt-4 text-3xl font-bold sm:text-4xl">
          Two voices. One complaint, filling in real time.
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Press play and watch: while Rohit tells the story, Saathi asks one short question at a time, catches the
          interrupted UTR in three pieces, and the 1930-ready complaint draft on the right fills itself (the caller still calls 1930). The numbers you see are
          synthetic — every UTR starts <span className="mono accent">9999</span>.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="min-w-0"
        >
          <CallReplay />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="min-w-0 lg:sticky lg:top-24 lg:self-start"
        >
          <ComplaintForm />
        </motion.div>
      </div>
    </section>
  );
}
