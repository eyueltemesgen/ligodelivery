import { en } from "./locales/en";
import type { Dictionary, LanguageCode } from "./core";

export * from "./core";
export { en } from "./locales/en";

/**
 * English ships eagerly (it is the fallback for every key), while Amharic and
 * Afaan Oromoo are code-split so a visitor only downloads the locale they use.
 * The cache keeps a dictionary in memory after the first load.
 */
type Loader = () => Promise<Dictionary>;

const LOADERS: Record<Exclude<LanguageCode, "en">, Loader> = {
  am: () => import("./locales/am").then((m) => m.am),
  om: () => import("./locales/om").then((m) => m.om),
};

const cache = new Map<LanguageCode, Dictionary>([["en", en]]);

/** Returns the dictionary if it is already loaded, otherwise English. */
export function getLoadedDictionary(code: LanguageCode): Dictionary {
  return cache.get(code) ?? en;
}

export function isDictionaryLoaded(code: LanguageCode): boolean {
  return cache.has(code);
}

/** Lazily load and cache a locale dictionary. */
export async function loadDictionary(code: LanguageCode): Promise<Dictionary> {
  const cached = cache.get(code);
  if (cached) return cached;
  const dict = await LOADERS[code as Exclude<LanguageCode, "en">]();
  cache.set(code, dict);
  return dict;
}

export { I18nProvider, useI18n, useI18nOptional, useT } from "./I18nProvider";
export {
  contentTranslationsQuery,
  localizeEntity,
  useContentTranslations,
  useLocalizedEntity,
  TRANSLATABLE_FIELDS,
  type ContentEntityType,
  type Translatable,
  type TranslatableField,
  type TranslationMap,
} from "./content";
