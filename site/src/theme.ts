import { useCallback, useEffect, useState } from "react";

export type Theme = "noir" | "saathi" | "ops";

export const THEMES: { id: Theme; label: string; blurb: string }[] = [
  { id: "noir", label: "Noir", blurb: "dark cinematic" },
  { id: "saathi", label: "Saathi", blurb: "light & calm" },
  { id: "ops", label: "Ops", blurb: "mission control" },
];

const DEFAULT: Theme = "saathi";

function readFromHash(): Theme {
  const m = window.location.hash.match(/theme=([a-z]+)/);
  const t = m?.[1] as Theme | undefined;
  return t && THEMES.some((x) => x.id === t) ? t : DEFAULT;
}

export function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readFromHash);

  useEffect(() => {
    applyTheme(theme);
    // keep the theme in the hash so a reloaded / shared link preserves it.
    // replaceState keeps it a same-page change and writes a clean #theme=X,
    // so the URL can never accumulate a corrupted fragment.
    window.history.replaceState(null, "", `${location.pathname}${location.search}#theme=${theme}`);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  return { theme, setTheme };
}
