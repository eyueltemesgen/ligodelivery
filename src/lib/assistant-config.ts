/**
 * Server-safe constants for the shopping assistant's model call.
 *
 * `assistant.functions.ts` also ships to the client bundle, so this module must
 * never read a secret at module scope: every value is either a public constant
 * or is read inside a function at call time.
 *
 * The model is provider-neutral. Defaults to **Google Gemini**
 * (`gemini-3.8-flash` via its OpenAI-compatible endpoint) because Gemini was
 * measured to be the only provider tested that both calls tools and writes
 * fluent **Amharic** and Afaan Oromo — see the AGENTS.md note. Supabase hosts
 * the data and the tools run there, but Supabase has no hosted chat-completions
 * API (its `Supabase.ai` runtime does embeddings only), so the LLM stays an
 * external provider behind this one OpenAI-compatible endpoint. Point
 * `ASSISTANT_BASE_URL` at any OpenAI-compatible gateway and set the matching
 * key; no code change is needed to switch provider.
 *
 * Provider notes:
 *  - **Gemini**: the OpenAI-compatible shim lives at `/v1beta/openai`; use
 *    `gemini-3.8-flash` (or `gemini-3.1-flash-lite`). `gemini-2.5-flash` is
 *    retired for new accounts. Free-tier quota is small (20 req/day for
 *    3.8-flash), so a production deployment needs billing.
 *  - **DeepSeek**: the legacy `deepseek-chat` / `deepseek-reasoner` names were
 *    retired on 2026-07-24 and now return errors, and the current V4 models
 *    default to thinking mode. Use `deepseek-flash` (or `deepseek-v4-pro`) and
 *    leave thinking disabled for tool calls — see `assistantThinking` below.
 */

type Provider = "gemini" | "deepseek" | "custom";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

const DEFAULT_MODEL: Record<Provider, string> = {
  gemini: "gemini-3.8-flash",
  deepseek: "deepseek-flash",
  custom: "deepseek-flash",
};

/**
 * Credential sources, in priority order. A provider-specific name wins so a
 * project can hold several keys at once; the generic names are the documented
 * fallback for any other OpenAI-compatible provider. The provider implied by
 * the chosen key selects the default base URL and model, so key and endpoint
 * can never disagree.
 */
const KEY_SOURCES: { provider: Provider; envs: readonly string[] }[] = [
  {
    provider: "gemini",
    envs: ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
  },
  { provider: "deepseek", envs: ["DEEPSEEK_API_KEY"] },
  { provider: "custom", envs: ["ASSISTANT_API_KEY", "OPENAI_API_KEY", "LOVABLE_API_KEY"] },
];

/** First present credential, with the provider it belongs to. */
function resolveKey(): { provider: Provider; key: string } | null {
  for (const source of KEY_SOURCES) {
    for (const name of source.envs) {
      const value = process.env[name]?.trim();
      if (value) return { provider: source.provider, key: value };
    }
  }
  return null;
}

/** Which API an effective base URL actually points at. */
function providerForBaseUrl(url: string): Provider {
  try {
    const host = new URL(url).hostname;
    if (/(^|\.)generativelanguage\.googleapis\.com$/.test(host)) return "gemini";
    if (/(^|\.)deepseek\.com$/.test(host)) return "deepseek";
  } catch {
    /* fall through to custom */
  }
  return "custom";
}

/** Chat-completions base URL, without a trailing slash. */
export function assistantBaseUrl(): string {
  const raw = process.env["ASSISTANT_BASE_URL"]?.trim();
  // A trailing slash would yield `//chat/completions`, which some gateways 404.
  if (raw) return raw.replace(/\/+$/, "");
  return resolveKey()?.provider === "gemini" ? GEMINI_BASE_URL : DEEPSEEK_BASE_URL;
}

export function assistantModel(): string {
  const explicit = process.env["ASSISTANT_MODEL"]?.trim();
  if (explicit) return explicit;
  // Derive from the endpoint, so an explicit ASSISTANT_BASE_URL still gets a
  // model that endpoint can actually serve.
  return DEFAULT_MODEL[providerForBaseUrl(assistantBaseUrl())];
}

function isDeepSeek(baseUrl: string): boolean {
  return providerForBaseUrl(baseUrl) === "deepseek";
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
  return resolveKey()?.key ?? null;
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
