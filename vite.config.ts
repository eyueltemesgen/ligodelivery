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
export default defineConfig({});
