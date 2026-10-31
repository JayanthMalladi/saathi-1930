import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadSettings, saveSettings, type Settings } from "./backend";

type Ctx = {
  s: Settings;
  set: (patch: Partial<Settings>) => void;
  ready: boolean; // true once backend + token are filled
};

const C = createContext<Ctx | null>(null);

export function JudgeSettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(loadSettings);
  useEffect(() => saveSettings(s), [s]);

  const set = (p: Partial<Settings>) => setS((old) => ({ ...old, ...p }));

  // "ready" = we can actually talk to a backend with a token
  const ready = !!s.backend && !!s.token;

  return <C.Provider value={{ s, set, ready }}>{children}</C.Provider>;
}

export function useJudgeSettings() {
  const v = useContext(C);
  if (!v) throw new Error("useJudgeSettings outside provider");
  return v;
}
