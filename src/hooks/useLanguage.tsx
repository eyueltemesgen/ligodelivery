import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Language, type TranslationKey } from "@/lib/i18n";

const STORAGE_KEY = "ligo-lang";

type LanguageValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  /** Translate a UI copy key for the active language. */
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageValue | null>(null);

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "am") return stored;
  // Default to English; only switch when the visitor clearly prefers Amharic.
  return window.navigator.language?.toLowerCase().startsWith("am") ? "am" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value: LanguageValue = {
    language,
    setLanguage,
    toggleLanguage: () => setLanguage((l) => (l === "en" ? "am" : "en")),
    t: (key) => translations[language][key],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
