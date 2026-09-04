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

export type PortalKind = "customer" | "merchant" | "rider" | "admin";

type PortalCopy = { title: string; subtitle: string; role: Role | null };

const COPY: Record<PortalKind, PortalCopy> = {
  customer: {
    title: "Welcome back",
    subtitle: "Sign in to order food & groceries",
    role: "customer",
  },
  merchant: {
    title: "Store Partner portal",
    subtitle: "Sign in to manage your shop, orders and menu",
    role: "merchant",
  },
  rider: {
    title: "Driver portal",
    subtitle: "Sign in to go online and deliver with Ligo",
    role: "rider",
  },
  admin: {
    title: "Administrative sign-in",
    subtitle: "Restricted to Ligo operations staff",
    role: "admin",
  },
};

function PortalShell({ kind, children }: { kind: PortalKind; children: ReactNode }) {
  const copy = COPY[kind];
  return (
    <div className="container-ligo flex justify-center py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-pop">
        <h1 className="font-display text-2xl font-extrabold">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("invalid credentials"))
    return "Wrong email or password.";
  if (lower.includes("rate limit") || lower.includes("too many requests"))
    return "Too many attempts — please wait a minute and try again.";
  if (lower.includes("email not confirmed"))
    return "Please confirm your email first, then sign in.";
  return msg || "Could not sign in";
}

export function AuthPortal({ kind }: { kind: PortalKind }) {
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
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
      toast.error("Enter your email and password");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) throw error;
      toast.success("Signed in");
      // The useEffect above navigates to the correct portal once the session lands.
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const showRegister = kind !== "admin";

  return (
    <PortalShell kind={kind}>
      <form onSubmit={signIn} className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
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
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={async () => {
                if (!trimmedEmail.includes("@")) {
                  toast.error("Enter your email first, then tap forgot password");
                  return;
                }
                const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) toast.error(friendlyError(error));
                else toast.success("Password reset link sent — check your email");
              }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Forgot password?
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
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {showRegister && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {kind === "customer" ? "New to Ligo? " : kind === "merchant" ? "New store? " : "New driver? "}
          {kind === "rider" ? (
            <Link to="/rider/join" className="font-semibold text-primary">
              Apply to become a rider
            </Link>
          ) : (
            <Link to="/register" className="font-semibold text-primary">
              Create an account
            </Link>
          )}
        </p>
      )}
    </PortalShell>
  );
}
