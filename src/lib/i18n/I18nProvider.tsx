import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  detectLanguage,
  getLoadedDictionary,
  isDictionaryLoaded,
  languageMeta,
  loadDictionary,
  translate,
  type Dictionary,
  type LanguageCode,
  type LanguageMeta,
  type TFunction,
} from "./index";
import { en } from "./locales/en";

type I18nValue = {
  lang: LanguageCode;
  meta: LanguageMeta;
  dir: "ltr" | "rtl";
  /** True once the active non-English dictionary has finished loading. */
  ready: boolean;
  setLanguage: (code: LanguageCode) => void;
  t: TFunction;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  // Start with the eager English dictionary; a lazy locale swaps in on load.
  const [dict, setDict] = useState<Dictionary>(en);
  const [ready, setReady] = useState(true);

  // Resolve the initial language on the client only, so SSR markup and the
  // first client render agree (no hydration mismatch).
  useEffect(() => {
    const detected = detectLanguage();
    if (detected !== lang) setLang(detected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the dictionary whenever the language changes and keep <html lang/dir>
  // in sync for screen readers and search engines.
  useEffect(() => {
    let active = true;
    const meta = languageMeta(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = meta.dir;

    if (isDictionaryLoaded(lang)) {
      setDict(getLoadedDictionary(lang));
      setReady(true);
      return;
    }

    setReady(false);
    void loadDictionary(lang)
      .then((loaded) => {
        if (!active) return;
        setDict(loaded);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        // Never block the UI on a failed locale chunk — English still renders.
        setDict(en);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [lang]);

  const setLanguage = useCallback((code: LanguageCode) => {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      /* storage can be unavailable in private mode */
    }
    setLang(code);
  }, []);

  const t = useCallback<TFunction>((key, vars) => translate(dict, en, key, vars), [dict]);

  const value = useMemo<I18nValue>(
    () => ({ lang, meta: languageMeta(lang), dir: languageMeta(lang).dir, ready, setLanguage, t }),
    [lang, ready, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

/**
 * Safe accessor for error/not-found boundaries that may render outside the
 * provider. Falls back to an English translator instead of throwing.
 */
export function useI18nOptional(): I18nValue {
  const ctx = useContext(I18nContext);
  return (
    ctx ?? {
      lang: DEFAULT_LANGUAGE,
      meta: languageMeta(DEFAULT_LANGUAGE),
      dir: "ltr",
      ready: true,
      setLanguage: () => {},
      t: (key, vars) => translate(en, en, key, vars),
    }
  );
}

/** Convenience hook when only the translate function is needed. */
export function useT() {
  return useI18n().t;
}
