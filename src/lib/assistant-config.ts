/**
 * Server-safe constants for the shopping assistant's model call.
 *
 * `LOVABLE_API_KEY` is injected by Lovable Cloud as a project secret. It is read
 * from `process.env` on the server only and must never be exposed to the browser
 * or baked into `vite.config.ts` `define` (that block is for public values).
 *
 * The gateway is OpenAI-compatible, so swapping to an own provider key is a
 * change of `baseUrl` + `apiKey` here and nothing else.
 */
export const ASSISTANT_BASE_URL = "https://ai.gateway.lovable.dev/v1";
export const ASSISTANT_MODEL = "openai/gpt-5.5";

/** Best-effort per-session cap. In-memory counters are per-instance only. */
export const ASSISTANT_SESSION_LIMIT = 30;
export const ASSISTANT_SESSION_WINDOW_MS = 10 * 60_000;

/** Model call timeout; the gateway can stall, and a hung call blocks the user. */
export const ASSISTANT_REQUEST_TIMEOUT_MS = 30_000;

/** True when the model credential is configured on this deployment. */
export function assistantConfigured(): boolean {
  return !!process.env["LOVABLE_API_KEY"];
}

/** Read the model credential, or null when the deployment has not set it. */
export function assistantApiKey(): string | null {
  return process.env["LOVABLE_API_KEY"] ?? null;
}
