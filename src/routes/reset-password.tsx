import { translations } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/useLanguage";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: translations.en.rp_meta_title },
      { name: "description", content: translations.en.rp_meta_desc },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Recovery links arrive with type=recovery in the URL hash.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("type") === "recovery") setReady(true);

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    const timer = setTimeout(() => setInvalid((prev) => !prev && !ready), 4000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(t("rp_err_min"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("rp_err_match"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("rp_updated"));
      await navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("rp_err_failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-ligo flex justify-center py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-pop">
        <h1 className="font-display text-2xl font-extrabold">{t("rp_title")}</h1>
        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {invalid ? t("rp_invalid") : t("rp_verifying")}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="np">{t("rp_new_password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="np"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp">{t("rp_confirm_password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="cp"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="pl-9"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? t("rp_updating") : t("rp_update")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
