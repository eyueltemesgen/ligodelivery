import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Bike, ShoppingBag, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadImage } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type SignupRole = "customer" | "merchant" | "rider";
type Channel = "email" | "phone";

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
    id: "merchant",
    title: "Merchant",
    description: "List your shop, set your hours and reach more customers.",
    icon: Store,
  },
  {
    id: "rider",
    title: "Rider",
    description: "Deliver on your own schedule and cash out instantly.",
    icon: Bike,
  },
];

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s["mode"] === "register" ? ("register" as const) : ("login" as const),
    role: (["customer", "merchant", "rider"].includes(String(s["role"]))
      ? s["role"]
      : "customer") as SignupRole,
  }),
  head: () => ({
    meta: [
      { title: "Sign in or create an account — Ligo Delivery" },
      {
        name: "description",
        content: "Log in to Ligo or create a customer, merchant or rider account in Bishoftu.",
      },
      { property: "og:title", content: "Sign in — Ligo Delivery" },
      { property: "og:description", content: "Access your Ligo Delivery account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, role } = Route.useSearch();
  if (mode === "register") return <RegisterFlow initialRole={role} />;
  return <LoginForm />;
}

function RegisterFlow({ initialRole }: { initialRole: SignupRole }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<SignupRole>(initialRole);
  const [channel, setChannel] = useState<Channel>("email");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  // Rider onboarding
  const [vehicle, setVehicle] = useState("motorbike");
  const [nationalId, setNationalId] = useState("");
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [licenseDoc, setLicenseDoc] = useState<File | null>(null);
  // Merchant onboarding
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");

  useEffect(() => {
    if (user) void navigate({ to: "/account" });
  }, [user, navigate]);

  const identifier = channel === "email" ? email.trim() : phone.trim();
  const step2Valid =
    fullName.trim().length > 1 &&
    identifier.length > 3 &&
    (role !== "rider" || nationalId.trim().length > 3) &&
    (role !== "merchant" || shopName.trim().length > 1);

  const sendOtp = async () => {
    setBusy(true);
    try {
      const data: Record<string, string> = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        role,
      };
      if (role === "merchant") {
        data["shop_name"] = shopName.trim();
        data["shop_address"] = shopAddress.trim();
      }
      const { error } =
        channel === "email"
          ? await supabase.auth.signInWithOtp({
              email: email.trim(),
              options: { emailRedirectTo: `${window.location.origin}/`, data },
            })
          : await supabase.auth.signInWithOtp({ phone: phone.trim(), options: { data } });
      if (error) throw error;
      toast.success(`Verification code sent to your ${channel}.`);
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const completeRiderOnboarding = async (userId: string) => {
    let idPath: string | null = null;
    let licensePath: string | null = null;
    if (idDoc) idPath = await uploadImage(idDoc, `rider-docs/${userId}`);
    if (licenseDoc) licensePath = await uploadImage(licenseDoc, `rider-docs/${userId}`);
    const { error } = await supabase.from("riders").upsert(
      {
        id: userId,
        vehicle_type: vehicle,
        national_id: nationalId.trim(),
        id_document_url: idPath,
        license_document_url: licensePath,
      },
      { onConflict: "id" },
    );
    if (error) throw error;
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      const { data, error } =
        channel === "email"
          ? await supabase.auth.verifyOtp({ email: email.trim(), token: otp, type: "email" })
          : await supabase.auth.verifyOtp({ phone: phone.trim(), token: otp, type: "sms" });
      if (error) throw error;
      if (role === "rider" && data.user) {
        await completeRiderOnboarding(data.user.id);
      }
      toast.success(
        role === "rider"
          ? "Rider application received — an admin will review your documents."
          : role === "merchant"
            ? "Account created — our team will link your shop shortly."
            : "Account created. Welcome to Ligo!",
      );
      await navigate({ to: "/account" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
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
                className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
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
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
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

            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
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
                <Label htmlFor="reg-phone">Phone number</Label>
                <Input
                  id="reg-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2519…"
                  required
                />
              </div>
            )}
            {channel === "email" && (
              <div className="space-y-1.5">
                <Label htmlFor="phone-opt">Phone (optional)</Label>
                <Input
                  id="phone-opt"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2519…"
                />
              </div>
            )}

            {role === "rider" && (
              <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
                <p className="text-sm font-semibold">Rider verification</p>
                <div className="space-y-1.5">
                  <Label htmlFor="v">Vehicle type</Label>
                  <Input
                    id="v"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    placeholder="motorbike / bicycle / foot"
                  />
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
                  <Label htmlFor="licdoc">Driving license photo (optional)</Label>
                  <Input
                    id="licdoc"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLicenseDoc(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
            )}

            {role === "merchant" && (
              <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
                <p className="text-sm font-semibold">Your shop</p>
                <div className="space-y-1.5">
                  <Label htmlFor="shop-name">Shop name</Label>
                  <Input
                    id="shop-name"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shop-addr">Shop address</Label>
                  <Input
                    id="shop-addr"
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    placeholder="Kebele, street, landmark"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                className="flex-1"
                disabled={busy || !step2Valid}
                onClick={() => void sendOtp()}
              >
                {busy ? "Please wait…" : `Send ${channel === "email" ? "email" : "SMS"} code`}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={verifyOtp} className="mt-6 space-y-4">
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
              {busy ? "Verifying…" : "Create account"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setStep(2);
                setOtp("");
              }}
            >
              Use a different {channel}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/auth"
            search={{ mode: "login", role: "customer" }}
            className="font-semibold text-primary"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/account" });
  }, [user, navigate]);

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
          <Link
            to="/auth"
            search={{ mode: "register", role: "customer" }}
            className="font-semibold text-primary"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
