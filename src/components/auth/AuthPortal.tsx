import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Role } from "@/hooks/useAuth";
import { portalPathFor } from "@/components/auth/guards";
import { GoogleAuthButton, SocialDivider } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PortalKind = "customer" | "merchant" | "rider" | "admin";

type PortalCopy = { title: string; subtitle: string; role: Role };

const COPY: Record<PortalKind, PortalCopy | { title: string; subtitle: string; role: null }> = {
  customer: {
    title: "Welcome back",
    subtitle: "Customer sign-in · order food & groceries",
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

const HOME: Record<PortalKind, string> = {
  customer: "/",
  merchant: "/merchant",
  rider: "/rider",
  admin: "/admin",
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

export function AuthPortal({ kind }: { kind: PortalKind }) {
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
  const [channel, setChannel] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Once authenticated, push users straight to their role home without a refresh.
  useEffect(() => {
    if (!loading && user) void navigate({ to: portalPathFor(roles) });
  }, [user, roles, loading, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } =
        channel === "email"
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signInWithPassword({ phone: phone.trim(), password });
      if (error) throw error;
      toast.success("Signed in");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    password.length >= 6 &&
    (channel === "email" ? email.trim().includes("@") : phone.trim().length >= 9);

  const showRegister = kind !== "admin";

  return (
    <PortalShell kind={kind}>
      <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
        {(["email", "phone"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setChannel(c)}
            className={`rounded-md py-1.5 font-medium capitalize transition-colors ${
              channel === c ? "bg-background text-foreground shadow" : "text-muted-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <form onSubmit={signIn} className="mt-4 space-y-4">
        {channel === "email" ? (
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2519…"
              required
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy || !canSubmit}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <SocialDivider />
      <GoogleAuthButton />

      {showRegister && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {kind === "customer"
            ? "New to Ligo? "
            : kind === "merchant"
              ? "New store? "
              : "New driver? "}
          {kind === "rider" ? (
            <Link to="/rider/join" className="font-semibold text-primary">
              Apply to become a rider
            </Link>
          ) : kind === "merchant" ? (
            <Link to="/register" className="font-semibold text-primary">
              Register your store
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
