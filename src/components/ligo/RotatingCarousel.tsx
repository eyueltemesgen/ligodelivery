import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
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
 * Everything that should stop a carousel from advancing: hover (mouse only),
 * keyboard focus inside it, a touch drag in progress, or an explicit
 * play/pause toggle. Touch devices synthesise mouseenter/mouseleave around
 * taps, so hover is filtered to real pointer devices — otherwise a stray
 * mouseenter with no matching mouseleave latches `paused` true forever.
 */
function usePauseControl() {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [manual, setManual] = useState(false);

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

  return {
    paused: hovered || focused || touching || manual,
    manual,
    toggleManual: () => setManual((v) => !v),
    setTouching,
    handlers,
  };
}

type SlideControlsProps = {
  count: number;
  active: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
  /** Seconds the active slide has been showing; drives the dot progress ring. */
  intervalMs?: number;
  progress?: boolean;
  paused?: boolean;
  onTogglePlay?: () => void;
  tone?: "overlay" | "plain";
};

function SlideControls({
  count,
  active,
  onPrev,
  onNext,
  onSelect,
  intervalMs = 5000,
  progress = false,
  paused = false,
  onTogglePlay,
  tone = "overlay",
}: SlideControlsProps) {
  const { t } = useLanguage();
  const overlay = tone === "overlay";
  const arrow = overlay
    ? "absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow backdrop-blur transition hover:bg-background sm:flex"
    : "hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-card transition hover:bg-muted sm:flex";
  return (
    <>
      <button
        type="button"
        aria-label={t("ui_previous_slide")}
        onClick={onPrev}
        className={cn(arrow, overlay ? "left-2" : "-left-3")}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label={t("ui_next_slide")}
        onClick={onNext}
        className={cn(arrow, overlay ? "right-2" : "-right-3")}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <div
        className={cn(
          "z-10 flex items-center justify-center gap-1.5",
          overlay && "absolute bottom-3 left-1/2 -translate-x-1/2",
        )}
      >
        {onTogglePlay && count > 1 && (
          <button
            type="button"
            aria-label={paused ? t("carousel_play") : t("carousel_pause")}
            aria-pressed={paused}
            onClick={onTogglePlay}
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full transition",
              overlay
                ? "bg-background/80 text-foreground backdrop-blur hover:bg-background"
                : "border border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </button>
        )}
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={t("carousel_show", { n: i + 1 })}
            aria-current={i === active}
            onClick={() => onSelect(i)}
            className={cn(
              "relative h-2 overflow-hidden rounded-full transition-all",
              i === active
                ? "w-5 bg-primary/35"
                : cn("w-2", overlay ? "bg-background/80" : "bg-border"),
            )}
          >
            {progress && i === active && !paused && (
              <span
                key={`${active}-${intervalMs}`}
                className="absolute inset-0 origin-left rounded-full bg-primary motion-reduce:hidden"
                style={{ animation: `carousel-progress ${intervalMs}ms linear forwards` }}
              />
            )}
            {i === active && paused && (
              <span className="absolute inset-0 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </>
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
}: {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
  intervalMs?: number;
  controls?: boolean;
}) {
  const slides = Children.toArray(children);
  const n = slides.length;
  const [index, setIndex] = useState(0);
  const { paused, manual, toggleManual, setTouching, handlers } = usePauseControl();
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
          "flex transition-transform duration-500 ease-out",
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
          intervalMs={intervalMs}
          progress
          paused={paused}
          onTogglePlay={toggleManual}
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
  const { paused, manual, toggleManual, setTouching, handlers } = usePauseControl();
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
          intervalMs={intervalMs}
          progress
          paused={paused}
          onTogglePlay={toggleManual}
        />
      )}
    </div>
  );
}
