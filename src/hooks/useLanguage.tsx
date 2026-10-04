import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = HTML_LANG[language];
  }, [language]);

  const value: LanguageValue = {
    language,
    setLanguage,
    toggleLanguage: () =>
      setLanguage((l) => LANGUAGES[(LANGUAGES.indexOf(l) + 1) % LANGUAGES.length] ?? "en"),
    t: (key, vars) => {
      const text = translations[language][key];
      if (!vars) return text;
      return text.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match,
      );
    },
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
