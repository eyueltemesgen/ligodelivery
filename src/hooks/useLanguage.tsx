import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { HTML_LANG, LANGUAGES, translations, type Language, type TranslationKey } from "@/lib/i18n";

const STORAGE_KEY = "ligo-lang";

type LanguageValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  /** Translate a UI copy key, replacing `{name}` placeholders from `vars`. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageValue | null>(null);

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && (LANGUAGES as readonly string[]).includes(stored)) return stored as Language;
  // Default to English; only switch when the visitor clearly prefers another supported language.
  const preferred = window.navigator.language?.toLowerCase() ?? "";
  if (preferred.startsWith("am")) return "am";
  if (preferred.startsWith("om") || preferred.startsWith("or")) return "or";
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Start on "en" so the first client render matches the server render (the
  // server cannot read localStorage). Apply the stored/preferred language in an
  // effect to avoid a hydration mismatch.
  const [language, setLanguage] = useState<Language>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = getInitialLanguage();
    if (initial !== "en") setLanguage(initial);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = HTML_LANG[language];
  }, [language, ready]);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const text = translations[language][key];
      if (!vars) return text;
      return text.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match,
      );
    },
    [language],
  );

  const toggleLanguage = useCallback(
    () => setLanguage((l) => LANGUAGES[(LANGUAGES.indexOf(l) + 1) % LANGUAGES.length] ?? "en"),
    [],
  );

  const value: LanguageValue = useMemo(
    () => ({ language, setLanguage, toggleLanguage, t }),
    [language, toggleLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
