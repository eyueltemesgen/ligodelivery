import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { siteContentQuery } from "@/lib/content";
import { StorageImage } from "@/lib/media";

export function Logo({ compact = false }: { compact?: boolean }) {
  const { data: c } = useQuery(siteContentQuery);
  const short = c?.brand_short_name || c?.brand_name || "የኔ Go";

  return (
    <Link to="/" className="flex min-w-0 items-center gap-2">
      {c?.logo_url ? (
        <StorageImage
          path={c.logo_url}
          alt={short}
          className="h-9 w-9 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary font-display text-lg font-extrabold text-primary-foreground">
          {short.charAt(0).toUpperCase()}
        </span>
      )}
      {!compact && (
        <span className="min-w-0 leading-none">
          <span className="block truncate font-display text-xl font-extrabold tracking-tight">
            {short}
          </span>
          {c?.brand_tagline && (
            <span className="block truncate text-[11px] font-medium text-muted-foreground">
              {c.brand_tagline}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
