import { Globe } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { LANGUAGES, LANGUAGE_LABELS } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("switch_language")}
          className="flex h-9 items-center gap-1 rounded-md px-2 text-sm font-medium transition-all duration-100 hover:bg-secondary active:scale-95"
        >
          <Globe className="h-5 w-5" />
          <span className="hidden sm:inline">{LANGUAGE_LABELS[language]}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem key={lang} onClick={() => setLanguage(lang)}>
            {LANGUAGE_LABELS[lang]}
            {language === lang ? " ✓" : ""}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
