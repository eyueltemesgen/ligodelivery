/**
 * Framework-agnostic i18n primitives.
 *
 * Kept separate from the React provider so non-component modules can share
 * language detection and interpolation without pulling in React. Amharic is
 * written in the Ethiopic script and Afaan Oromoo uses the Latin Qubee
 * orthography; both are left-to-right, so no layout flip is required, but
 * `dir` is modelled explicitly to stay future-proof.
 */

export type LanguageCode = "en" | "am" | "om";

export type LanguageMeta = {
  code: LanguageCode;
  /** English reference name, used in admin and settings. */
  label: string;
  /** Endonym shown to users in the switcher. */
  native: string;
  dir: "ltr" | "rtl";
};

export const LANGUAGES: readonly LanguageMeta[] = [
  { code: "en", label: "English", native: "English", dir: "ltr" },
  { code: "am", label: "Amharic", native: "አማርኛ", dir: "ltr" },
  { code: "om", label: "Oromo", native: "Afaan Oromoo", dir: "ltr" },
] as const;

export const DEFAULT_LANGUAGE: LanguageCode = "en";

/** localStorage key — intentionally not brand-prefixed so it survives rebrands. */
export const LANGUAGE_STORAGE_KEY = "yene-lang";

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && (LANGUAGE_CODES as string[]).includes(value);
}

export function languageMeta(code: LanguageCode): LanguageMeta {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]!;
}

/**
 * Map a BCP-47 tag (e.g. "am-ET", "om", "en-US") onto a supported language.
 * Amharic is `am`; Afaan Oromoo is `om`. Unsupported tags return null so the
 * caller can fall through to the next candidate.
 */
export function matchLanguage(tag: string | null | undefined): LanguageCode | null {
  if (!tag) return null;
  const base = tag.toLowerCase().split(/[-_]/)[0];
  if (base === "en") return "en";
  if (base === "am") return "am";
  if (base === "om" || base === "orm" || base === "gax") return "om";
  return null;
}

/** Stored preference → browser preference → English. */
export function detectLanguage(): LanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguageCode(stored)) return stored;
  } catch {
    /* storage can be unavailable in private mode */
  }
  const candidates = [...(navigator.languages ?? []), navigator.language].filter(
    Boolean,
  ) as string[];
  for (const tag of candidates) {
    const match = matchLanguage(tag);
    if (match) return match;
  }
  return DEFAULT_LANGUAGE;
}

export type Dictionary = Record<string, string>;

export type TranslateVars = Record<string, string | number>;

export type TFunction = (key: string, vars?: TranslateVars) => string;

/** Replace `{name}` placeholders with values from `vars`. */
export function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
  );
}

/**
 * Resolve a key against the active dictionary, then the English fallback, then
 * the key itself. The key-as-last-resort guarantees we never render
 * `undefined` or a blank label even if a dictionary is missing an entry.
 */
export function translate(
  dict: Dictionary | undefined,
  fallback: Dictionary,
  key: string,
  vars?: TranslateVars,
): string {
  const raw = dict?.[key] ?? fallback[key] ?? key;
  return interpolate(raw, vars);
}

/** Build a stable translation key for a database/backend enum value. */
export const keyFor = (prefix: string, value: string) => `${prefix}.${value}`;
