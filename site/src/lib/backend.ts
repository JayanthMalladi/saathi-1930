// Client-side access to the real Saathi backend (FastAPI on Render / localhost).
// Credentials live in the judge's browser localStorage — never in the repo, never sent to
// any server log except as a `token` query param the backend itself requires.
//
// The backend must allow CORS for this site's origin (see app/main.py CORS_ORIGINS).

export type Settings = {
  /** base URL of the backend, e.g. https://saathi-1930.onrender.com */
  backend: string;
  /** BACKEND_TOKEN the backend was started with */
  token: string;
  /** second Bolna account key that hosts the caller-bot agents */
  botKey: string;
  /** which caller-bot scenario to use for the bridge run */
  scenario: string;
};

const KEY = "saathi-judge-settings";
export const DEFAULT_SCENARIOS = ["rohit", "sunita", "priya"];

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch {
    /* malformed: fall through */
  }
  return defaults();
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

function defaults(): Settings {
  // default to the deployed backend; judges overwrite in the settings panel
  const p = new URLSearchParams(location.search);
  return {
    backend: (p.get("backend") || "https://saathi-1930.onrender.com").replace(/\/+$/, ""),
    token: p.get("token") || "",
    botKey: "",
    scenario: p.get("scenario") || "rohit",
  };
}

export function api(s: Settings, path: string, init?: RequestInit): Promise<any> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (s.token) headers.set("Authorization", `Bearer ${s.token}`);
  const url = `${s.backend}${path}`;
  return fetch(url, { ...init, headers }).then(async (r) => {
    const text = await r.text();
    let body: any = text;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      /* non-JSON (e.g. the simulation HTML) */
    }
    if (!r.ok) throw new Error(`backend ${r.status}: ${String(body).slice(0, 200)}`);
    return body;
  });
}

export function openCaseUrl(s: Settings, caseId?: string): string {
  return caseId ? `${s.backend}/case/${encodeURIComponent(caseId)}` : `${s.backend}/case/latest`;
}
