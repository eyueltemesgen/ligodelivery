import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Role } from "@/hooks/useAuth";
import { portalPathFor } from "@/components/auth/guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/useLanguage";
import type { TranslationKey } from "@/lib/i18n";

export type PortalKind = "customer" | "merchant" | "rider" | "admin";

type PortalCopy = { titleKey: TranslationKey; subtitleKey: TranslationKey; role: Role | null };

const COPY: Record<PortalKind, PortalCopy> = {
  customer: {
    titleKey: "auth_welcome",
    subtitleKey: "auth_customer_sub",
    role: "customer",
  },
  merchant: {
    titleKey: "auth_merchant_title",
    subtitleKey: "auth_merchant_sub",
    role: "merchant",
  },
  rider: {
    titleKey: "auth_rider_title",
    subtitleKey: "auth_rider_sub",
    role: "rider",
  },
  admin: {
    titleKey: "auth_admin_title",
    subtitleKey: "auth_admin_sub",
    role: "admin",
  },
};

function PortalShell({ kind, children }: { kind: PortalKind; children: ReactNode }) {
  const copy = COPY[kind];
  const { t } = useLanguage();
  return (
    <div className="container-ligo flex justify-center py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-pop">
        <h1 className="font-display text-2xl font-extrabold">{t(copy.titleKey)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t(copy.subtitleKey)}</p>
        {children}
      </div>
    </div>
  );
}

function friendlyErrorKey(err: unknown): TranslationKey {
  const msg = err instanceof Error ? err.message : "";
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("invalid credentials"))
    return "auth_err_invalid";
  if (lower.includes("rate limit") || lower.includes("too many requests")) return "auth_err_rate";
  if (lower.includes("email not confirmed")) return "auth_err_unconfirmed";
  return "auth_err_generic";
}

export function AuthPortal({ kind }: { kind: PortalKind }) {
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Once authenticated, push users straight to their role home without a refresh.
  useEffect(() => {
    if (!loading && user) void navigate({ to: portalPathFor(roles) });
  }, [user, roles, loading, navigate]);

  const trimmedEmail = email.trim();
  const valid = trimmedEmail.includes("@") && password.length >= 6;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      toast.error(t("auth_enter_creds"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) throw error;
      toast.success(t("auth_signed_in"));
      // The useEffect above navigates to the correct portal once the session lands.
    } catch (err) {
      toast.error(t(friendlyErrorKey(err)));
    } finally {
      setBusy(false);
    }
  };

  const showRegister = kind !== "admin";

  return (
    <PortalShell kind={kind}>
      <form onSubmit={signIn} className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("auth_email")}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("auth_password")}</Label>
            <button
              type="button"
              onClick={async () => {
                if (!trimmedEmail.includes("@")) {
                  toast.error(t("auth_forgot_first"));
                  return;
                }
                const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) toast.error(t(friendlyErrorKey(error)));
                else toast.success(t("auth_reset_sent"));
              }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("auth_forgot")}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="pl-9"
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={busy || !valid}>
          {busy ? t("auth_signing_in") : t("auth_sign_in")}
        </Button>
      </form>

      {showRegister && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {kind === "customer"
            ? t("auth_new_customer")
            : kind === "merchant"
              ? t("auth_new_store")
              : t("auth_new_driver")}{" "}
          {kind === "rider" ? (
            <Link to="/rider/join" className="font-semibold text-primary">
              {t("auth_apply_rider")}
            </Link>
          ) : (
            <Link to="/register" className="font-semibold text-primary">
              {t("auth_create_account")}
            </Link>
          )}
        </p>
      )}
    </PortalShell>
  );
}
