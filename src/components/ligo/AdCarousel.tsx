import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { bannersQuery, type Banner } from "@/lib/content";
import { StorageImage } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

/** Milliseconds each advertisement stays on screen before the next one. */
const ROTATE_MS = 4000;
/** How long to hold after a manual swipe/tap before auto-rotation resumes. */
const RESUME_MS = 8000;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * One shared advertisement slot. All active banners for `placement` occupy a
 * single fixed-size area and rotate automatically; the slot hides itself when
 * there is nothing live. Admin just adds/activates banners — ordering, timing
 * and transitions are handled here.
 */
export function AdCarousel({
  placement,
  className,
  wrapperClassName,
  chrome = true,
  width = 768,
  priority = false,
  aspect = "aspect-[16/6]",
}: {
  placement: string;
  className?: string | undefined;
  /** Extra classes on the carousel card itself (not the outer section). */
  wrapperClassName?: string | undefined;
  /** Draw the rounded card frame. Disable when embedding in a styled hero. */
  chrome?: boolean;
  /** Signed-image render width (Supabase resize + WebP) for the whole slot. */
  width?: number;
  /** Load the first slide eagerly (above-the-fold placements). */
  priority?: boolean;
  /** Tailwind class reserving the slot's height (aspect-ratio or fixed h-*). */
  aspect?: string;
}) {
  const { t } = useLanguage();
  const { data: banners = [] } = useQuery(bannersQuery(placement));

  // Stable order: the query already sorts by sort_order; guard against ties so
  // the rotation never reshuffles between renders.
  const ads = useMemo(
    () =>
      [...banners].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)),
    [banners],
  );

  if (ads.length === 0) return null;

  return (
    <section className={className ?? "container-ligo py-4"} aria-label={t("ads_aria")}>
      <Carousel
        ads={ads}
        width={width}
        priority={priority}
        aspect={aspect}
        chrome={chrome}
        wrapperClassName={wrapperClassName}
      />
    </section>
  );
}

function Carousel({
  ads,
  width,
  priority,
  aspect,
  chrome,
  wrapperClassName,
}: {
  ads: Banner[];
  width: number;
  priority: boolean;
  aspect: string;
  chrome: boolean;
  wrapperClassName?: string | undefined;
}) {
  const { t } = useLanguage();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [manualUntil, setManualUntil] = useState(0);
  const touchX = useRef<number | null>(null);
  const n = ads.length;
  const idx = n > 0 ? i % n : 0;
  const many = n > 1;

  useEffect(() => {
    if (!many || paused || prefersReducedMotion()) return;
    const id = setInterval(() => setI((v) => v + 1), ROTATE_MS);
    return () => clearInterval(id);
  }, [many, paused]);

  // Pause briefly after the visitor drives the carousel themselves.
  useEffect(() => {
    if (!manualUntil) return;
    const id = setTimeout(() => setManualUntil(0), Math.max(0, manualUntil - Date.now()));
    return () => clearTimeout(id);
  }, [manualUntil]);

  const holdAfterManual = () => setManualUntil(Date.now() + RESUME_MS);

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        chrome && "rounded-2xl border border-border bg-card shadow-card",
        wrapperClassName,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        if (start != null && end != null && Math.abs(end - start) > 40) {
          setI((v) => v + (end < start ? 1 : -1));
          holdAfterManual();
        }
        touchX.current = null;
      }}
    >
      <div className={cn("relative w-full", aspect)}>
        {ads.map((ad, k) => (
          <Slide
            key={ad.id}
            ad={ad}
            width={width}
            active={k === idx}
            priority={priority && k === 0}
            // Only the active slide is focusable, so keyboard users never tab
            // into an off-screen ad link.
            hidden={k !== idx}
          />
        ))}
      </div>

      {many && (
        <>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-background/70 px-2 py-1 backdrop-blur-sm">
            {ads.map((a, k) => (
              <button
                key={a.id}
                type="button"
                aria-label={t("ads_show", { n: k + 1 })}
                aria-current={k === idx}
                onClick={() => {
                  setI(k);
                  holdAfterManual();
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  k === idx ? "w-5 bg-primary" : "w-1.5 bg-foreground/40 hover:bg-foreground/60",
                )}
              />
            ))}
          </div>
          <span className="sr-only" aria-live="polite">
            {t("ads_show", { n: idx + 1 })}
          </span>
        </>
      )}
    </div>
  );
}

function Slide({
  ad,
  width,
  active,
  priority,
  hidden,
}: {
  ad: Banner;
  width: number;
  active: boolean;
  priority: boolean;
  hidden: boolean;
}) {
  const { t } = useLanguage();
  const href = ad.link_url;
  const external = !!href && /^https?:/.test(href);
  const alt = ad.title || t("ads_aria");

  const body = (
    <>
      {ad.image_url ? (
        <StorageImage
          path={ad.image_url}
          alt={alt}
          width={width}
          height={Math.round(width * 0.375)}
          priority={priority}
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 to-accent/25" />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-3 pb-8 sm:p-5 sm:pb-8">
        <p className="line-clamp-1 font-display text-sm font-bold text-white sm:text-lg">
          {ad.title}
        </p>
        {ad.subtitle && (
          <p className="line-clamp-1 text-xs text-white/85 sm:text-sm">{ad.subtitle}</p>
        )}
      </div>
      <span className="absolute left-2 top-2 rounded bg-background/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground">
        {t("ads_sponsored")}
      </span>
      {ad.cta_label && href && (
        <span className="absolute right-2 top-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
          {ad.cta_label}
        </span>
      )}
    </>
  );

  const base = "absolute inset-0 block transition-opacity duration-700 ease-in-out";

  if (href) {
    return (
      <a
        href={href}
        tabIndex={hidden ? -1 : 0}
        aria-hidden={hidden}
        className={cn(base, active ? "opacity-100" : "pointer-events-none opacity-0")}
        {...(external ? { target: "_blank", rel: "noopener noreferrer sponsored" } : {})}
      >
        {body}
      </a>
    );
  }
  return (
    <div
      aria-hidden={hidden}
      className={cn(base, active ? "opacity-100" : "pointer-events-none opacity-0")}
    >
      {body}
    </div>
  );
}
