import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  CheckCircle2,
  KeyRound,
  Mail,
  ShoppingBag,
  Smartphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type SignupRole = "customer" | "rider";

const ROLE_CARDS: {
  id: SignupRole;
  title: string;
  description: string;
  icon: typeof ShoppingBag;
}[] = [
  {
    id: "customer",
    title: "Customer",
    description: "Order food, groceries and essentials across Bishoftu.",
    icon: ShoppingBag,
  },
  {
    id: "rider",
    title: "Rider",
    description: "Deliver on your own schedule and cash out instantly.",
    icon: Bike,
  },
];

const VEHICLE_TYPES = [
  { value: "bicycle", label: "Bicycle" },
  { value: "motorbike", label: "Motorbike" },
  { value: "scooter", label: "Scooter" },
  { value: "car", label: "Car" },
];

const PAYOUT_METHODS = [
  { value: "telebirr", label: "Telebirr" },
  { value: "bank_account", label: "Bank account" },
];

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

export const Route = createFileRoute("/register")({
  validateSearch: (s: Record<string, unknown>) => {
    const out: { role?: SignupRole } = {};
    if (["customer", "rider"].includes(String(s["role"]))) out.role = s["role"] as SignupRole;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Create your account — Ligo Delivery" },
      {
        name: "description",
        content: "Join Ligo as a customer or rider in Bishoftu.",
      },
      { property: "og:title", content: "Create your account — Ligo Delivery" },
      { property: "og:description", content: "Join Ligo as a customer or rider." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { role: initialRole } = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<SignupRole>(initialRole ?? "customer");

  // Account details (passwordless — email OTP only)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Rider onboarding
  const [vehicle, setVehicle] = useState("motorbike");
  const [nationalId, setNationalId] = useState("");
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [licenseDoc, setLicenseDoc] = useState<File | null>(null);
  const [payoutMethod, setPayoutMethod] = useState("telebirr");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutName, setPayoutName] = useState("");

  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  // 60-second resend cooldown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const trimmedEmail = email.trim();

  const step2Valid = (() => {
    if (fullName.trim().length < 2 || !trimmedEmail.includes("@")) return false;
    if (role === "rider") {
      if (phone.trim().length < 9) return false;
      if (nationalId.trim().length < 3 || !licenseDoc) return false;
      if (payoutAccount.trim().length < 5 || payoutName.trim().length < 2) return false;
    }
    return true;
  })();

  const completeRiderOnboarding = async (userId: string) => {
    const idPath = idDoc ? await uploadImage(idDoc, `rider-docs/${userId}`) : null;
    const licensePath = await uploadImage(licenseDoc!, `rider-docs/${userId}`);
    const { error } = await supabase.from("riders").upsert(
      {
        id: userId,
        vehicle_type: vehicle,
        national_id: nationalId.trim(),
        id_document_url: idPath,
        license_document_url: licensePath,
        payout_method: payoutMethod,
        payout_account: payoutAccount.trim(),
        payout_account_name: payoutName.trim(),
        verification_status: "pending_verification",
        is_approved: false,
      },
      { onConflict: "id" },
    );
    if (error) throw error;
  };

  const finishSignup = async (userId: string) => {
    if (role === "rider") await completeRiderOnboarding(userId);
    toast.success(
      role === "rider"
        ? "Rider application received — sit tight while we verify your documents."
        : "Account created. Welcome to Ligo!",
    );
    await navigate({ to: role === "rider" ? "/rider" : "/" });
  };

  // Passwordless signup: email a 6-digit code and create the account on verify.
  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!step2Valid) {
      toast.error("Please complete the required fields");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: true,
          data: { full_name: fullName.trim(), phone: phone.trim(), role },
        },
      });
      if (error) throw error;
      toast.success("Verification code sent — check your inbox.");
      setOtp("");
      setResendIn(60);
      setStep(3);
    } catch (err) {
      toast.error(otpErrorMessage(err, "Could not send code"));
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
      const { data, error } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: otp,
        type: "email",
      });
      if (error) throw error;
      if (!data.user) throw new Error("Verification failed — please try again");
      await finishSignup(data.user.id);
    } catch (err) {
      toast.error(otpErrorMessage(err, "Invalid code"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-ligo flex justify-center py-12">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-pop">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-extrabold">Create your account</h1>
          <span className="text-xs font-medium text-muted-foreground">Step {step} of 3</span>
        </div>
        <div className="mt-3 flex gap-1">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">How will you use Ligo?</p>
            {ROLE_CARDS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-100 active:scale-95 ${
                  role === r.id
                    ? "border-primary bg-primary-soft"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <r.icon className="h-6 w-6 shrink-0 text-primary" />
                <span>
                  <span className="block font-semibold">{r.title}</span>
                  <span className="block text-sm text-muted-foreground">{r.description}</span>
                </span>
              </button>
            ))}
            <Button className="mt-2 w-full" onClick={() => setStep(2)}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                No password needed — we'll email you a 6-digit verification code.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone {role === "rider" ? "" : "(optional)"}</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2519…"
                  className="pl-9"
                  required={role === "rider"}
                />
              </div>
            </div>

            {role === "rider" && (
              <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
                <p className="text-sm font-semibold">Rider verification</p>
                <div className="space-y-1.5">
                  <Label htmlFor="v">Vehicle type</Label>
                  <select
                    id="v"
                    className="h-9 w-full rounded-md border border-input bg-input px-2 text-sm"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                  >
                    {VEHICLE_TYPES.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nid">National ID number</Label>
                  <Input
                    id="nid"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="iddoc">National ID photo</Label>
                  <Input
                    id="iddoc"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setIdDoc(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="licdoc">Driver's license photo</Label>
                  <Input
                    id="licdoc"
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setLicenseDoc(e.target.files?.[0] ?? null)}
                  />
                </div>
                <p className="pt-1 text-sm font-semibold">Payout details</p>
                <div className="space-y-1.5">
                  <Label htmlFor="pm">Payout method</Label>
                  <select
                    id="pm"
                    className="h-9 w-full rounded-md border border-input bg-input px-2 text-sm"
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                  >
                    {PAYOUT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pa">
                    {payoutMethod === "telebirr" ? "Telebirr phone number" : "Bank account number"}
                  </Label>
                  <Input
                    id="pa"
                    value={payoutAccount}
                    onChange={(e) => setPayoutAccount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pn">Account holder name</Label>
                  <Input
                    id="pn"
                    value={payoutName}
                    onChange={(e) => setPayoutName(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  New rider accounts start as pending verification — an admin approves your
                  documents before you can go online.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                className="flex-1"
                disabled={busy || !step2Valid}
                onClick={() => void sendCode()}
              >
                {busy ? "Sending code…" : "Send verification code"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={verifyOtp} className="mt-6 space-y-4">
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
              {busy ? "Verifying…" : "Verify & create account"}
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => {
                  setStep(2);
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
        )}

        {step !== 3 && (
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
