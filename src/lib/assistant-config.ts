/**
 * Server-safe constants for the shopping assistant's model call.
 *
 * `assistant.functions.ts` also ships to the client bundle, so this module must
 * never read a secret at module scope: every value is either a public constant
 * or is read inside a function at call time.
 *
 * The model is provider-neutral and defaults to **DeepSeek** (`deepseek-flash`
 * at `https://api.deepseek.com`). Supabase hosts the data and the tools run
 * there, but Supabase has no hosted chat-completions API (its `Supabase.ai`
 * runtime does embeddings only), so the LLM stays an external provider behind
 * this one OpenAI-compatible endpoint. Point `ASSISTANT_BASE_URL` at any
 * OpenAI-compatible gateway and set the matching key; no code change is needed
 * to switch provider.
 *
 * DeepSeek note: the legacy `deepseek-chat` / `deepseek-reasoner` names were
 * retired on 2026-07-24 and now return errors, and the current V4 models default
 * to thinking mode. Use `deepseek-flash` (or `deepseek-v4-pro`) and leave
 * thinking disabled for tool calls — see `assistantThinking` below.
 */

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-flash";

/**
 * Env vars holding the credential, in priority order. A provider-specific name
 * wins so a project can hold several keys at once; the generic name is the
 * documented fallback for any other OpenAI-compatible provider.
 */
const API_KEY_ENV_NAMES = [
  "DEEPSEEK_API_KEY",
  "OPENAI_API_KEY",
  "ASSISTANT_API_KEY",
  "LOVABLE_API_KEY",
] as const;

/** Chat-completions base URL, without a trailing slash. */
export function assistantBaseUrl(): string {
  const raw = process.env["ASSISTANT_BASE_URL"]?.trim();
  // A trailing slash would yield `//chat/completions`, which some gateways 404.
  return raw ? raw.replace(/\/+$/, "") : DEFAULT_BASE_URL;
}

export function assistantModel(): string {
  return process.env["ASSISTANT_MODEL"]?.trim() || DEFAULT_MODEL;
}

function isDeepSeek(baseUrl: string): boolean {
  return /(^|\.)deepseek\.com/.test(new URL(baseUrl).hostname);
}

/**
 * DeepSeek's V4 models default to **thinking on**, which is both expensive and
 * historically unreliable alongside tool calls, so we ask for it off. The
 * parameter is DeepSeek-only — sending it to any other provider is a 400 — so
 * it is emitted only for a DeepSeek host, or when `ASSISTANT_THINKING` is set
 * to `enabled`/`disabled` explicitly.
 */
export function assistantThinking(): { type: string } | null {
  const explicit = process.env["ASSISTANT_THINKING"]?.trim().toLowerCase();
  if (explicit === "enabled" || explicit === "disabled") return { type: explicit };
  if (explicit) return null; // unrecognised value: don't send a guess
  try {
    return isDeepSeek(assistantBaseUrl()) ? { type: "disabled" } : null;
  } catch {
    return null;
  }
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
