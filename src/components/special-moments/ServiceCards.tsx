import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Star, Wallet } from "lucide-react";
import type { Service, ServiceCategory } from "@/lib/special-moments";
import { categoryMeta, pricingLabel } from "@/lib/service-catalog";
import { StorageImage } from "@/lib/media";
import { useI18n, useContentTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Category tile used on the Special Moments hub and the homepage strip. */
export function ServiceCategoryCard({
  category,
  count,
  className,
}: {
  category: ServiceCategory;
  count?: number;
  className?: string;
}) {
  const { t } = useI18n();
  const { localize } = useContentTranslations("service_category");
  const view = localize(category);
  const meta = categoryMeta(view.slug);
  const Icon = meta.icon;
  return (
    <Link
      to="/special-moments/category/$slug"
      params={{ slug: view.slug }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
        className,
      )}
    >
      <StorageImage
        path={view.image_url}
        alt={view.name}
        fallback={<Icon className="h-8 w-8 text-primary/70" />}
        className="h-36 w-full object-cover sm:h-40"
      />
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="font-display text-base font-bold">{view.name}</h3>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {view.tagline || t(meta.blurbKey)}
        </p>
        {count != null && (
          <p className="mt-3 text-xs font-semibold text-primary">
            {count > 0 ? t("moments.available", { count }) : t("moments.comingSoon")}
          </p>
        )}
      </div>
    </Link>
  );
}

/** Compact link tile used in navigation strips where imagery is not needed. */
export function ServiceCategoryPill({ category }: { category: ServiceCategory }) {
  const { localize } = useContentTranslations("service_category");
  const view = localize(category);
  const Icon = categoryMeta(view.slug).icon;
  return (
    <Link
      to="/special-moments/category/$slug"
      params={{ slug: view.slug }}
      className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    >
      <Icon className="h-4 w-4 text-primary" />
      {view.name}
    </Link>
  );
}

export function ServiceCard({ service }: { service: Service }) {
  const { t } = useI18n();
  const { localize } = useContentTranslations("service");
  const view = localize(service);
  return (
    <Link
      to="/special-moments/service/$serviceId"
      params={{ serviceId: view.id }}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <StorageImage
        path={view.image_url}
        alt={view.name}
        className="h-40 w-full object-cover"
        fallback={<Wallet className="h-7 w-7 text-muted-foreground" />}
      />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-bold leading-snug">{view.name}</h3>
          {view.is_featured && (
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
              <Star className="h-3.5 w-3.5 fill-primary" />
            </span>
          )}
        </div>
        {view.occasion && (
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {view.occasion}
          </p>
        )}
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">
          {view.description || t("moments.detailsOnPage")}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {view.service_area && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {view.service_area}
            </span>
          )}
          {view.lead_time_hours > 0 && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {t("moments.leadTime", { hours: view.lead_time_hours })}
            </span>
          )}
        </div>
        <p className="mt-3 font-display text-base font-extrabold text-primary">
          {pricingLabel(t, view.pricing_type, view.price, view.starting_price)}
        </p>
      </div>
    </Link>
  );
}
