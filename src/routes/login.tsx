import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { portalPathFor } from "@/components/auth/guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Channel = "email" | "phone";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => {
    const out: { redirect?: string } = {};
    if (typeof s["redirect"] === "string") out.redirect = s["redirect"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Sign in — Ligo Delivery" },
      {
        name: "description",
        content: "Sign in to your Ligo Delivery customer account to order in Bishoftu.",
      },
      { property: "og:title", content: "Sign in — Ligo Delivery" },
      { property: "og:description", content: "Access your Ligo Delivery customer account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
  const [channel, setChannel] = useState<Channel>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [staffNotice, setStaffNotice] = useState<string | null>(null);

  // Customer login only: staff accounts get pointed at their dedicated
  // portals instead of landing on the customer storefront.
  useEffect(() => {
    if (!user || loading) return;
    if (roles.includes("admin")) setStaffNotice("admin");
    else if (roles.includes("rider")) setStaffNotice("rider");
    else if (roles.includes("merchant")) setStaffNotice("merchant");
    else void navigate({ to: "/" });
  }, [user, loading, roles, navigate]);

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

  if (staffNotice) {
    const portal = portalPathFor(roles);
    const label =
      staffNotice === "admin"
        ? "the Admin dashboard"
        : staffNotice === "rider"
          ? "the Rider portal"
          : "the Merchant portal";
    return (
      <div className="container-ligo flex justify-center py-12">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-pop">
          <h1 className="font-display text-2xl font-extrabold">This is a staff account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Customer sign-in is only for customer accounts. Continue to {label} instead.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={() => void navigate({ to: portal })}>Go to {label}</Button>
            <Button
              variant="outline"
              onClick={() => {
                setStaffNotice(null);
                void supabase.auth.signOut();
              }}
            >
              Sign in with a different account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-ligo flex justify-center py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-pop">
        <h1 className="font-display text-2xl font-extrabold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Customer sign-in · Bishoftu</p>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
          {(["email", "phone"] as Channel[]).map((c) => (
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
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !canSubmit}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          New to Ligo?{" "}
          <Link to="/register" className="font-semibold text-primary">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
