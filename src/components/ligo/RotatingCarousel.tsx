import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

/**
 * Honor the user's reduced-motion preference. The carousel still advances, but
 * the swap is instant instead of sliding — autoplay must keep working, since
 * silently freezing a banner is a worse outcome than an unanimated change.
 */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

const GAP_PX = 16;

/**
 * Autoplay with a stable timer. `advance` is read through a ref so a re-render
 * cannot restart the interval and starve rotation on a busy page.
 */
function useAutoplay(active: boolean, intervalMs: number, advance: () => void) {
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => advanceRef.current(), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs]);
}

/** Stop rotating while the tab is hidden, resume when it comes back. */
function useDocumentVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    onChange();
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

/**
 * Pause a carousel while it is scrolled out of view. Autoplay is a courtesy for
 * content the visitor can actually see; rotating off-screen slides burns work
 * and can leave a carousel mid-transition when the user scrolls back to it.
 */
function useOnScreen<T extends HTMLElement>(rootMargin = "80px") {
  const ref = useRef<T>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry?.isIntersecting ?? true),
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);
  return [ref, onScreen] as const;
}

/**
 * Pause a carousel while the visitor is engaging with it: hovering (mouse
 * only), keyboard focus inside it, or a touch drag in progress. Touch devices
 * synthesise mouseenter/mouseleave around taps, so hover is filtered to real
 * pointer devices — otherwise a stray mouseenter with no matching mouseleave
 * latches `paused` true forever.
 */
function usePauseControl() {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);

  const handlers = {
    onPointerEnter: (e: { pointerType?: string }) => {
      if (e.pointerType === "mouse") setHovered(true);
    },
    onPointerLeave: (e: { pointerType?: string }) => {
      if (e.pointerType === "mouse") setHovered(false);
    },
    onFocusCapture: () => setFocused(true),
    onBlurCapture: () => setFocused(false),
  };

  return { paused: hovered || focused || touching, setTouching, handlers };
}

type SlideControlsProps = {
  count: number;
  active: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
  /**
   * "overlay" sits on top of imagery and is always visible; "plain" sits under a
   * card row and only appears on hover/focus so it does not add chrome.
   */
  tone?: "overlay" | "plain";
  /** Use light arrows/indicators for text over a dark image. */
  onMedia?: boolean;
};

function SlideControls({
  count,
  active,
  onPrev,
  onNext,
  onSelect,
  tone = "overlay",
  onMedia = false,
}: SlideControlsProps) {
  const { t } = useLanguage();
  const overlay = tone === "overlay";

  const dot = (i: number) => (
    <button
      key={i}
      type="button"
      aria-label={t("carousel_show", { n: i + 1 })}
      aria-current={i === active}
      onClick={() => onSelect(i)}
      className={cn(
        "h-1.5 rounded-full transition-all duration-300",
        i === active
          ? onMedia
            ? "w-6 bg-white"
            : "w-6 bg-primary"
          : onMedia
            ? "w-1.5 bg-white/50 hover:bg-white/80"
            : "w-1.5 bg-foreground/25 hover:bg-foreground/50",
      )}
    />
  );

  const arrowClass = cn(
    "grid h-9 w-9 place-items-center rounded-full transition",
    onMedia
      ? "bg-black/25 text-white backdrop-blur-sm hover:bg-black/45"
      : "border border-border bg-card text-foreground shadow-card hover:bg-muted",
  );

  const arrows = (
    <>
      <button
        type="button"
        aria-label={t("ui_previous_slide")}
        onClick={onPrev}
        className={arrowClass}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" aria-label={t("ui_next_slide")} onClick={onNext} className={arrowClass}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </>
  );

  // Overlay: arrows float on the media, indicators sit on a pill at the bottom.
  if (overlay) {
    return (
      <>
        <button
          type="button"
          aria-label={t("ui_previous_slide")}
          onClick={onPrev}
          className={cn(arrowClass, "absolute left-3 top-1/2 z-10 -translate-y-1/2")}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label={t("ui_next_slide")}
          onClick={onNext}
          className={cn(arrowClass, "absolute right-3 top-1/2 z-10 -translate-y-1/2")}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 shadow-card backdrop-blur">
          {Array.from({ length: count }, (_, i) => dot(i))}
        </div>
      </>
    );
  }

  // Plain: everything stays in flow below the cards, so nothing hangs outside
  // the container and causes horizontal overflow on narrow screens.
  return (
    <div className="mt-3 flex items-center justify-center gap-3">
      {arrows}
      <div className="flex items-center gap-2">
        {Array.from({ length: count }, (_, i) => dot(i))}
      </div>
    </div>
  );
}

