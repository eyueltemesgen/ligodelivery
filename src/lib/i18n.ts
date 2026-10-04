/**
 * Lightweight UI copy registry for English, Amharic and Afaan Oromoo.
 *
 * Only the active language's dictionary is loaded into the client bundle:
 * English (the SSR default) is imported eagerly, while Amharic and Oromo are
 * code-split behind dynamic imports and fetched on demand by useLanguage.
 * This keeps the initial JavaScript payload small for the common case.
 */
import { en } from "@/lib/locales/en";

export const LANGUAGES = ["en", "am", "or"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  am: "አማርኛ",
  or: "Afaan Oromoo",
};

/** BCP-47 codes for the <html lang> attribute (Oromo is `om`). */
export const HTML_LANG: Record<Language, string> = {
  en: "en",
  am: "am",
  or: "om",
};

/** The shape of a translation dictionary. Keys come from English. */
export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;

/**
 * English-only view of the dictionaries. Route `head` metadata and other
 * module-scope consumers use `translations.en.*`; Amharic/Oromo are loaded
 * lazily through `loadDictionary` instead of being bundled here.
 */
export const translations = { en } as const;

const loaders: Record<Language, () => Promise<Dictionary>> = {
  en: () => Promise.resolve(en as Dictionary),
  am: () => import("@/lib/locales/am").then((m) => m.am as Dictionary),
  or: () => import("@/lib/locales/or").then((m) => m.or as Dictionary),
};

const loaded: Partial<Record<Language, Dictionary>> = { en: en as Dictionary };

/**
 * Resolve a language dictionary, loading and caching the chunk on first use.
 * Falls back to English if the language chunk cannot be fetched.
 */
export async function loadDictionary(language: Language): Promise<Dictionary> {
  const cached = loaded[language];
  if (cached) return cached;
  try {
    const dict = await loaders[language]();
    loaded[language] = dict;
    return dict;
  } catch (err) {
    console.warn("[i18n] failed to load language dictionary", language, err);
    return en as Dictionary;
  }
}
