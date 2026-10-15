/**
 * Server-safe constants for the shopping assistant's model call.
 *
 * `assistant.functions.ts` also ships to the client bundle, so this module must
 * never read a secret at module scope: every value is either a public constant
 * or is read inside a function at call time.
 *
 * Default provider is the **Lovable AI Gateway**, which is how this project is
 * deployed: Lovable Cloud injects `LOVABLE_API_KEY` as a project secret and
 * billing runs through the Lovable plan, so no separate model account is needed.
 * The gateway is OpenAI-compatible, so any other provider is a change of base
 * URL + key here and nothing else. Supabase holds the data and runs the
 * read-only tools; it has no hosted chat-completions API (its `Supabase.ai`
 * runtime does embeddings only), so the LLM stays behind this one endpoint.
 *
 * Provider notes:
 *  - **Lovable** (default): `https://ai.gateway.lovable.dev/v1` with
 *    `openai/gpt-5.5`, the model this feature originally shipped with.
 *  - **Gemini**: OpenAI-compatible shim at `/v1beta/openai`; use
 *    `gemini-3.8-flash` (or `gemini-3.1-flash-lite`). `gemini-2.5-flash` is
 *    retired for new accounts, and the free tier is only 20 req/day.
 *  - **DeepSeek**: `deepseek-chat` / `deepseek-reasoner` were retired on
 *    2026-07-24 and now return errors; use `deepseek-flash` (or
 *    `deepseek-v4-pro`) and leave thinking off for tool calls.
 */

type Provider = "lovable" | "gemini" | "deepseek" | "custom";

const LOVABLE_BASE_URL = "https://ai.gateway.lovable.dev/v1";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

const DEFAULT_MODEL: Record<Provider, string> = {
  lovable: "openai/gpt-5.5",
  gemini: "gemini-3.8-flash",
  deepseek: "deepseek-flash",
  custom: "openai/gpt-5.5",
};

/**
 * Credential sources, in priority order. `LOVABLE_API_KEY` is first because it
 * is the one Lovable Cloud injects automatically, so a Lovable deployment works
 * with no configuration. The provider implied by the chosen key selects the
 * default base URL and model, so key and endpoint cannot disagree.
 */
const KEY_SOURCES: { provider: Provider; envs: readonly string[] }[] = [
  { provider: "lovable", envs: ["LOVABLE_API_KEY", "LOVABLE_KEY"] },
  {
    provider: "gemini",
    envs: ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
  },
  { provider: "deepseek", envs: ["DEEPSEEK_API_KEY"] },
  { provider: "custom", envs: ["ASSISTANT_API_KEY", "OPENAI_API_KEY"] },
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
    if (/(^|\.)lovable\.dev$/.test(host)) return "lovable";
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
  switch (resolveKey()?.provider) {
    case "gemini":
      return GEMINI_BASE_URL;
    case "deepseek":
      return DEEPSEEK_BASE_URL;
    default:
      // Lovable, or no key at all: the gateway is the deployment default.
      return LOVABLE_BASE_URL;
  }
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

/** True when the model credential is configured on this deployment. */
export function assistantConfigured(): boolean {
  return assistantApiKey() !== null;
}

/**
 * Request shape is provider-specific, and getting it wrong **breaks the call
 * outright** rather than degrading, so each field is emitted only where it is
 * known to be accepted:
 *
 *  - **Lovable** (`openai/gpt-5.5`): the model **rejects a custom
 *    `temperature`**, and tool calling on chat completions **requires**
 *    `reasoning_effort: "none"`. Both were established by the platform's own
 *    "Fixed AI model settings" commit, which is authoritative for this
 *    deployment — do not "restore" a temperature here.
 *  - **Gemini / DeepSeek**: accept `temperature` and take no `reasoning_effort`.
 */
const DEFAULT_TEMPERATURE = 0.3;

/** Temperature to send, or null for a provider that rejects a custom value. */
export function assistantTemperature(): number | null {
  const explicit = process.env["ASSISTANT_TEMPERATURE"]?.trim();
  if (explicit) {
    const parsed = Number(explicit);
    if (Number.isFinite(parsed)) return parsed;
  }
  try {
    return providerForBaseUrl(assistantBaseUrl()) === "lovable" ? null : DEFAULT_TEMPERATURE;
  } catch {
    return DEFAULT_TEMPERATURE;
  }
}

/**
 * `reasoning_effort` to send, or null to omit it. Lovable's `gpt-5.5` needs
 * `none` for tools to be emitted at all; other providers reject the field.
 */
export function assistantReasoningEffort(): string | null {
  const explicit = process.env["ASSISTANT_REASONING_EFFORT"]?.trim();
  if (explicit) return explicit;
  try {
    return providerForBaseUrl(assistantBaseUrl()) === "lovable" ? "none" : null;
  } catch {
    return null;
  }
}

/** Best-effort per-session cap. In-memory counters are per-instance only. */
export const ASSISTANT_SESSION_LIMIT = 30;
export const ASSISTANT_SESSION_WINDOW_MS = 10 * 60_000;

/** Model call timeout; a stalled gateway would otherwise block the user. */
export const ASSISTANT_REQUEST_TIMEOUT_MS = 30_000;
