import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Download, Smartphone, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";
import { RiderGate } from "@/components/auth/guards";
import { isNativeApp } from "@/lib/native";
import { Button } from "@/components/ui/button";

/** Bucket that hosts the APK, if it is ever moved to a project we control. */
const APK_BUCKET = "ligo-apps";
/** Private bucket: the signed URL is short-lived, so it is minted per click. */
const APK_TTL_SECONDS = 600;

/**
 * Public fallback release, used until an admin writes `settings.rider_app`.
 *
 * This is a public GitHub release asset, so baking it in exposes nothing, and
 * it keeps the download working on a deployment whose `settings` row has not
 * been created yet — the same reasoning as the public Supabase coordinates in
 * `public-env.ts`. An admin-authored row overrides it field by field.
 */
const DEFAULT_RELEASE = {
  version: "1.1",
  version_code: 2,
  apk_url:
    "https://github.com/eyueltemesgen/ligodelivery/releases/download/rider-v1.1/yene-go-rider-1.1.apk",
} satisfies Release;

type Release = {
  /** Direct public URL (bucket on the user-owned project). Preferred. */
  apk_url?: string;
  /** Storage path, signed on demand. Only usable when the bucket lives on the
   *  same Supabase project the client is configured against. */
  apk_path?: string;
  version?: string;
  version_code?: number;
};

export const Route = createFileRoute("/rider/download")({
  head: () => ({
    meta: [
      { title: translations.en.rd_app_meta_title },
      { name: "description", content: translations.en.rd_app_meta_desc },
      { property: "og:title", content: translations.en.rd_app_meta_title },
      { property: "og:description", content: translations.en.rd_app_meta_desc },
    ],
  }),
  component: () => (
    <RiderGate>
      <RiderDownload />
    </RiderGate>
  ),
});

function RiderDownload() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: release, isLoading } = useQuery({
    queryKey: ["rider-app-release"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "rider_app")
        .maybeSingle();
      const value = (data?.value ?? null) as Release | null;
      return { ...DEFAULT_RELEASE, ...(value ?? {}) };
    },
  });

  const download = async () => {
    if (release?.apk_url) {
      window.location.href = release.apk_url;
      return;
    }
    const path = release?.apk_path;
    if (!path) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: signErr } = await supabase.storage
        .from(APK_BUCKET)
        .createSignedUrl(path, APK_TTL_SECONDS);
      if (signErr || !data?.signedUrl) throw signErr ?? new Error("no url");
      window.location.href = data.signedUrl;
    } catch {
      setError(t("rd_app_unavailable"));
    } finally {
      setBusy(false);
    }
  };

  const version = release?.version;

  return (
    <div className="container-ligo max-w-2xl py-8 sm:py-12">
      <header className="text-center">
        <Smartphone className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-extrabold break-words sm:text-3xl">
          {t("rd_app_heading")}
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{t("rd_app_intro")}</p>
      </header>

      <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
        {isNativeApp() ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-3 font-display text-xl font-bold">{t("rd_app_installed_title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("rd_app_installed_body")}</p>
            <Button asChild className="mt-5">
              <Link to="/rider">{t("rd_app_heading")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <h2 className="font-display text-lg font-bold">{t("rd_app_download")}</h2>
                {version && (
                  <p className="text-sm text-muted-foreground">
                    {t("rd_app_version", { version })}
                  </p>
                )}
              </div>
              <Button onClick={() => void download()} disabled={busy || isLoading || !version}>
                <Download className="mr-2 h-4 w-4" />
                {busy ? t("rd_app_downloading") : t("rd_app_download")}
              </Button>
            </div>

            {(error || (!isLoading && !version)) && (
              <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error ?? t("rd_app_unavailable")}
              </p>
            )}
          </>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
        <h2 className="font-display text-lg font-bold">{t("rd_app_steps_title")}</h2>
        <ol className="mt-4 space-y-3 text-sm">
          {(["rd_app_step1", "rd_app_step2", "rd_app_step3", "rd_app_step4"] as const).map(
            (key, i) => (
              <li key={key} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-accent-foreground">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{t(key)}</span>
              </li>
            ),
          )}
        </ol>
      </section>

      <section className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="font-display text-base font-bold">{t("rd_app_warning_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("rd_app_warning_body")}</p>
          </div>
        </div>
      </section>

      <p className="mt-6 text-center text-sm">
        <Link to="/account/help" className="text-primary underline-offset-4 hover:underline">
          {t("rd_app_help")}
        </Link>
      </p>

      {user && <span className="sr-only">{user.id}</span>}
    </div>
  );
}
