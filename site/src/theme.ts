import { useCallback, useEffect, useState } from "react";

// Light / dark. With nothing chosen the page follows prefers-color-scheme (pure CSS, see styles.css);
// a choice made with the toggle is kept in localStorage and set as data-theme on <html>.
// index.html applies a saved choice before first paint so there is no flash.
export type Theme = "light" | "dark";

const KEY = "saathi-theme";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function saved(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

export function useTheme() {
  const [choice, setChoice] = useState<Theme | null>(saved);
  const [system, setSystem] = useState<Theme>(systemTheme);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystem(mq.matches ? "dark" : "light");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (choice) root.setAttribute("data-theme", choice);
    else root.removeAttribute("data-theme");
    try {
      if (choice) localStorage.setItem(KEY, choice);
      else localStorage.removeItem(KEY);
    } catch {
      /* storage blocked: the choice just lasts for this visit */
    }
  }, [choice]);

  const theme = choice ?? system;
  const setTheme = useCallback((t: Theme) => setChoice(t), []);
  return { theme, setTheme };
}
