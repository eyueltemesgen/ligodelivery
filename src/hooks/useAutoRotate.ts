import { useEffect, useRef, useState } from "react";

/**
 * Shared auto-rotate engine for banner carousels. Owns the active index, the
 * autoplay interval, the pause-on-hover/focus behaviour and the touch-swipe
 * handling, so the home hero banner and the Special Moments category banner
 * rotate through exactly the same system.
 *
 * Autoplay always runs (reduced motion only drops the animation at the call
 * site); the engine never gates the *advance* on a motion preference.
 */
export function useAutoRotate({
  count,
  intervalMs,
  resumeMs = 8000,
}: {
  count: number;
  intervalMs: number;
  /** How long to hold after a manual swipe/tap before autoplay resumes. */
  resumeMs?: number;
}) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [manualUntil, setManualUntil] = useState(0);
  const touchX = useRef<number | null>(null);
  const n = count;
  const idx = n > 0 ? i % n : 0;
  const many = n > 1;

  // Restart from the first slide whenever the slide set changes.
  useEffect(() => setI(0), [n]);

  useEffect(() => {
    if (!many || paused) return;
    const id = setInterval(() => setI((v) => v + 1), intervalMs);
    return () => clearInterval(id);
  }, [many, paused, intervalMs]);

  // Hold briefly after the visitor drives the carousel themselves.
  useEffect(() => {
    if (!manualUntil) return;
    const id = setTimeout(() => setManualUntil(0), Math.max(0, manualUntil - Date.now()));
    return () => clearTimeout(id);
  }, [manualUntil]);

  const goTo = (next: number) => {
    setI(next);
    setManualUntil(Date.now() + resumeMs);
  };
  const go = (delta: number) => goTo(i + delta);

  return {
    idx,
    many,
    goTo,
    /** Pause on real pointer hover only — touch taps synthesise mouse events. */
    onPointerEnter: (e: { pointerType?: string }) => {
      if (e.pointerType === "mouse") setPaused(true);
    },
    onPointerLeave: (e: { pointerType?: string }) => {
      if (e.pointerType === "mouse") setPaused(false);
    },
    onFocusCapture: () => setPaused(true),
    onBlurCapture: () => setPaused(false),
    onTouchStart: (e: { touches: ArrayLike<{ clientX: number }> }) => {
      touchX.current = e.touches[0]?.clientX ?? null;
    },
    onTouchEnd: (e: { changedTouches: ArrayLike<{ clientX: number }> }) => {
      const start = touchX.current;
      const end = e.changedTouches[0]?.clientX;
      if (start != null && end != null && Math.abs(end - start) > 40) go(end < start ? 1 : -1);
      touchX.current = null;
    },
  };
}
