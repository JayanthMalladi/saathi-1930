import { useTheme } from "../theme";

// "[ light | dark ]": the bold one is active. Starts on the system setting.
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="tg" onClick={() => setTheme(next)} aria-label={`Switch to ${next} theme`}>
      [ {theme === "light" ? <b>light</b> : "light"} | {theme === "dark" ? <b>dark</b> : "dark"} ]
    </button>
  );
}
