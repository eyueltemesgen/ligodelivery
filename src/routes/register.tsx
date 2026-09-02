import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bike, Lock, Mail, ShoppingBag, Smartphone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  const lower = msg.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered"))
    return "That email is already registered — try signing in instead.";
  if (lower.includes("password")) return "Password must be at least 6 characters.";
  if (lower.includes("rate limit") || lower.includes("too many requests"))
    return "Too many attempts — please wait a minute and try again.";
  return msg || "Could not create your account";
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
  const [role, setRole] = useState<SignupRole>(initialRole ?? "customer");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  // Rider onboarding
  const [vehicle, setVehicle] = useState("motorbike");
  const [nationalId, setNationalId] = useState("");
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [licenseDoc, setLicenseDoc] = useState<File | null>(null);
  const [payoutMethod, setPayoutMethod] = useState("telebirr");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutName, setPayoutName] = useState("");

  const [busy, setBusy] = useState(false);

  const trimmedEmail = email.trim();

  const valid = (() => {
    if (fullName.trim().length < 2 || !trimmedEmail.includes("@") || password.length < 6)
      return false;
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      toast.error("Please complete the required fields");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { full_name: fullName.trim(), phone: phone.trim(), role },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Signup failed — please try again");

      if (!data.session) {
        toast.success("Account created — check your email to confirm, then sign in.");
        await navigate({ to: "/login" });
        return;
      }

      if (role === "rider") await completeRiderOnboarding(data.user.id);
      toast.success(
        role === "rider"
          ? "Rider application received — sit tight while we verify your documents."
          : "Account created. Welcome to Ligo!",
      );
      await navigate({ to: role === "rider" ? "/rider" : "/" });
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-ligo flex justify-center py-12">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-pop">
        <h1 className="font-display text-2xl font-extrabold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">How will you use Ligo?</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {ROLE_CARDS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-100 active:scale-95 ${
                role === r.id ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50"
              }`}
            >
              <r.icon className="h-5 w-5 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-semibold">{r.title}</span>
                <span className="block text-xs text-muted-foreground">{r.description}</span>
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-9"
                required
              />
            </div>
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="pl-9"
                required
                minLength={6}
              />
            </div>
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
                New rider accounts start as pending verification — an admin approves your documents
                before you can go online.
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={busy || !valid}>
            {busy ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
