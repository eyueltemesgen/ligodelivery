import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { adsQuery, currentDevice, trackAd, type Ad } from "@/lib/ads";
import { StorageImage } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

type Ctx = { categoryId?: string | null; shopId?: string | null };

/** Database-driven ad placement: renders all live ads for `placement` as a rotating carousel. */
export function AdSlot({
  placement,
  context,
  className,
}: {
  placement: string;
  context?: Ctx;
  className?: string;
}) {
  const { t } = useLanguage();
  const { data = [] } = useQuery(adsQuery(placement));
  const [device, setDevice] = useState<"mobile" | "desktop" | null>(null);
  useEffect(() => setDevice(currentDevice()), []);

  const ads = useMemo(
    () =>
      data.filter(
        (a) =>
          (a.target_device === "all" || !device || a.target_device === device) &&
          (!a.target_category_id || a.target_category_id === context?.categoryId) &&
          (!a.target_shop_id || a.target_shop_id === context?.shopId),
      ),
    [data, device, context?.categoryId, context?.shopId],
  );

  if (ads.length === 0) return null;
  return (
    <section className={className ?? "container-ligo py-4"} aria-label={t("ads_aria")}>
      <Carousel ads={ads} />
    </section>
  );
}

function Carousel({ ads }: { ads: Ad[] }) {
  const { t: tr } = useLanguage();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const n = ads.length;
  const idx = i % n;

  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setInterval(() => setI((v) => (v + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n, paused]);

  // Record an impression only when the visible slide is actually on screen.
  useEffect(() => {
    const el = ref.current;
    const ad = ads[idx];
    if (!el || !ad) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) trackAd(ad.id, "impression");
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ads, idx]);

  const go = (d: number) => setI((v) => (v + d + n) % n);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        if (start != null && end != null && Math.abs(end - start) > 40) go(end < start ? 1 : -1);
        touchX.current = null;
        setPaused(false);
      }}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {ads.map((ad, k) => (
          <Slide key={ad.id} ad={ad} priority={k === 0} hidden={k !== idx} />
        ))}
      </div>
      {n > 1 && (
        <>
          <button
            type="button"
            aria-label={tr("ads_prev")}
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={tr("ads_next")}
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {ads.map((a, k) => (
              <button
                key={a.id}
                type="button"
                aria-label={tr("ads_show", { n: k + 1 })}
                onClick={() => setI(k)}
                className={cn(
                  "h-2 rounded-full bg-background/80 transition-all",
                  k === idx ? "w-5 bg-primary" : "w-2",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Slide({ ad, priority, hidden }: { ad: Ad; priority: boolean; hidden: boolean }) {
  const { t: tr } = useLanguage();
  const href = ad.destination_url;
  const external = !!href && /^https?:/.test(href);
  const body = (
    <div className="relative grid min-w-0 sm:grid-cols-[1.4fr_1fr]">
      <div className="relative aspect-[16/9] w-full sm:aspect-auto sm:min-h-56">
        {ad.image_url ? (
          <StorageImage
            path={ad.image_url}
            alt={ad.title}
            priority={priority}
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30" />
        )}
        <span className="absolute left-2 top-2 rounded bg-background/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground">
          {tr("ads_sponsored")}
        </span>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-1 p-4 pb-8 sm:p-6">
        <p className="break-words font-display text-lg font-bold leading-tight sm:text-2xl">
          {ad.title}
        </p>
        {ad.subtitle && <p className="break-words text-sm text-muted-foreground">{ad.subtitle}</p>}
        {ad.cta_label && href && (
          <span className="mt-2 inline-flex w-fit rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
            {ad.cta_label}
          </span>
        )}
      </div>
    </div>
  );
  return (
    <div className="w-full shrink-0" aria-hidden={hidden}>
      {href ? (
        <a
          href={href}
          tabIndex={hidden ? -1 : 0}
          onClick={() => trackAd(ad.id, "click")}
          className="block"
          {...(external ? { target: "_blank", rel: "noopener noreferrer sponsored" } : {})}
        >
          {body}
        </a>
      ) : (
        body
      )}
    </div>
  );
}
