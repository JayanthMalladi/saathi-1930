// A simulated Saathi ↔ Rohit call, modelled on test_calls V01 (fake customer care, AnyDesk)
// and the live_scripts "scammer still on line" beat. All numbers use 9999-prefixed fake UTRs.

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
    text: "Namaste Rohit, I am Saathi, from your bank's fraud team. I am calling about a debit that just happened. Aap Hindi mein baat karna chahenge, ya English mein?",
    dur: 9,
  },
  {
    id: "lang",
    speaker: "rohit",
    text: "English. Please hurry — a man called me Google Pay customer care and money is going out of my account.",
    dur: 8,
  },
  {
    id: "hangup",
    speaker: "saathi",
    text: "Okay. First: hang up the call with that person and close the AnyDesk app, if it is open. Done?",
    dur: 8,
    note: "safety step first — the scammer may still be on the line",
  },
  {
    id: "hangup-ok",
    speaker: "rohit",
    text: "Done. I have closed it.",
    dur: 3,
  },
  {
    id: "consent",
    speaker: "saathi",
    text: "Good. I am an AI helper, not the police. May I note your details and share them with the cyber cell and your bank?",
    dur: 8,
    tool: "record_consent",
    form: { consent: { name: "Rohit", isAccountHolder: true } },
  },
  {
    id: "consent-ok",
    speaker: "rohit",
    text: "Yes, please note it down.",
    dur: 3,
  },
  {
    id: "story",
    speaker: "saathi",
    text: "Noted. Walk me through what happened with the 18,000 rupee debit.",
    dur: 6,
    form: {
      incident: { fraudType: "Fake customer care", when: "Today, 21:40", language: "Hinglish" },
      txn: { amount: 18000, mode: "UPI", utr: "9999 4072 1788", app: "GPay", bank: "HDFC Bank", time: "21:40" },
    },
  },
  {
    id: "story-ok",
    speaker: "rohit",
    text: "He said my KYC was blocked, told me to install AnyDesk. I installed it and then the money just went.",
    dur: 9,
  },
  {
    id: "other-debits",
    speaker: "saathi",
    text: "Was any other money taken out of your account?",
    dur: 4,
  },
  {
    id: "other-debits-ok",
    speaker: "rohit",
    text: "Yes. Another ten thousand, on Google Pay, 9:44 in the evening.",
    dur: 6,
  },
  {
    id: "utr-ask",
    speaker: "saathi",
    text: "Okay, that debit's transaction number? Take your time, read it four digits at a time, I will wait.",
    dur: 7,
  },
  {
    id: "utr-1",
    speaker: "rohit",
    text: "First part: 9999.",
    dur: 3,
    utr: [{ digits: "9999", echo: "9 9 9 9" }],
  },
  {
    id: "utr-1-echo",
    speaker: "saathi",
    text: "9 9 9 9.",
    dur: 2.5,
  },
  {
    id: "utr-2",
    speaker: "rohit",
    text: "Next: 8885.",
    dur: 3,
    utr: [{ digits: "8885", echo: "8 8 8 5" }],
  },
  {
    id: "utr-2-echo",
    speaker: "saathi",
    text: "8 8 8 5.",
    dur: 2.5,
  },
  {
    id: "utr-3",
    speaker: "rohit",
    text: "Last: 9278.",
    dur: 3,
    utr: [{ digits: "9278", echo: "9 2 7 8" }],
  },
  {
    id: "utr-3-echo",
    speaker: "saathi",
    text: "9 2 7 8. That is twelve digits: 9999 8885 9278. Saved.",
    dur: 6,
    tool: "add_transaction",
    form: {
      txn: { amount: 10000, mode: "UPI", utr: "9999 8885 9278", app: "GPay", bank: "HDFC Bank", time: "21:44" },
      suspect: { vpa: "refund.zepto@ybl" },
    },
  },
  {
    id: "suspect",
    speaker: "saathi",
    text: "Do you have the scammer's phone number?",
    dur: 4,
    form: { suspect: { phone: "+91 90000 68912" } },
  },
  {
    id: "suspect-ok",
    speaker: "rohit",
    text: "Yes, 90000 68912.",
    dur: 3,
  },
  {
    id: "submit",
    speaker: "saathi",
    text: "Your 1930 complaint is ready: two debits, twenty eight thousand in all. Now: call 1930 today, or file at cybercrime.gov.in. Tell your bank in writing today — within three working days your protection is strongest. Keep the screenshots. Never give anyone your OTP or PIN.",
    dur: 12,
    tool: "submit_case",
    form: { submitted: true },
  },
  {
    id: "thanks",
    speaker: "rohit",
    text: "Okay… thank you. I will do it now.",
    dur: 4,
  },
];

export type ConsentState = { name: string; isAccountHolder: boolean };
export type Txn = {
  amount: number;
  mode: string;
  utr: string;
  app: string;
  bank: string;
  time: string;
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
