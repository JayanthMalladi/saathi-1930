// A simulated Saathi ↔ Rohit alert call, modelled on a real Bolna call (fake customer care, AnyDesk):
// bank-flagged debit, safety step, consent, other debit with UTR, scammer phone, then next steps. All numbers use 9999-prefixed fake UTRs.
//
// One clock drives the whole page: the in-call timer, waveform, transcript highlight and the receipt all read
// the current time and look up the beat whose `t` (seconds from call start) has most recently passed.
//
// Swapping in the real recording:
//   1. Put the Bolna recording at site/public/call.mp3 (it is not in the repo; vite.config.ts checks for it at
//      dev/build start, so restart `npm run dev` / re-run `npm run build` after adding it).
//   2. Replace each beat's `t` below with the second that line starts in the recording, and set CALL_TOTAL to
//      the recording's length (the engine also reads the real duration from the file once it loads).
//   3. If the recording's wording differs, update `text` so the transcript matches what is heard.
// Without the file the engine runs the same timeline on a simulated clock.

export type Speaker = "saathi" | "rohit";

export type UTRStep = { digits: string; echo?: string };

export type Beat = {
  id: string;
  speaker: Speaker;
  text: string;
  /** seconds from the start of the call when this line begins (replace with real timestamps from the recording) */
  t: number;
  /** Devanagari form of a Hindi/Hinglish line, shown above the Roman text */
  hi?: string;
  /** a tool the agent fires as this beat completes */
  tool?: string;
  /** UTR being read out in pieces this beat (visual slot readout) */
  utr?: UTRStep[];
  /** a group of the scammer's phone number read out this beat */
  phone?: string;
  /** form updates applied the instant this beat completes */
  form?: {
    consent?: ConsentState;
    txn?: Txn;
    incident?: Incident;
    suspect?: Suspect;
    submitted?: boolean;
  };
  note?: string; // shown under the beat, e.g. "tool: add_transaction"
};

export const CALL_META = {
  caller: "Rohit, 27 — Hyderabad",
  fraud: "Fake “GPay customer care” · remote app",
  total: 28000,
  debits: 2,
};

export const BEATS: Beat[] = [
  {
    id: "open",
    speaker: "saathi",
    text: "Namaste Rohit, main Saathi hoon, Demo Wallet ki fraud team se, aapke account ki ek payment ke baare mein. Aap Hindi mein baat karna chahenge, ya English mein?",
    hi: "नमस्ते रोहित, मैं साथी हूँ, Demo Wallet की फ़्रॉड टीम से, आपके अकाउंट की एक पेमेंट के बारे में। आप हिंदी में बात करना चाहेंगे, या English में?",
    t: 0,
  },
  { id: "lang", speaker: "rohit", text: "English.", t: 7, form: { incident: { language: "English" } } },
  {
    id: "alert",
    speaker: "saathi",
    text: "Rs 18,000 was paid to refund.help@ybl at 14:53 today from your Demo Wallet. Did you make this payment yourself, yes or no?",
    t: 9,
    note: "the bank already knows this debit — Saathi never asks for its details",
    form: {
      txn: { amount: 18000, mode: "UPI", utr: "on file with the bank", app: "Demo Wallet", bank: "Demo Wallet", time: "14:53", known: true },
      suspect: { vpa: "refund.help@ybl" },
      incident: { when: "Today, 14:53" },
    },
  },
  {
    id: "no",
    speaker: "rohit",
    text: "No, I didn't. A man called as customer care and made me install AnyDesk.",
    t: 15,
    form: { incident: { fraudType: "Fake customer care · remote app" } },
  },
  {
    id: "hangup",
    speaker: "saathi",
    text: "Please hang up the scammer's call and close any remote app now. Done?",
    t: 18,
    note: "safety step first — the scammer may still be on the line",
  },
  { id: "hangup-ok", speaker: "rohit", text: "Done.", t: 22 },
  {
    id: "consent",
    speaker: "saathi",
    text: "I am an AI helper, not police or bank; may I note your details and share with cyber cell and bank?",
    t: 24,
  },
  {
    id: "consent-ok",
    speaker: "rohit",
    text: "Yes, please.",
    t: 28,
    tool: "record_consent",
    form: { consent: { name: "Rohit", isAccountHolder: true } },
  },
  { id: "other-debits", speaker: "saathi", text: "Did any other money leave your account, Rohit?", t: 31 },
  {
    id: "other-debits-ok",
    speaker: "rohit",
    text: "Yes, Rs 10,000 more, on Google Pay, from HDFC Bank, at 9:44 pm.",
    t: 33,
  },
  {
    id: "utr-ask",
    speaker: "saathi",
    text: "Please read that debit's transaction number, four digits at a time. I will wait.",
    t: 36,
  },
  { id: "utr-1", speaker: "rohit", text: "9999.", t: 40, utr: [{ digits: "9999", echo: "9 9 9 9" }] },
  { id: "utr-1-echo", speaker: "saathi", text: "9 9 9 9.", t: 42 },
  { id: "utr-2", speaker: "rohit", text: "8885.", t: 44, utr: [{ digits: "8885", echo: "8 8 8 5" }] },
  { id: "utr-2-echo", speaker: "saathi", text: "8 8 8 5.", t: 46 },
  { id: "utr-3", speaker: "rohit", text: "9278.", t: 49, utr: [{ digits: "9278", echo: "9 2 7 8" }] },
  {
    id: "utr-3-echo",
    speaker: "saathi",
    text: "9 2 7 8. That is the full 12 digits, saved.",
    t: 51,
    tool: "add_transaction",
    form: {
      txn: { amount: 10000, mode: "UPI", utr: "9999 8885 9278", app: "Google Pay", bank: "HDFC Bank", time: "21:44" },
    },
  },
  {
    id: "access",
    speaker: "saathi",
    text: "How did the scammer get in? Did you share an OTP, install an app, or take a call?",
    t: 53,
  },
  {
    id: "access-ok",
    speaker: "rohit",
    text: "I installed AnyDesk.",
    t: 57,
    form: { incident: { description: "Installed AnyDesk at the fake customer care caller's request" } },
  },
  {
    id: "advice",
    speaker: "saathi",
    text: "Please uninstall AnyDesk, then change your UPI PIN from a safe phone.",
    t: 59,
  },
  {
    id: "suspect",
    speaker: "saathi",
    text: "What is the scammer's phone number? Five digits at a time, please.",
    t: 63,
  },
  { id: "suspect-1", speaker: "rohit", text: "90000.", t: 66, phone: "90000" },
  { id: "suspect-1-echo", speaker: "saathi", text: "9 0 0 0 0.", t: 68 },
  { id: "suspect-2", speaker: "rohit", text: "68912.", t: 70, phone: "68912" },
  {
    id: "suspect-2-echo",
    speaker: "saathi",
    text: "6 8 9 1 2.",
    t: 72,
    form: { suspect: { phone: "+91 90000 68912" } },
  },
  {
    id: "submit",
    speaker: "saathi",
    text: "Rohit, you lost Rs 18,000 and Rs 10,000, and installed AnyDesk. I will submit your case to the bank now.",
    t: 74,
    tool: "submit_case",
    form: { submitted: true },
  },
  { id: "next-1930", speaker: "saathi", text: "Please call 1930 now, or file at cybercrime.gov.in.", t: 79 },
  {
    id: "next-bank",
    speaker: "saathi",
    text: "Tell your bank in writing today; protection is strongest within 3 working days.",
    t: 82,
  },
  {
    id: "next-keep",
    speaker: "saathi",
    text: "Keep all screenshots and chats, and never share your OTP or PIN.",
    t: 86,
  },
  { id: "thanks", speaker: "rohit", text: "Okay, thank you.", t: 89 },
  { id: "bye", speaker: "saathi", text: "Take care, Rohit, and stay safe.", t: 91 },
];

