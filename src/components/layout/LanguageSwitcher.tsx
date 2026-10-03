import { Check, Languages } from "lucide-react";
import { LANGUAGES } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Compact language selector used in the header on every breakpoint. The
 * endonyms are always rendered in their own script so speakers recognise them,
 * with the globe icon signalling "language" without any emoji.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLanguage, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("language.change")}
          title={t("language.label")}
          className={cn(
            "relative grid h-9 w-9 place-items-center rounded-md transition-all duration-100 hover:bg-secondary active:scale-95",
            className,
          )}
        >
          <Languages className="h-5 w-5" />
          <span className="sr-only">{t("language.current")}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Languages className="h-3.5 w-3.5" />
          {t("language.label")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => setLanguage(l.code)}
            className="gap-2"
            aria-checked={lang === l.code}
            role="menuitemradio"
          >
            <span className="flex-1 truncate">{l.native}</span>
            <span className="text-xs text-muted-foreground">{l.label}</span>
            {lang === l.code && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Expanded selector with visible labels, for the mobile navigation panel. */
export function LanguageSwitcherInline({ className }: { className?: string }) {
  const { lang, setLanguage, t } = useI18n();
  return (
    <div className={cn("rounded-lg border border-border p-3", className)}>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Languages className="h-3.5 w-3.5" />
        {t("language.label")}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLanguage(l.code)}
            aria-pressed={lang === l.code}
            className={cn(
              "rounded-md border px-2 py-2 text-sm font-medium transition-colors",
              lang === l.code
                ? "border-primary bg-primary-soft text-accent-foreground"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {l.native}
          </button>
        ))}
      </div>
    </div>
  );
}
