import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  adHref,
  adPlacementsQuery,
  eligibleAdsQuery,
  isExternalAd,
  recordAdClick,
  recordAdImpression,
  type Ad,
  type AdPlacementKey,
  type AdTargeting,
} from "@/lib/ads";
import { StorageImage } from "@/lib/media";
import { cn } from "@/lib/utils";

const SESSION_KEY = "ligo-ad-session";

/** Stable per-tab id so impression dedupe is per visitor, not per render. */
function useAdSession() {
  const [session] = useState(() => {
    if (typeof window === "undefined") return "ssr";
    try {
      const existing = window.sessionStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const id = `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      window.sessionStorage.setItem(SESSION_KEY, id);
      return id;
    } catch {
      return `s_${Math.random().toString(36).slice(2)}`;
    }
  });
  return session;
}

function useCurrentPath() {
  return useRouterState({
    select: (s) => `${s.location.pathname}${s.location.searchStr ?? ""}`,
  });
}

/** Counts one impression when the creative is actually visible in the viewport. */
function useImpression(adId: string, placement: string, enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const session = useAdSession();
  const path = useCurrentPath();

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            recordAdImpression(adId, placement, session, path);
            observer.disconnect();
          }
        }
      },
      { threshold: [0.5] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [adId, placement, session, path, enabled]);

  return ref;
}

export function SponsoredLabel({ className }: { className?: string }) {
  return (
    <span
      aria-label="Sponsored advertisement"
      className={cn(
        "pointer-events-none inline-flex items-center rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm",
        className,
      )}
    >
      Sponsored
    </span>
  );
}

/** One creative: image (or gradient), overlay copy, sponsored label. */
export function AdCreative({
  ad,
  placement,
  aspectClass,
  priority = false,
  track = true,
  onNavigate,
}: {
  ad: Ad;
  placement: string;
  aspectClass: string;
  priority?: boolean;
  track?: boolean;
  onNavigate?: () => void;
}) {
  const session = useAdSession();
  const path = useCurrentPath();
  const href = adHref(ad);
  const external = isExternalAd(ad);
  const impressionRef = useImpression(ad.id, placement, track);

  const handleClick = useCallback(() => {
    if (track) recordAdClick(ad.id, placement, session, path);
    onNavigate?.();
  }, [ad.id, placement, session, path, track, onNavigate]);

  const inner = (
    <div
      ref={impressionRef}
      className={cn(
        "group relative block h-full w-full overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-pop",
        href && "cursor-pointer",
      )}
    >
      {ad.image_url ? (
        <StorageImage
          path={ad.image_url}
          alt={ad.title || ad.name}
          priority={priority}
          className={cn("h-full w-full", aspectClass)}
        />
      ) : (
        <div
          className={cn(
            "h-full w-full bg-gradient-to-br from-primary/25 via-primary/10 to-primary/5",
            aspectClass,
          )}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
      <SponsoredLabel className="absolute left-2.5 top-2.5" />
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        {ad.title && (
          <p className="line-clamp-2 font-display text-sm font-bold leading-snug text-white sm:text-lg">
            {ad.title}
          </p>
        )}
        {ad.subtitle && (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-white/85 sm:text-sm">{ad.subtitle}</p>
        )}
        {ad.cta_label && (
          <span className="mt-2 inline-flex rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-primary sm:text-xs">
            {ad.cta_label}
          </span>
        )}
      </div>
    </div>
  );

  if (!href) return inner;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
        className="block h-full w-full"
      >
        {inner}
      </a>
    );
  }

  return (
    <Link to={href} onClick={handleClick} className="block h-full w-full">
      {inner}
    </Link>
  );
}

/**
 * Live ad placement. Reads eligible ads for the placement from the database, so
 * publishing an ad in the admin console is all it takes for it to appear here.
 * Renders nothing when there are no eligible ads — no empty gaps.
 */
export function AdSlot({
  placement,
  targeting,
  className,
  label,
}: {
  placement: AdPlacementKey | string;
  targeting?: AdTargeting;
  className?: string;
  label?: string;
}) {
  const { data: ads = [] } = useQuery(eligibleAdsQuery(placement, targeting ?? {}));
  const { data: placements = [] } = useQuery(adPlacementsQuery);
  const config = placements.find((p) => p.key === placement);
  const layout = config?.layout ?? "carousel";
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);

  const count = ads.length;
  const aspectClass = "aspect-[16/9] sm:aspect-[16/6]";

  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    if (layout !== "carousel" || count <= 1 || paused) return;
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setIndex((i) => (i + 1) % count);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [layout, count, paused]);

  const go = useCallback(
    (dir: -1 | 1) => setIndex((i) => (i + dir + count) % Math.max(count, 1)),
    [count],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (start == null) return;
    const delta = (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) < 40) return;
    go(delta < 0 ? 1 : -1);
  };

  if (count === 0) return null;

  if (layout === "grid") {
    return (
      <section
        className={cn("container-ligo py-4", className)}
        aria-label={label ?? "Advertisements"}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad, i) => (
            <AdCreative
              key={ad.id}
              ad={ad}
              placement={placement}
              aspectClass="aspect-[16/10]"
              priority={i === 0}
            />
          ))}
        </div>
      </section>
    );
  }

  if (layout === "single") {
    const ad = ads[0];
    if (!ad) return null;
    return (
      <section
        className={cn("container-ligo py-4", className)}
        aria-label={label ?? "Advertisement"}
      >
        <AdCreative ad={ad} placement={placement} aspectClass={aspectClass} priority />
      </section>
    );
  }

  // carousel (default): one ad visible, autoplay, swipe, dots + arrows
  return (
    <section
      className={cn("container-ligo py-4", className)}
      aria-label={label ?? "Advertisements"}
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative">
        <div
          className="overflow-hidden rounded-2xl"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {ads.map((ad, i) => (
              <div key={ad.id} className="w-full shrink-0" aria-hidden={i !== index}>
                <AdCreative
                  ad={ad}
                  placement={placement}
                  aspectClass={aspectClass}
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous advertisement"
              className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-card transition-colors hover:bg-background sm:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next advertisement"
              className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-card transition-colors hover:bg-background sm:flex"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="mt-2.5 flex justify-center gap-1.5">
              {ads.map((ad, i) => (
                <button
                  key={ad.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to advertisement ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-5 bg-primary" : "w-1.5 bg-border",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/** Admin preview of a creative. Never records impressions or clicks. */
export function AdPreview({
  ad,
  aspectClass = "aspect-[16/9] sm:aspect-[16/6]",
}: {
  ad: Ad;
  aspectClass?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl">
      <AdCreative ad={ad} placement="PREVIEW" aspectClass={aspectClass} track={false} />
    </div>
  );
}
