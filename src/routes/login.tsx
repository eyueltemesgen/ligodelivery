import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { portalPathFor } from "@/components/auth/guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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
        content: "Sign in to Ligo Delivery to order, ride or manage your shop in Bishoftu.",
      },
      { property: "og:title", content: "Sign in — Ligo Delivery" },
      { property: "og:description", content: "Access your Ligo Delivery account." },
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
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Route signed-in users straight to the portal for their verified role
  useEffect(() => {
    if (user && !loading) void navigate({ to: portalPathFor(roles) });
  }, [user, loading, roles, navigate]);

  useEffect(() => {
    setOtpSent(false);
    setOtp("");
  }, [channel]);

  const identifier = channel === "email" ? email : phone;
  const canSendOtp = channel === "email" ? !!email.trim() : !!phone.trim();

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } =
        channel === "email"
          ? await supabase.auth.signInWithOtp({ email })
          : await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      toast.success(`Verification code sent to your ${channel}.`);
      setOtpSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      const { error } =
        channel === "email"
          ? await supabase.auth.verifyOtp({ email, token: otp, type: "email" })
          : await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
      if (error) throw error;
      toast.success("Signed in");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Signed in");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-ligo flex justify-center py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-pop">
        <h1 className="font-display text-2xl font-extrabold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ligo Delivery · Bishoftu</p>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
          {(["email", "phone"] as Channel[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={`rounded-md py-1.5 font-medium capitalize transition-colors ${channel === c ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>

        {channel === "email" ? (
          <div className="mt-4 space-y-1.5">
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
          <div className="mt-4 space-y-1.5">
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

        {!otpSent ? (
          <>
            <Button
              type="button"
              className="mt-5 w-full"
              disabled={busy || !canSendOtp}
              onClick={sendOtp}
            >
              {busy ? "Please wait…" : `Send ${channel === "email" ? "email" : "SMS"} code`}
            </Button>

            {channel === "email" && (
              <>
                <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> or sign in with password{" "}
                  <span className="h-px flex-1 bg-border" />
                </div>
                <form onSubmit={signInWithPassword} className="space-y-3">
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
                  <Button type="submit" variant="outline" className="w-full" disabled={busy}>
                    {busy ? "Please wait…" : "Sign in with password"}
                  </Button>
                </form>
              </>
            )}
          </>
        ) : (
          <form onSubmit={verifyOtp} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="otp">Enter verification code</Label>
              <p className="text-xs text-muted-foreground">
                We sent a 6-digit code to {identifier}.
              </p>
              <InputOTP maxLength={6} value={otp} onChange={(v) => setOtp(v)}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button type="submit" className="w-full" disabled={busy || otp.length < 6}>
              {busy ? "Verifying…" : "Sign in"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
              }}
            >
              Use a different {channel}
            </button>
          </form>
        )}

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
