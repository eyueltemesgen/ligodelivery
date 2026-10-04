import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { Bike, Lock, Mail, ShoppingBag, Smartphone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mediaErrorKey, uploadImage } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, type TranslationKey } from "@/lib/i18n";

type SignupRole = "customer" | "rider";

const ROLE_CARDS: {
  id: SignupRole;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: typeof ShoppingBag;
}[] = [
  {
    id: "customer",
    titleKey: "reg_customer",
    descriptionKey: "reg_customer_desc",
    icon: ShoppingBag,
  },
  {
    id: "rider",
    titleKey: "reg_rider",
    descriptionKey: "reg_rider_desc",
    icon: Bike,
  },
];

const VEHICLE_TYPES = [
  { value: "bicycle", labelKey: "reg_vehicle_bicycle" },
  { value: "motorbike", labelKey: "reg_vehicle_motorbike" },
  { value: "scooter", labelKey: "reg_vehicle_scooter" },
  { value: "car", labelKey: "reg_vehicle_car" },
] as const;

const PAYOUT_METHODS = [
  { value: "telebirr", labelKey: "pay_telebirr" },
  { value: "bank_account", labelKey: "reg_payout_bank" },
] as const;

function friendlyError(t: (k: TranslationKey) => string, err: unknown): string {
  const mediaKey = mediaErrorKey(err);
  if (mediaKey) return t(mediaKey);
  const msg = err instanceof Error ? err.message : "";
  const lower = msg.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered"))
    return t("reg_err_email_registered");
  if (lower.includes("password")) return t("reg_err_password");
  if (lower.includes("rate limit") || lower.includes("too many requests")) return t("reg_err_rate");
  return msg || t("reg_err_generic");
}

export const Route = createFileRoute("/register")({
  validateSearch: (s: Record<string, unknown>) => {
    const out: { role?: SignupRole } = {};
    if (["customer", "rider"].includes(String(s["role"]))) out.role = s["role"] as SignupRole;
    return out;
  },
  head: () => ({
    meta: [
      { title: translations.en.reg_meta_title },
      {
        name: "description",
        content: translations.en.reg_meta_desc,
      },
      { property: "og:title", content: translations.en.reg_meta_title },
      { property: "og:description", content: translations.en.reg_meta_og_desc },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { t } = useLanguage();
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
      toast.error(t("reg_err_complete"));
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
      if (!data.user) throw new Error(t("reg_err_signup"));

      if (!data.session) {
        toast.success(t("reg_created_confirm"));
        await navigate({ to: "/login" });
        return;
      }

      if (role === "rider") await completeRiderOnboarding(data.user.id);
      toast.success(role === "rider" ? t("reg_rider_received") : t("reg_created_welcome"));
      await navigate({ to: role === "rider" ? "/rider" : "/" });
    } catch (err) {
      toast.error(friendlyError(t, err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-ligo flex justify-center py-12">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-pop">
        <h1 className="font-display text-2xl font-extrabold">{t("reg_title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("reg_sub")}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {ROLE_CARDS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-100 active:scale-95 ${
                role === r.id
                  ? "border-primary bg-primary-soft"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <r.icon className="h-5 w-5 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-semibold">{t(r.titleKey)}</span>
                <span className="block text-xs text-muted-foreground">{t(r.descriptionKey)}</span>
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("reg_full_name")}</Label>
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
            <Label htmlFor="email">{t("reg_email")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("ph_email")}
                className="pl-9"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("reg_password")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("reg_password_placeholder")}
                autoComplete="new-password"
                className="pl-9"
                required
                minLength={6}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">
              {role === "rider" ? t("reg_phone") : t("reg_phone_optional")}
            </Label>
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
              <p className="text-sm font-semibold">{t("reg_rider_verification")}</p>
              <div className="space-y-1.5">
                <Label htmlFor="v">{t("reg_vehicle_type")}</Label>
                <select
                  id="v"
                  className="h-9 w-full rounded-md border border-input bg-input px-2 text-sm"
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                >
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v.value} value={v.value}>
                      {t(v.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nid">{t("reg_national_id")}</Label>
                <Input
                  id="nid"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="iddoc">{t("reg_id_photo")}</Label>
                <Input
                  id="iddoc"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIdDoc(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="licdoc">{t("reg_license_photo")}</Label>
                <Input
                  id="licdoc"
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setLicenseDoc(e.target.files?.[0] ?? null)}
                />
              </div>
              <p className="pt-1 text-sm font-semibold">{t("reg_payout_details")}</p>
              <div className="space-y-1.5">
                <Label htmlFor="pm">{t("reg_payout_method")}</Label>
                <select
                  id="pm"
                  className="h-9 w-full rounded-md border border-input bg-input px-2 text-sm"
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                >
                  {PAYOUT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {t(m.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pa">
                  {payoutMethod === "telebirr" ? t("reg_telebirr_phone") : t("reg_bank_account")}
                </Label>
                <Input
                  id="pa"
                  value={payoutAccount}
                  onChange={(e) => setPayoutAccount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pn">{t("reg_account_holder")}</Label>
                <Input
                  id="pn"
                  value={payoutName}
                  onChange={(e) => setPayoutName(e.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">{t("reg_rider_note")}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={busy || !valid}>
            {busy ? t("reg_creating") : t("reg_create")}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t("reg_have_account")}{" "}
          <Link to="/login" className="font-semibold text-primary">
            {t("reg_sign_in")}
          </Link>
        </p>
      </div>
    </div>
  );
}
