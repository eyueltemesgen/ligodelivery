import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Bike, MailCheck, ShoppingBag, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/media";
import { categoriesQuery } from "@/lib/queries";
import { DAY_NAMES } from "@/lib/hours";
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
    id: "rider",
    title: "Rider",
    description: "Deliver on your own schedule and cash out instantly.",
    icon: Bike,
  },
  {
    id: "merchant",
    title: "Merchant",
    description: "List your shop, set your hours and reach more customers.",
    icon: Store,
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

type HoursDraft = { opens_at: string; closes_at: string; is_closed: boolean };
const DEFAULT_HOURS: HoursDraft[] = DAY_NAMES.map(() => ({
  opens_at: "08:00",
  closes_at: "22:00",
  is_closed: false,
}));

export const Route = createFileRoute("/register")({
  validateSearch: (s: Record<string, unknown>) => {
    const out: { role?: SignupRole } = {};
    if (["customer", "merchant", "rider"].includes(String(s["role"])))
      out.role = s["role"] as SignupRole;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Create your account — Ligo Delivery" },
      { name: "description", content: "Join Ligo as a customer, rider or merchant in Bishoftu." },
      { property: "og:title", content: "Create your account — Ligo Delivery" },
      { property: "og:description", content: "Join Ligo as a customer, rider or merchant." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { role: initialRole } = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<SignupRole>(initialRole ?? "customer");

  // Account credentials
  const [channel, setChannel] = useState<Channel>("email");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  // Rider onboarding
  const [vehicle, setVehicle] = useState("motorbike");
  const [nationalId, setNationalId] = useState("");
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [licenseDoc, setLicenseDoc] = useState<File | null>(null);
  const [payoutMethod, setPayoutMethod] = useState("telebirr");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutName, setPayoutName] = useState("");
  // Merchant onboarding
  const { data: categories = [] } = useQuery(categoriesQuery);
  const [shopName, setShopName] = useState("");
  const [shopCategory, setShopCategory] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopLogo, setShopLogo] = useState<File | null>(null);
  const [shopCover, setShopCover] = useState<File | null>(null);
  const [hours, setHours] = useState<HoursDraft[]>(DEFAULT_HOURS);

  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailLinkSent, setEmailLinkSent] = useState(false);

  const identifier = channel === "email" ? email.trim() : phone.trim();

  const step2Valid = (() => {
    if (fullName.trim().length < 2) return false;
    if (channel === "email") {
      if (!email.trim().includes("@")) return false;
      if (role === "customer" && password.length < 6) return false;
    } else if (phone.trim().length < 9) return false;
    if (role === "rider") {
      if (nationalId.trim().length < 3 || !licenseDoc) return false;
      if (payoutAccount.trim().length < 5 || payoutName.trim().length < 2) return false;
    }
    if (role === "merchant") {
      if (
        shopName.trim().length < 2 ||
        shopAddress.trim().length < 3 ||
        shopPhone.trim().length < 7
      )
        return false;
    }
    return true;
  })();

  const setDay = (day: number, patch: Partial<HoursDraft>) =>
    setHours((cur) => cur.map((d, i) => (i === day ? { ...d, ...patch } : d)));

  const sendVerification = async () => {
    setBusy(true);
    try {
      if (role === "customer" && channel === "email") {
        // Password signup — Supabase emails a verification link
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName.trim(), phone: phone.trim(), role },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created. Welcome to Ligo!");
          await navigate({ to: "/" });
        } else {
          setEmailLinkSent(true);
          setStep(3);
        }
        return;
      }
      const data: Record<string, string> = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        role,
      };
      if (role === "merchant") data["shop_name"] = shopName.trim();
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
      toast.error(err instanceof Error ? err.message : "Could not start verification");
    } finally {
      setBusy(false);
    }
  };

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

  const completeMerchantOnboarding = async (userId: string) => {
    const logoPath = shopLogo ? await uploadImage(shopLogo, "shops") : null;
    const coverPath = shopCover ? await uploadImage(shopCover, "shops") : null;
    const { data: shop, error } = await supabase
      .from("shops")
      .insert({
        name: shopName.trim(),
        category_id: shopCategory || null,
        phone: shopPhone.trim(),
        address: shopAddress.trim(),
        image_url: logoPath,
        cover_url: coverPath,
        owner_id: userId,
        is_active: false,
      })
      .select("id")
      .single();
    if (error) throw error;
    const { error: hoursError } = await supabase.from("shop_hours").insert(
      hours.map((h, day) => ({
        shop_id: shop.id,
        day_of_week: day,
        opens_at: h.opens_at,
        closes_at: h.closes_at,
        is_closed: h.is_closed,
      })),
    );
    if (hoursError) throw hoursError;
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
      if (data.user && role === "rider") await completeRiderOnboarding(data.user.id);
      if (data.user && role === "merchant") await completeMerchantOnboarding(data.user.id);
      toast.success(
        role === "rider"
          ? "Rider application received — sit tight while we verify your documents."
          : role === "merchant"
            ? "Shop registered — our team will verify it shortly."
            : "Account created. Welcome to Ligo!",
      );
      await navigate({ to: role === "rider" ? "/rider" : role === "merchant" ? "/merchant" : "/" });
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
            {role === "customer" && channel === "email" && (
              <div className="space-y-1.5">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  We'll email you a verification link to activate your account.
                </p>
              </div>
            )}
            {channel === "email" && (
              <div className="space-y-1.5">
                <Label htmlFor="phone-opt">Phone {role === "customer" ? "(optional)" : ""}</Label>
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
                  <select
                    id="v"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
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
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
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

            {role === "merchant" && (
              <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
                <p className="text-sm font-semibold">Your shop</p>
                <div className="space-y-1.5">
                  <Label htmlFor="shop-name">Store name</Label>
                  <Input
                    id="shop-name"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shop-cat">Category</Label>
                  <select
                    id="shop-cat"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={shopCategory}
                    onChange={(e) => setShopCategory(e.target.value)}
                  >
                    <option value="">Select a category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shop-phone">Store phone</Label>
                  <Input
                    id="shop-phone"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    placeholder="+2519…"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shop-addr">Operating address</Label>
                  <Input
                    id="shop-addr"
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    placeholder="Kebele, street, landmark"
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="shop-logo">Store logo</Label>
                    <Input
                      id="shop-logo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setShopLogo(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="shop-cover">Cover image</Label>
                    <Input
                      id="shop-cover"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setShopCover(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Weekly operating hours</p>
                  {hours.map((d, day) => (
                    <div key={day} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="w-24 text-xs font-medium">{DAY_NAMES[day]}</span>
                      <label className="flex items-center gap-1 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={d.is_closed}
                          onChange={(e) => setDay(day, { is_closed: e.target.checked })}
                        />
                        Closed
                      </label>
                      {!d.is_closed && (
                        <>
                          <Input
                            type="time"
                            className="h-8 w-28"
                            value={d.opens_at}
                            onChange={(e) => setDay(day, { opens_at: e.target.value })}
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="time"
                            className="h-8 w-28"
                            value={d.closes_at}
                            onChange={(e) => setDay(day, { closes_at: e.target.value })}
                          />
                        </>
                      )}
                    </div>
                  ))}
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
                onClick={() => void sendVerification()}
              >
                {busy
                  ? "Please wait…"
                  : role === "customer" && channel === "email"
                    ? "Send verification link"
                    : `Send ${channel === "email" ? "email" : "SMS"} code`}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && emailLinkSent && (
          <div className="mt-6 space-y-4 text-center">
            <MailCheck className="mx-auto h-10 w-10 text-primary" />
            <div>
              <p className="font-semibold">Check your inbox</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We sent a verification link to {identifier}. Click it to activate your account, then
                sign in.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/login">Go to sign in</Link>
            </Button>
          </div>
        )}

        {step === 3 && !emailLinkSent && (
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
