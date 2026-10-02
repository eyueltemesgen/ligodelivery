import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { siteContentQuery } from "@/lib/content";
import { StorageImage } from "@/lib/media";

export function Logo({ compact = false }: { compact?: boolean }) {
  const { data: c } = useQuery(siteContentQuery);
  const short = c?.brand_short_name || c?.brand_name || "Ligo";

  return (
    <Link to="/" className="flex items-center gap-2">
      {c?.logo_url ? (
        <StorageImage
          path={c.logo_url}
          alt={short}
          className="h-10 w-10 rounded-lg object-cover md:h-11 md:w-11"
        />
      ) : (
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary font-display text-lg font-extrabold text-primary-foreground md:h-11 md:w-11 md:text-xl">
          {short.charAt(0).toUpperCase()}
        </span>
      )}
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-xl font-extrabold tracking-tight md:text-2xl">
            {short}
          </span>
          {c?.brand_tagline && (
            <span className="block text-[11px] font-medium text-muted-foreground">
              {c.brand_tagline}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
