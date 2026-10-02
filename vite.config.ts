// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// NOTE: no custom tanstackStart.server.entry override. The previous hand-rolled
// src/server.ts wrapper got co-chunked with shared app modules, producing a
// circular chunk dependency that crashed at import time in production
// (TypeError: __exportAll is not a function). The SDK default server entry
// keeps the chunk graph acyclic; SSR error handling lives in src/start.ts
// request middleware instead.

// Public (browser-safe) backend URL + publishable key. Published builds have
// shipped without these env vars, blanking the site, so bake them in as a
// fallback. Real env values still win when present.
const PUBLIC_SUPABASE_URL =
  process.env["VITE_SUPABASE_URL"] || "https://kyfyljkxijmamnkhvqaw.supabase.co";
const PUBLIC_SUPABASE_KEY =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  "sb_publishable__-26UQR-hg8e3YE4RCgRiw_lIkghIy1";

export default defineConfig({
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(PUBLIC_SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(PUBLIC_SUPABASE_KEY),
    },
  },
});