/** length of the call in seconds (the last line ends a little before this) */
export const CALL_TOTAL = 94;

/** where the page opens, paused: just after the second UTR group, so the receipt is half printed */
export const PREVIEW_T = 47;

/** the payment question in Hindi, as the agent asks it (agent/bolna.py LANGS["hi"]["question"]) */
export const PAYMENT_QUESTION = {
  en: "Did you make this payment yourself, yes or no?",
  hiRoman: "Kya yeh payment aapne khud kiya tha, haan ya nahi?",
  hi: "क्या यह पेमेंट आपने ख़ुद किया था, हाँ या नहीं?",
};

/** the line the agent says on a "yes" before ending the call (agent/bolna.py LANGS["en"]["closing"]) */
export const YES_CLOSING = "Okay, thank you. Never share your OTP or PIN with anyone.";

/** index of the beat playing at time `t` (the last beat that has started) */
export function beatAt(t: number): number {
  let i = 0;
  for (let k = 0; k < BEATS.length; k++) if (BEATS[k].t <= t) i = k;
  return i;
}

export function beatIndex(id: string): number {
  return BEATS.findIndex((b) => b.id === id);
}

export type ConsentState = { name: string; isAccountHolder: boolean };
export type Txn = {
  amount: number;
  mode: string;
  utr: string;
  app: string;
  bank: string;
  time: string;
  /** the flagged debit: already on file from the bank's alert, not collected in the call */
  known?: boolean;
};
export type Incident = { fraudType?: string; when?: string; language?: string; description?: string };
export type Suspect = { phone?: string; vpa?: string };

export type FormState = {
  consent: ConsentState | null;
  txns: Txn[];
  incident: Incident | null;
  suspect: Suspect | null;
  submitted: boolean;
};

export function emptyForm(): FormState {
  return { consent: null, txns: [], incident: null, suspect: null, submitted: false };
}

export function formAfterBeat(idx: number): FormState {
  // form state = every update on beats 0..idx (the beat that just completed)
  const f = emptyForm();
  for (let i = 0; i <= idx; i++) {
    const up = BEATS[i]?.form;
    if (!up) continue;
    if (up.consent) f.consent = up.consent;
    if (up.txn) f.txns = [...f.txns, up.txn];
    if (up.incident) f.incident = { ...(f.incident ?? {}), ...up.incident };
    if (up.suspect) f.suspect = { ...(f.suspect ?? {}), ...up.suspect };
    if (up.submitted) f.submitted = true;
  }
  return f;
}
