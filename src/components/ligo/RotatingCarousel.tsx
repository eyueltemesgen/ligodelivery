import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

/** Honor the user's reduced-motion preference: no autoplay, no smooth scrolling. */
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

function useAutoplay(active: boolean, intervalMs: number, advance: () => void) {
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (!active || reduced) return;
    const timer = setInterval(advance, intervalMs);
    return () => clearInterval(timer);
  }, [active, reduced, intervalMs, advance]);
}

type SlideControlsProps = {
  count: number;
  active: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
  tone?: "overlay" | "plain";
};

function SlideControls({
  count,
  active,
  onPrev,
  onNext,
  onSelect,
  tone = "overlay",
}: SlideControlsProps) {
  const { t } = useLanguage();
  const overlay = tone === "overlay";
  const arrow = overlay
    ? "absolute top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow sm:flex"
    : "hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-card sm:flex";
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
          "flex justify-center gap-1.5",
          overlay && "absolute bottom-2 left-1/2 -translate-x-1/2",
        )}
      >
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={t("carousel_show", { n: i + 1 })}
            aria-current={i === active}
            onClick={() => onSelect(i)}
            className={cn(
              "h-2 rounded-full transition-all",
              i === active
                ? "w-5 bg-primary"
                : cn("w-2", overlay ? "bg-background/80" : "bg-border"),
            )}
          />
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
  intervalMs = 6000,
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
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const idx = n > 0 ? ((index % n) + n) % n : 0;

  useEffect(() => setIndex(0), [n]);

  useAutoplay(n > 1 && !paused, intervalMs, () => setIndex((v) => (v + 1) % n));

  if (n === 0) return null;
  if (n === 1) return <div className={className}>{slides[0]}</div>;

  const go = (delta: number) => setIndex((v) => (((v + delta) % n) + n) % n);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
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
        className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
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
  intervalMs = 5500,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyOf: (item: T, index: number) => string | number;
  ariaLabel: string;
  className?: string;
  itemClassName?: string;
  intervalMs?: number;
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(0);
  const n = items.length;

  const step = () => {
    const el = ref.current;
    if (!el) return 0;
    const first = el.firstElementChild as HTMLElement | null;
    return (first?.offsetWidth ?? el.clientWidth) + GAP_PX;
  };

  const advance = () => {
    const el = ref.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step(), behavior: "smooth" });
  };

  useAutoplay(n > 1 && !paused, intervalMs, advance);

  const scrollByStep = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * step(), behavior: "smooth" });
  };

  const scrollTo = (i: number) => {
    ref.current?.scrollTo({ left: i * step(), behavior: "smooth" });
  };

  if (n === 0) return null;

  return (
    <div
      className={cn("relative", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
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
