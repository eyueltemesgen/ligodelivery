import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s["mode"] === "register" ? ("register" as const) : ("login" as const),
    role: s["role"] === "rider" ? ("rider" as const) : ("customer" as const),
  }),
  head: () => ({
    meta: [
      { title: "Sign in or create an account — Ligo Delivery" },
      { name: "description", content: "Log in to Ligo or create a customer or rider account to order and deliver in Bishoftu." },
      { property: "og:title", content: "Sign in — Ligo Delivery" },
      { property: "og:description", content: "Access your Ligo Delivery account." },
    ],
  }),
  component: AuthPage,
});

type Channel = "email" | "phone";

function AuthPage() {
  const { mode, role } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [channel, setChannel] = useState<Channel>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/account" });
  }, [user, navigate]);

  useEffect(() => {
    setOtpSent(false);
    setOtp("");
  }, [channel, mode]);

  const identifier = channel === "email" ? email : phone;
  const canSendOtp = channel === "email" ? !!email.trim() : !!phone.trim();

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (channel === "email") {
        if (mode === "register") {
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: fullName, phone, role } },
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.signInWithOtp({ email });
          if (error) throw error;
        }
        toast.success("Verification code sent to your email.");
      } else {
        if (mode === "register") {
          const { error } = await supabase.auth.signInWithOtp({
            phone,
            options: { data: { full_name: fullName, phone, role } },
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.signInWithOtp({ phone });
          if (error) throw error;
        }
        toast.success("Verification code sent to your phone.");
      }
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
      if (channel === "email") {
        const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
        if (error) throw error;
      }
      toast.success(mode === "register" ? "Account created. Welcome to Ligo!" : "Signed in");
      await navigate({ to: "/account" });
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
      await navigate({ to: "/account" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "register" ? (role === "rider" ? "Join as a rider" : "Create your account") : "Welcome back";

  return (
    <div className="container-ligo flex justify-center py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-pop">
        <h1 className="font-display text-2xl font-extrabold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ligo Delivery · Bishoftu</p>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
          <button
            type="button"
            onClick={() => setChannel("email")}
            className={`rounded-md py-1.5 font-medium transition-colors ${channel === "email" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setChannel("phone")}
            className={`rounded-md py-1.5 font-medium transition-colors ${channel === "phone" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            Phone
          </button>
        </div>

        {mode === "register" && (
          <div className="mt-5 space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
        )}

        {mode === "register" && channel === "phone" && (
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="reg-phone">Phone number</Label>
            <Input id="reg-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2519…" required />
          </div>
        )}

        {channel === "email" && (
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        )}

        {channel === "phone" && mode === "login" && (
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2519…" required />
          </div>
        )}

        {!otpSent ? (
          <>
            <Button
              type="button"
              className="mt-5 w-full"
              disabled={busy || !canSendOtp || (mode === "register" && !fullName.trim())}
              onClick={sendOtp}
            >
              {busy ? "Please wait…" : `Send ${channel === "email" ? "email" : "SMS"} code`}
            </Button>

            {channel === "email" && mode === "login" && (
              <>
                <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> or sign in with password <span className="h-px flex-1 bg-border" />
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
              <p className="text-xs text-muted-foreground">We sent a 6-digit code to {identifier}.</p>
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
              {busy ? "Verifying…" : mode === "register" ? "Create account" : "Sign in"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { setOtpSent(false); setOtp(""); }}
            >
              Use a different {channel}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "register" ? (
            <>Already have an account? <Link to="/auth" search={{ mode: "login", role: "customer" }} className="font-semibold text-primary">Sign in</Link></>
          ) : (
            <>New to Ligo? <Link to="/auth" search={{ mode: "register", role: "customer" }} className="font-semibold text-primary">Create an account</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
