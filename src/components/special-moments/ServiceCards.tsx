import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Star, Wallet } from "lucide-react";
import type { Service, ServiceCategory } from "@/lib/special-moments";
import { categoryMeta, categoryCopy, pricingLabel } from "@/lib/service-catalog";
import { StorageImage } from "@/lib/media";
import { useLanguage } from "@/hooks/useLanguage";
import { OPTION_LABEL_KEY } from "@/lib/special-moments";
import { cn } from "@/lib/utils";

/** How long to hold after a manual swipe/tap before auto-rotation resumes (matches the hero). */
const RESUME_MS = 8000;

/** Category tile used on the homepage strip. */
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

/**
 * Compact auto-rotating banner for the Special Moments categories. Built on the
 * exact same system as the home hero banner (`AdCarousel`): full-bleed slides
 * that cross-fade over a dark scrim, a top-left badge, a top-right pill, and
 * bottom-centre bar indicators, rotating every 3 s and holding 8 s after a
 * manual swipe/tap. Content is Special Moments categories instead of ad banners.
 */
export function ServiceCategoryBanner({
  categories,
  counts,
  ariaLabel,
  intervalMs = 3000,
  className,
}: {
  categories: ServiceCategory[];
  counts?: Record<string, number>;
  ariaLabel: string;
  intervalMs?: number;
  className?: string;
}) {
  const { t } = useLanguage();
  const n = categories.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [manualUntil, setManualUntil] = useState(0);
  const touchX = useRef<number | null>(null);
  const idx = n > 0 ? index % n : 0;

  // Reset to the first slide whenever the set of categories changes.
  useEffect(() => setIndex(0), [n]);

  useEffect(() => {
    if (n < 2 || paused) return;
    const timer = setInterval(() => setIndex((v) => v + 1), intervalMs);
    return () => clearInterval(timer);
  }, [n, paused, intervalMs]);

  // Hold briefly after the visitor drives the carousel themselves.
  useEffect(() => {
    if (!manualUntil) return;
    const id = setTimeout(() => setManualUntil(0), Math.max(0, manualUntil - Date.now()));
    return () => clearTimeout(id);
  }, [manualUntil]);

  if (n === 0) return null;

  const hold = () => setManualUntil(Date.now() + RESUME_MS);

  return (
    <div
      className={cn(
        "relative h-48 overflow-hidden rounded-2xl border border-border bg-card shadow-card sm:h-56",
        className,
      )}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setPaused(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setPaused(false);
      }}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        if (start != null && end != null && Math.abs(end - start) > 40) {
          setIndex((v) => v + (end < start ? 1 : -1));
          hold();
        }
        touchX.current = null;
        setPaused(false);
      }}
      // A horizontal drag makes the browser fire pointercancel *before*
      // touchend, so the origin must survive it for the swipe to register.
      // Only a genuine touchcancel (no touchend follows) clears it.
      onTouchCancel={() => {
        touchX.current = null;
        setPaused(false);
      }}
      onPointerCancel={() => setPaused(false)}
    >
      {categories.map((category, i) => (
        <CategorySlide
          key={category.id}
          category={category}
          count={counts ? (counts[category.id] ?? 0) : undefined}
          active={i === idx}
          priority={i === 0}
          hidden={i !== idx}
        />
      ))}
      {n > 1 && (
        <>
          <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-background/70 px-2 py-1 backdrop-blur-sm">
            {categories.map((category, i) => (
              <button
                key={category.id}
                type="button"
                aria-label={t("carousel_show", { n: i + 1 })}
                aria-current={i === idx}
                onClick={() => {
                  setIndex(i);
                  hold();
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-5 bg-primary" : "w-1.5 bg-foreground/40 hover:bg-foreground/60",
                )}
              />
            ))}
          </div>
          <span className="sr-only" aria-live="polite">
            {t("carousel_show", { n: idx + 1 })}
          </span>
        </>
      )}
    </div>
  );
}

function CategorySlide({
  category,
  count,
  active,
  priority,
  hidden,
}: {
  category: ServiceCategory;
  count?: number | undefined;
  active: boolean;
  priority: boolean;
  hidden: boolean;
}) {
  const { t, language } = useLanguage();
  const meta = categoryMeta(category.slug);
  const copy = categoryCopy(t, category, language);
  const Icon = meta.icon;
  const available = count != null && count > 0;
  return (
    <Link
      to="/special-moments/category/$slug"
      params={{ slug: category.slug }}
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden}
      className={cn(
        "absolute inset-0 block transition-opacity duration-700 ease-in-out",
        active ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <StorageImage
        path={category.image_url}
        alt={copy.name}
        priority={priority}
        width={1080}
        height={540}
        className="absolute inset-0 h-full w-full object-cover"
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/25 to-accent/25">
            <Icon className="h-9 w-9 text-primary" />
          </div>
        }
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-3 pb-8 sm:p-5 sm:pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
            <Icon className="h-3.5 w-3.5" />
            {t("smi_badge")}
          </span>
          {count != null && (
            <span className="rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground">
              {available ? t("sc_available", { count }) : t("sc_coming_soon")}
            </span>
          )}
        </div>
        <h3 className="line-clamp-1 break-words font-display text-sm font-extrabold leading-tight text-white drop-shadow sm:text-lg">
          {copy.name}
        </h3>
        {copy.tagline && (
          <p className="line-clamp-1 text-xs text-white/85 sm:text-sm">{copy.tagline}</p>
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
