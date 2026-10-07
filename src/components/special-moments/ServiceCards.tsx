import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, MapPin, Star, Wallet } from "lucide-react";
import type { Service, ServiceCategory } from "@/lib/special-moments";
import { categoryMeta, categoryCopy, pricingLabel } from "@/lib/service-catalog";
import { StorageImage } from "@/lib/media";
import { useLanguage } from "@/hooks/useLanguage";
import { OPTION_LABEL_KEY } from "@/lib/special-moments";
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
  const { t, language } = useLanguage();
  const meta = categoryMeta(category.slug);
  const copy = categoryCopy(t, category, language);
  const Icon = meta.icon;
  return (
    <Link
      to="/special-moments/category/$slug"
      params={{ slug: category.slug }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
        className,
      )}
    >
      <StorageImage
        path={category.image_url}
        alt={copy.name}
        fallback={<Icon className="h-8 w-8 text-primary/70" />}
        width={720}
        height={240}
        className="h-36 w-full object-cover sm:h-40"
      />
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="font-display text-base font-bold">{copy.name}</h3>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{copy.tagline}</p>
        {count != null && (
          <p className="mt-3 text-xs font-semibold text-primary">
            {count > 0 ? t("sc_available", { count }) : t("sc_coming_soon")}
          </p>
        )}
      </div>
    </Link>
  );
}

/** Compact link tile used in navigation strips where imagery is not needed. */
export function ServiceCategoryPill({ category }: { category: ServiceCategory }) {
  const { t, language } = useLanguage();
  const Icon = categoryMeta(category.slug).icon;
  return (
    <Link
      to="/special-moments/category/$slug"
      params={{ slug: category.slug }}
      className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    >
      <Icon className="h-4 w-4 text-primary" />
      {categoryCopy(t, category, language).name}
    </Link>
  );
}

/**
 * Full-bleed hero slide used by the Special Moments showcase, where the whole
 * service rotates one screen at a time instead of sitting in a grid. The copy
 * sits over a scrim so it stays legible on any uploaded photo.
 */
export function ServiceHeroSlide({
  service,
  priority = false,
}: {
  service: Service;
  priority?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <Link
      to="/special-moments/service/$serviceId"
      params={{ serviceId: service.id }}
      className="group relative block h-full w-full overflow-hidden"
    >
      <StorageImage
        path={service.image_url}
        alt={service.name}
        priority={priority}
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full"
        fallback={<Wallet className="h-10 w-10 text-white/60" />}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
      <div className="relative flex h-full flex-col justify-end gap-3 p-6 sm:p-10 lg:p-14">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/85">
          {service.occasion && (
            <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
              {t(OPTION_LABEL_KEY[service.occasion] ?? "sms_any_occasion")}
            </span>
          )}
          {service.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-primary-foreground">
              <Star className="h-3 w-3 fill-current" />
              {t("smi_featured_badge")}
            </span>
          )}
        </div>
        <h2 className="max-w-2xl font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
          {service.name}
        </h2>
        <p className="max-w-xl text-sm text-white/85 sm:text-base">
          {service.description || t("sc_details_default")}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
          {service.service_area && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {service.service_area}
            </span>
          )}
          {service.lead_time_hours > 0 && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {t("sc_notice", { hours: service.lead_time_hours })}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-4">
          <span className="font-display text-xl font-extrabold text-white sm:text-2xl">
            {pricingLabel(t, service.pricing_type, service.price, service.starting_price)}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-foreground transition group-hover:gap-3">
            {t("smd_book_now")}
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ServiceCard({ service }: { service: Service }) {
  const { t } = useLanguage();
  return (
    <Link
      to="/special-moments/service/$serviceId"
      params={{ serviceId: service.id }}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <StorageImage
        path={service.image_url}
        alt={service.name}
        width={720}
        height={240}
        className="h-40 w-full object-cover"
        fallback={<Wallet className="h-7 w-7 text-muted-foreground" />}
      />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-bold leading-snug">{service.name}</h3>
          {service.is_featured && (
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
              <Star className="h-3.5 w-3.5 fill-primary" />
            </span>
          )}
        </div>
        {service.occasion && (
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t(OPTION_LABEL_KEY[service.occasion] ?? "sms_any_occasion")}
          </p>
        )}
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">
          {service.description || t("sc_details_default")}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {service.service_area && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {service.service_area}
            </span>
          )}
          {service.lead_time_hours > 0 && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {t("sc_notice", { hours: service.lead_time_hours })}
            </span>
          )}
        </div>
        <p className="mt-3 font-display text-base font-extrabold text-primary">
          {pricingLabel(t, service.pricing_type, service.price, service.starting_price)}
        </p>
      </div>
    </Link>
  );
}
