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
import { useI18n } from "@/lib/i18n";

export type PortalKind = "customer" | "merchant" | "rider" | "admin";

type PortalCopy = { titleKey: string; subtitleKey: string; role: Role | null };

const COPY: Record<PortalKind, PortalCopy> = {
  customer: {
    titleKey: "auth.welcomeBack",
    subtitleKey: "auth.customerSubtitle",
    role: "customer",
  },
  merchant: {
    titleKey: "auth.merchantTitle",
    subtitleKey: "auth.merchantSubtitle",
    role: "merchant",
  },
  rider: {
    titleKey: "auth.riderTitle",
    subtitleKey: "auth.riderSubtitle",
    role: "rider",
  },
  admin: {
    titleKey: "auth.adminTitle",
    subtitleKey: "auth.adminSubtitle",
    role: "admin",
  },
};

function PortalShell({ kind, children }: { kind: PortalKind; children: ReactNode }) {
  const copy = COPY[kind];
  const { t } = useI18n();
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

function friendlyErrorKey(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : "";
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("invalid credentials"))
    return "auth.wrongCredentials";
  if (lower.includes("rate limit") || lower.includes("too many requests"))
    return "auth.tooManyAttempts";
  if (lower.includes("email not confirmed")) return "auth.confirmEmailFirst";
  return null;
}

export function AuthPortal({ kind }: { kind: PortalKind }) {
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
  const { t } = useI18n();
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
      toast.error(t("auth.enterEmailPassword"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) throw error;
      toast.success(t("auth.signedIn"));
      // The useEffect above navigates to the correct portal once the session lands.
    } catch (err) {
      const key = friendlyErrorKey(err);
      toast.error(key ? t(key) : err instanceof Error ? err.message : t("auth.couldNotSignIn"));
    } finally {
      setBusy(false);
    }
  };

  const showRegister = kind !== "admin";

  return (
    <PortalShell kind={kind}>
      <form onSubmit={signIn} className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("auth.email")}</Label>
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
            <Label htmlFor="password">{t("auth.password")}</Label>
            <button
              type="button"
              onClick={async () => {
                if (!trimmedEmail.includes("@")) {
                  toast.error(t("auth.enterEmailFirst"));
                  return;
                }
                const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) {
                  const key = friendlyErrorKey(error);
                  toast.error(
                    key ? t(key) : error instanceof Error ? error.message : t("auth.couldNotSignIn"),
                  );
                } else toast.success(t("auth.resetLinkSent"));
              }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("auth.forgotPassword")}
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
          {busy ? t("auth.signingIn") : t("action.signIn")}
        </Button>
      </form>

      {showRegister && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {kind === "customer"
            ? t("auth.newToBrand")
            : kind === "merchant"
              ? t("auth.newStore")
              : t("auth.newDriver")}
          {kind === "rider" ? (
            <Link to="/rider/join" className="font-semibold text-primary">
              {t("auth.applyRider")}
            </Link>
          ) : (
            <Link to="/register" className="font-semibold text-primary">
              {t("auth.createAccountLink")}
            </Link>
          )}
        </p>
      )}
    </PortalShell>
  );
}
