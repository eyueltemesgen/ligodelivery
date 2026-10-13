/**
 * Server-safe constants for the shopping assistant's model call.
 *
 * `assistant.functions.ts` also ships to the client bundle, so this module must
 * never read a secret at module scope: every value is either a public constant
 * or is read inside a function at call time.
 *
 * The model is provider-neutral. Supabase hosts the data and the tools run
 * there, but Supabase has no hosted chat-completions API (its `Supabase.ai`
 * runtime does embeddings only), so the LLM stays an external provider behind
 * this one OpenAI-compatible endpoint. Point `ASSISTANT_BASE_URL` at any
 * OpenAI-compatible gateway and set the matching key; no code change is needed
 * to switch provider. Lovable's gateway still works by setting
 * `ASSISTANT_BASE_URL=https://ai.gateway.lovable.dev/v1`.
 */

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

/**
 * Env vars holding the credential, in priority order. A provider-specific name
 * wins so a project can hold several keys at once; the generic name is the
 * documented fallback for any other OpenAI-compatible provider.
 */
const API_KEY_ENV_NAMES = ["OPENAI_API_KEY", "ASSISTANT_API_KEY", "LOVABLE_API_KEY"] as const;

/** Chat-completions base URL, without a trailing slash. */
export function assistantBaseUrl(): string {
  const raw = process.env["ASSISTANT_BASE_URL"]?.trim();
  // A trailing slash would yield `//chat/completions`, which some gateways 404.
  return raw ? raw.replace(/\/+$/, "") : DEFAULT_BASE_URL;
}

export function assistantModel(): string {
  return process.env["ASSISTANT_MODEL"]?.trim() || DEFAULT_MODEL;
}

/**
 * Read the model credential, or null when the deployment has not set one.
 * Values are trimmed: a trailing newline in a pasted secret otherwise produces
 * a confusing 401.
 */
export function assistantApiKey(): string | null {
  for (const name of API_KEY_ENV_NAMES) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

/**
 * Optional `reasoning_effort`, sent only when set. Reasoning models (e.g.
 * `gpt-5.5`) need `none` for tool calls to be emitted at all, but
 * non-reasoning models reject the field, so it must not be sent by default.
 */
export function assistantReasoningEffort(): string | null {
  return process.env["ASSISTANT_REASONING_EFFORT"]?.trim() || null;
}

/** Best-effort per-session cap. In-memory counters are per-instance only. */
export const ASSISTANT_SESSION_LIMIT = 30;
export const ASSISTANT_SESSION_WINDOW_MS = 10 * 60_000;

/** Model call timeout; a stalled gateway would otherwise block the user. */
export const ASSISTANT_REQUEST_TIMEOUT_MS = 30_000;
