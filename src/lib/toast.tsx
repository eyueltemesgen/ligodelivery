/**
 * Lazily-loaded toast layer.
 *
 * `sonner` is ~14 kB gzipped, and importing `Toaster` in the root shell used to
 * put it in the initial bundle of every route (homepage, login, checkout, the
 * whole account area) even though most visitors never trigger a toast. Here the
 * library — and its styled `<Toaster>` host — are pulled in on the first toast
 * call via a dynamic import, then cached. Toasts are fire-and-forget, so the
 * extra tick before one appears is invisible.
 */
import { useEffect, useState, type ComponentType } from "react";

type ToastOptions = Record<string, unknown>;
type ToastMethod = (message: string, options?: ToastOptions) => void;
type SonnerModule = typeof import("sonner");
type ToasterComponent = ComponentType<Record<string, unknown>>;

let sonner: SonnerModule["toast"] | null = null;
let loading: Promise<SonnerModule["toast"]> | null = null;

/** Host components waiting for sonner so they can mount `<Toaster>`. */
const hosts = new Set<() => void>();

function load() {
  if (!loading) {
    loading = import("sonner").then((m) => {
      sonner = m.toast;
      for (const notify of hosts) notify();
      return m.toast;
    });
  }
  return loading;
}

function emit(method: keyof SonnerModule["toast"], message: string, options?: ToastOptions) {
  void load()
    .then((api) => (api[method] as unknown as ToastMethod)(message, options))
    .catch(() => {
      /* a failed toast must never break the action that triggered it */
    });
}

export const toast = {
  success: (message: string, options?: ToastOptions) => emit("success", message, options),
  error: (message: string, options?: ToastOptions) => emit("error", message, options),
  info: (message: string, options?: ToastOptions) => emit("info", message, options),
  message: (message: string, options?: ToastOptions) => emit("message", message, options),
};

/**
 * Mounts the styled sonner `<Toaster>` once the library has loaded. The root
 * shell renders this unconditionally; it stays inert (renders nothing) until
 * something calls `toast.*`, so no toast code ships in the initial bundle.
 */
export function ToastHost(props: Record<string, unknown>) {
  const [Toaster, setToaster] = useState<ToasterComponent | null>(null);

  useEffect(() => {
    let active = true;
    const show = () => {
      void import("@/components/ui/sonner").then(
        (m) => active && setToaster(() => m.Toaster as unknown as ToasterComponent),
      );
    };
    hosts.add(show);
    if (sonner) show();
    return () => {
      active = false;
      hosts.delete(show);
    };
  }, []);

  if (!Toaster) return null;
  return <Toaster {...props} />;
}
