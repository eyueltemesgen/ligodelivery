import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { siteContentQuery } from "@/lib/content";
import { useLanguage } from "@/hooks/useLanguage";
import { StorageImage } from "@/lib/media";

export function Logo({ compact = false }: { compact?: boolean }) {
  const { t, language } = useLanguage();
  const { data: c } = useQuery(siteContentQuery);
  const tagline = language === "en" ? c?.brand_tagline : t("brand_tagline");
  const short = c?.brand_short_name || c?.brand_name || "የኔ Go";
  const mark = short.trim().charAt(0).toUpperCase();

  return (
    <Link to="/" className="flex items-center gap-2">
      {c?.logo_url ? (
        <StorageImage path={c.logo_url} alt={short} className="h-9 w-9 rounded-lg object-cover" />
      ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary font-display text-lg font-extrabold text-primary-foreground">
          {mark}
        </span>
      )}
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-xl font-extrabold tracking-tight">{short}</span>
          {tagline && (
            <span className="block text-[11px] font-medium text-muted-foreground">{tagline}</span>
          )}
        </span>
      )}
    </Link>
  );
}
