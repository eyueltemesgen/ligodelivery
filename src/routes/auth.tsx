import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s['mode'] === "register" ? ("register" as const) : ("login" as const),
    role: s['role'] === "rider" ? ("rider" as const) : ("customer" as const),
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
type OtpType = "signup" | "email" | "sms";

function AuthPage() {
  const { mode, role } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [channel, setChannel] = useState<Channel>("email");
  const [usePassword, setUsePassword] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  // Verification step state.
  const [step, setStep] = useState<"form" | "verify">("form");
  const [code, setCode] = useState("");
  const [otpType, setOtpType] = useState<OtpType>("signup");

  useEffect(() => {
    if (user) void navigate({ to: "/account" });
  }, [user, navigate]);

  const identifier = channel === "email" ? email : phone;

  const sendRegistration = async () => {
    if (channel === "email") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: fullName, phone, role } },
      });
      if (error) throw error;
      setOtpType("signup");
    } else {
      const { error } = await supabase.auth.signUp({
        phone,
        password,
        options: { data: { full_name: fullName, phone, role } },
      });
      if (error) throw error;
      setOtpType("sms");
    }
  };

  const sendLoginCode = async () => {
    if (channel === "email") {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (error) throw error;
      setOtpType("email");
    } else {
      const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
      if (error) throw error;
      setOtpType("sms");
    }
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") {
        await sendRegistration();
        setStep("verify");
        toast.success(`We sent a verification code to your ${channel}.`);
      } else if (usePassword) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        await navigate({ to: "/account" });
      } else {
        await sendLoginCode();
        setStep("verify");
        toast.success(`We sent a login code to your ${channel}.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;
    setBusy(true);
    try {
      const params =
        channel === "email"
          ? { email, token: code, type: otpType as "signup" | "email" }
          : { phone, token: code, type: "sms" as const };
      const { error } = await supabase.auth.verifyOtp(params);
      if (error) throw error;
      toast.success("Verified — welcome to Ligo!");
      await navigate({ to: "/account" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired code");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    try {
      if (mode === "register") await sendRegistration();
      else await sendLoginCode();
      setCode("");
      toast.success("A new code is on its way.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend the code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-ligo flex justify-center py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-pop">
        {step === "verify" ? (
          <div>
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary-soft">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-extrabold">Enter verification code</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a 6-digit code to <span className="font-medium text-foreground">{identifier}</span>.
            </p>

            <form onSubmit={verifyCode} className="mt-6 space-y-5">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} className="h-11 w-11 text-base" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={busy || code.length < 6}>
                {busy ? "Verifying…" : "Verify & continue"}
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-between text-sm">
              <button type="button" onClick={() => { setStep("form"); setCode(""); }} className="text-muted-foreground hover:text-foreground">
                ← Change details
              </button>
              <button type="button" onClick={() => void resend()} disabled={busy} className="font-semibold text-primary disabled:opacity-50">
                Resend code
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-extrabold">
              {mode === "register" ? (role === "rider" ? "Join as a rider" : "Create your account") : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Ligo Delivery · Bishoftu</p>

            {/* Channel selector — verify by email or phone. */}
            {(mode === "register" || !usePassword) && (
              <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-surface p-1">
                <button
                  type="button"
                  onClick={() => setChannel("email")}
                  className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${channel === "email" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  <Mail className="h-4 w-4" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("phone")}
                  className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${channel === "phone" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  <Phone className="h-4 w-4" /> Phone
                </button>
              </div>
            )}

            <form onSubmit={submitForm} className="mt-6 space-y-4">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
              )}

              {channel === "email" || (mode === "login" && usePassword) ? (
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              ) : null}

              {(channel === "phone" || mode === "register") && (
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2519…" required={channel === "phone"} />
                </div>
              )}

              {(mode === "register" || usePassword) && (
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Please wait…" : mode === "register" ? "Send verification code" : usePassword ? "Sign in" : "Send login code"}
              </Button>
            </form>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => setUsePassword((v) => !v)}
                className="mt-4 w-full text-center text-sm font-medium text-primary"
              >
                {usePassword ? "Sign in with a one-time code instead" : "Sign in with a password instead"}
              </button>
            )}

            <p className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "register" ? (
                <>Already have an account? <Link to="/auth" search={{ mode: "login", role: "customer" }} className="font-semibold text-primary">Sign in</Link></>
              ) : (
                <>New to Ligo? <Link to="/auth" search={{ mode: "register", role: "customer" }} className="font-semibold text-primary">Create an account</Link></>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
