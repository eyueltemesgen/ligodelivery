import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import {
  dismissInstall,
  isInstallDismissed,
  isIos,
  isStandalone,
  watchInstallPrompt,
  type InstallPromptEvent,
} from "@/lib/pwa";

/**
 * Offers to install the app. Chrome/Android gives a real install event; iOS has
 * none, so there we show the Share → Add to Home Screen instructions instead.
 * Hidden once installed, dismissed, or when the browser has nothing to offer.
 */
export function InstallPrompt() {
  const { t } = useLanguage();
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (isStandalone() || isInstallDismissed()) return;
    if (isIos()) {
      setShowIos(true);
      return;
    }
    return watchInstallPrompt(setDeferred);
  }, []);

  const dismiss = () => {
    dismissInstall();
    setClosed(true);
  };

  if (closed) return null;
  if (!deferred && !showIos) return null;

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // Either answer is final; don't nag again this session.
    if (outcome === "accepted") {
      setDeferred(null);
      dismiss();
    } else {
      dismiss();
    }
  };

  return (
    <div
      role="dialog"
      aria-label={t("pwa_install_title")}
      className="pointer-events-auto fixed inset-x-3 bottom-36 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-pop lg:bottom-4 lg:left-4 lg:right-auto lg:mx-0"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"
      >
        {showIos ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t("pwa_install_title")}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {showIos ? t("pwa_install_ios") : t("pwa_install_body")}
        </p>
        {!showIos && (
          <Button size="sm" className="mt-2 min-h-9" onClick={() => void install()}>
            {t("pwa_install_cta")}
          </Button>
        )}
      </div>

      <button
        type="button"
        aria-label={t("pwa_install_dismiss")}
        className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
        onClick={dismiss}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
