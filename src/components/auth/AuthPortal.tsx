import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Role } from "@/hooks/useAuth";
import { portalPathFor } from "@/components/auth/guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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

/** Friendly messages for the common Supabase OTP failure modes. */
function otpErrorMessage(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : "";
  const lower = msg.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("too many requests"))
    return "Too many attempts — please wait a minute before requesting another code.";
  if (lower.includes("expired")) return "That code has expired — request a new one.";
  if (lower.includes("invalid") || lower.includes("token"))
    return "Invalid code — double-check the 6 digits and try again.";
  return msg || fallback;
}

export function AuthPortal({ kind }: { kind: PortalKind }) {
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  // Once authenticated, push users straight to their role home without a refresh.
  useEffect(() => {
    if (!loading && user) void navigate({ to: portalPathFor(roles) });
  }, [user, roles, loading, navigate]);

  // 60-second resend cooldown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const trimmedEmail = email.trim();

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!trimmedEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: true, // automatically creates new accounts
        },
      });
      if (error) throw error;
      setCodeSent(true);
      setOtp("");
      setResendIn(60);
      toast.success("Verification code sent — check your inbox.");
    } catch (err) {
      toast.error(otpErrorMessage(err, "Could not send code"));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: otp,
        type: "email",
      });
      if (error) throw error;
      if (!data.user) throw new Error("Verification failed — please try again");
      toast.success("Signed in");
      // The useEffect above navigates to the correct portal once the session lands.
    } catch (err) {
      toast.error(otpErrorMessage(err, "Invalid code"));
    } finally {
      setBusy(false);
    }
  };

  const showRegister = kind !== "admin";

  return (
    <PortalShell kind={kind}>
      {codeSent ? (
        <form onSubmit={verifyCode} className="mt-5 space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code we sent to{" "}
              <span className="font-medium text-foreground">{trimmedEmail}</span>.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
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
            {busy ? "Verifying…" : "Verify & sign in"}
          </Button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => {
                setCodeSent(false);
                setOtp("");
                setResendIn(0);
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Change email
            </button>
            <button
              type="button"
              className="font-medium text-primary disabled:opacity-50"
              disabled={busy || resendIn > 0}
              onClick={() => void sendCode()}
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={sendCode} className="mt-5 space-y-4">
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
          <Button type="submit" className="w-full" disabled={busy || !trimmedEmail.includes("@")}>
            {busy ? "Sending code…" : "Email me a sign-in code"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            No password needed — we email you a one-time code.
          </p>
        </form>
      )}

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
