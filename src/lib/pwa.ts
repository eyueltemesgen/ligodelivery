/**
 * PWA wiring: service-worker registration and the "add to home screen" prompt.
 *
 * The manifest alone does not make a site installable — Chrome/Android needs a
 * registered service worker with a fetch handler, and iOS needs the user to go
 * through Share → Add to Home Screen by hand. Without this file "Add to Home
 * Screen" produced a browser-chrome shortcut rather than an app.
 */

/** Set when the browser offers an install; cleared once the user answers. */
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "yene.install.dismissed";

/** Registers the worker. Safe to call on every load; the browser de-duplicates. */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  // Dev serves unbundled modules that change on every save, so a caching worker
  // there only causes stale-module confusion. Preview and production are built.
  if (!import.meta.env.PROD) return;

  // The `load` event may already have fired: the root component hydrates after
  // it on a server-rendered page, so a bare listener would never run and the
  // site would silently stay uninstallable. Check readyState first.
  const register = () =>
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("[pwa] service worker registration failed", err);
    });

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}

/** True when the site is already running as an installed app. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

/** iOS has no install event, so the prompt has to be explained instead. */
export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac, distinguished by touch support.
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

export function isInstallDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstall(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* storage unavailable: the prompt simply reappears next visit */
  }
}

/**
 * Watches for the browser's install offer. Returns the event once it arrives so
 * the caller can decide when to surface it; browsers only fire this after the
 * app meets the installability criteria.
 */
export function watchInstallPrompt(onAvailable: (e: InstallPromptEvent) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (e: Event) => {
    // Suppress the mini-infobar so the in-app card is the only prompt.
    e.preventDefault();
    onAvailable(e as InstallPromptEvent);
  };
  window.addEventListener("beforeinstallprompt", handler);
  return () => window.removeEventListener("beforeinstallprompt", handler);
}
