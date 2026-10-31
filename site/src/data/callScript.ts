// A simulated Saathi ↔ Rohit alert call, modelled on a real Bolna call (fake customer care, AnyDesk):
// bank-flagged debit, safety step, consent, other debit with UTR, scammer phone, then next steps. All numbers use 9999-prefixed fake UTRs.

export type Speaker = "saathi" | "rohit";

export type UTRStep = { digits: string; echo?: string };

export type Beat = {
  id: string;
  speaker: Speaker;
  text: string;
  /** seconds the beat plays; defaults from text length if omitted */
  dur?: number;
  /** a tool the agent fires as this beat completes */
  tool?: string;
  /** UTR being read out in pieces this beat (visual slot readout) */
  utr?: UTRStep[];
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
    dur: 6.3,
  },
  { id: "lang", speaker: "rohit", text: "English.", dur: 1.4, form: { incident: { language: "English" } } },
  {
    id: "alert",
    speaker: "saathi",
    text: "Rs 18,000 was paid to refund.help@ybl at 14:53 today from your Demo Wallet. Did you make this payment yourself, yes or no?",
    dur: 4.9,
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
    dur: 2.9,
    form: { incident: { fraudType: "Fake customer care · remote app" } },
  },
  {
    id: "hangup",
    speaker: "saathi",
    text: "Please hang up the scammer's call and close any remote app now. Done?",
    dur: 2.8,
    note: "safety step first — the scammer may still be on the line",
  },
  { id: "hangup-ok", speaker: "rohit", text: "Done.", dur: 1.4 },
  {
    id: "consent",
    speaker: "saathi",
    text: "I am an AI helper, not police or bank; may I note your details and share with cyber cell and bank?",
    dur: 3.9,
  },
  {
    id: "consent-ok",
    speaker: "rohit",
    text: "Yes, please.",
    dur: 1.4,
    tool: "record_consent",
    form: { consent: { name: "Rohit", isAccountHolder: true } },
  },
  { id: "other-debits", speaker: "saathi", text: "Did any other money leave your account, Rohit?", dur: 1.8 },
  {
    id: "other-debits-ok",
    speaker: "rohit",
    text: "Yes, Rs 10,000 more, on Google Pay, from HDFC Bank, at 9:44 pm.",
    dur: 2.5,
  },
  {
    id: "utr-ask",
    speaker: "saathi",
    text: "Please read that debit's transaction number, four digits at a time. I will wait.",
    dur: 3.2,
  },
  { id: "utr-1", speaker: "rohit", text: "9999.", dur: 1.4, utr: [{ digits: "9999", echo: "9 9 9 9" }] },
  { id: "utr-1-echo", speaker: "saathi", text: "9 9 9 9.", dur: 1.4 },
  { id: "utr-2", speaker: "rohit", text: "8885.", dur: 1.4, utr: [{ digits: "8885", echo: "8 8 8 5" }] },
  { id: "utr-2-echo", speaker: "saathi", text: "8 8 8 5.", dur: 1.4 },
  { id: "utr-3", speaker: "rohit", text: "9278.", dur: 1.4, utr: [{ digits: "9278", echo: "9 2 7 8" }] },
  {
    id: "utr-3-echo",
    speaker: "saathi",
    text: "9 2 7 8. That is the full 12 digits, saved.",
    dur: 1.7,
    tool: "add_transaction",
    form: {
      txn: { amount: 10000, mode: "UPI", utr: "9999 8885 9278", app: "Google Pay", bank: "HDFC Bank", time: "21:44" },
    },
  },
  {
    id: "access",
    speaker: "saathi",
    text: "How did the scammer get in? Did you share an OTP, install an app, or take a call?",
    dur: 3.2,
  },
  {
    id: "access-ok",
    speaker: "rohit",
    text: "I installed AnyDesk.",
    dur: 1.4,
    form: { incident: { description: "Installed AnyDesk at the fake customer care caller's request" } },
  },
  {
    id: "advice",
    speaker: "saathi",
    text: "Please uninstall AnyDesk, then change your UPI PIN from a safe phone.",
    dur: 2.8,
  },
  {
    id: "suspect",
    speaker: "saathi",
    text: "What is the scammer's phone number? Five digits at a time, please.",
    dur: 2.6,
  },
  { id: "suspect-1", speaker: "rohit", text: "90000.", dur: 1.4 },
  { id: "suspect-1-echo", speaker: "saathi", text: "9 0 0 0 0.", dur: 1.4 },
  { id: "suspect-2", speaker: "rohit", text: "68912.", dur: 1.4 },
  {
    id: "suspect-2-echo",
    speaker: "saathi",
    text: "6 8 9 1 2.",
    dur: 1.4,
    form: { suspect: { phone: "+91 90000 68912" } },
  },
  {
    id: "submit",
    speaker: "saathi",
    text: "Rohit, you lost Rs 18,000 and Rs 10,000, and installed AnyDesk. I will submit your case to the bank now.",
    dur: 4.2,
    tool: "submit_case",
    form: { submitted: true },
  },
  { id: "next-1930", speaker: "saathi", text: "Please call 1930 now, or file at cybercrime.gov.in.", dur: 2.0 },
  {
    id: "next-bank",
    speaker: "saathi",
    text: "Tell your bank in writing today; protection is strongest within 3 working days.",
    dur: 3.2,
  },
  {
    id: "next-keep",
    speaker: "saathi",
    text: "Keep all screenshots and chats, and never share your OTP or PIN.",
    dur: 2.6,
  },
  { id: "thanks", speaker: "rohit", text: "Okay, thank you.", dur: 1.4 },
  { id: "bye", speaker: "saathi", text: "Take care, Rohit, and stay safe.", dur: 1.4 },
];

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
