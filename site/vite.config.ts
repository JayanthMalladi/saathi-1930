import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The real call recording is optional: drop it at public/call.mp3 and the page uses it as the clock
// (see src/data/callScript.ts). Checked once at dev/build start, so restart after adding it.
const hasRecording = existsSync(fileURLToPath(new URL("./public/call.mp3", import.meta.url)));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __CALL_AUDIO__: JSON.stringify(hasRecording ? "call.mp3" : "") },
  server: { port: 5173 },
});