/**
 * Full-width slide rotator. One child is visible at a time and advances on a
 * timer, with swipe, arrow and dot navigation. A single child renders as-is.
 */
export function RotatingSlides({
  children,
  ariaLabel,
  className,
  intervalMs = 5000,
  controls = true,
  onMedia = false,
}: {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
  intervalMs?: number;
  controls?: boolean;
  onMedia?: boolean;
}) {
  const slides = Children.toArray(children);
  const n = slides.length;
  const [index, setIndex] = useState(0);
  const { paused, setTouching, handlers } = usePauseControl();
  const [rootRef, onScreen] = useOnScreen<HTMLDivElement>();
  const visible = useDocumentVisible();
  const reduced = usePrefersReducedMotion();
  const touchX = useRef<number | null>(null);
  const idx = n > 0 ? ((index % n) + n) % n : 0;

  useEffect(() => setIndex(0), [n]);

  useAutoplay(n > 1 && !paused && visible && onScreen, intervalMs, () =>
    setIndex((v) => (v + 1) % n),
  );

  if (n === 0) return null;
  if (n === 1) return <div className={className}>{slides[0]}</div>;

  const go = (delta: number) => setIndex((v) => (((v + delta) % n) + n) % n);

  return (
    <div
      ref={rootRef}
      className={cn("relative overflow-hidden", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      {...handlers}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
        setTouching(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        if (start != null && end != null && Math.abs(end - start) > 40) go(end < start ? 1 : -1);
        touchX.current = null;
        setTouching(false);
      }}
      // Cancelled touch/pointer gestures must still resume autoplay.
      onTouchCancel={() => {
        touchX.current = null;
        setTouching(false);
      }}
      onPointerCancel={() => {
        touchX.current = null;
        setTouching(false);
      }}
    >
      <div
        className={cn(
          "flex transition-transform duration-700 ease-out",
          reduced && "transition-none",
        )}
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className="w-full shrink-0"
            aria-hidden={i !== idx}
            {...(i !== idx ? { inert: true } : {})}
          >
            {slide}
          </div>
        ))}
      </div>
      {controls && (
        <SlideControls
          count={n}
          active={idx}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          onSelect={setIndex}
          onMedia={onMedia}
        />
      )}
    </div>
  );
}

/**
 * Horizontally scrolling card row that rotates a page at a time. Cards keep a
 * responsive width, so the same row shows 1–2 cards on phones and 4–5 on wide
 * screens while remaining swipeable.
 */
export function RotatingRow<T>({
  items,
  renderItem,
  keyOf,
  ariaLabel,
  className,
  itemClassName = "w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[23%]",
  intervalMs = 5000,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyOf: (item: T, index: number) => string | number;
  ariaLabel: string;
  className?: string;
  itemClassName?: string;
  intervalMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { paused, setTouching, handlers } = usePauseControl();
  const [rootRef, onScreen] = useOnScreen<HTMLDivElement>();
  const visible = useDocumentVisible();
  const [active, setActive] = useState(0);
  const n = items.length;

  const step = useCallback(() => {
    const el = ref.current;
    if (!el) return 0;
    const first = el.firstElementChild as HTMLElement | null;
    return (first?.offsetWidth ?? el.clientWidth) + GAP_PX;
  }, []);

  const advance = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step(), behavior: "smooth" });
  }, [step]);

  useAutoplay(n > 1 && !paused && visible && onScreen, intervalMs, advance);

  const scrollByStep = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * step(), behavior: "smooth" });
  };

  const scrollTo = (i: number) => {
    ref.current?.scrollTo({ left: i * step(), behavior: "smooth" });
  };

  if (n === 0) return null;

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      {...handlers}
      onPointerDown={() => setTouching(true)}
      onPointerUp={() => setTouching(false)}
      // A horizontal touch drag makes the browser fire pointercancel, not
      // pointerup. Without these the row stays paused after every swipe.
      onPointerCancel={() => setTouching(false)}
    >
      <div
        ref={ref}
        onScroll={() => {
          const el = ref.current;
          const s = step();
          if (el && s > 0) setActive(Math.min(n - 1, Math.max(0, Math.round(el.scrollLeft / s))));
        }}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <div key={keyOf(item, i)} className={cn("snap-start", itemClassName)}>
            {renderItem(item, i)}
          </div>
        ))}
      </div>
      {n > 1 && (
        <SlideControls
          tone="plain"
          count={n}
          active={active}
          onPrev={() => scrollByStep(-1)}
          onNext={() => scrollByStep(1)}
          onSelect={scrollTo}
        />
      )}
    </div>
  );
}
