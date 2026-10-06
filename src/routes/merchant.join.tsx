import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { BadgeCheck, Building2, Check, Crosshair, ImageIcon, Store, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, type TranslationKey } from "@/lib/i18n";
import { categoriesQuery } from "@/lib/queries";
import { mediaErrorKey, uploadImage } from "@/lib/media";
import { merchantProfileQuery, MERCHANT_STATUS_LABEL } from "@/lib/merchant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/merchant/join")({
  head: () => ({
    meta: [
      { title: translations.en.mj_meta_title },
      {
        name: "description",
        content: translations.en.mj_meta_desc,
      },
      { property: "og:title", content: translations.en.mj_meta_og_title },
      {
        property: "og:description",
        content: translations.en.mj_meta_og_desc,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MerchantJoin,
});

const STEPS: TranslationKey[] = [
  "mj_step_account",
  "mj_step_business",
  "mj_step_profile",
  "mj_step_review",
];

const MERCHANT_STATUS_KEY: Record<keyof typeof MERCHANT_STATUS_LABEL, TranslationKey> = {
  pending: "mj_status_pending",
  under_review: "mj_status_under_review",
  approved: "mj_status_approved",
  rejected: "mj_status_rejected",
  suspended: "mj_status_suspended",
};

function MerchantJoin() {
  const { user, profile, refresh } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: existing, refetch } = useQuery(merchantProfileQuery(user?.id));

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Step 1 — account
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2 — business
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Bishoftu");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [opensAt, setOpensAt] = useState("08:00");
  const [closesAt, setClosesAt] = useState("21:00");

  // Step 3 — images
  const [logo, setLogo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);

  // Step 4
  const [terms, setTerms] = useState(false);

  useEffect(() => {
    if (profile) {
      setOwnerName((v) => v || profile.full_name || "");
      setPhone((v) => v || profile.phone || "");
    }
    if (user?.email) setEmail((v) => v || user.email!);
  }, [profile, user]);

  useEffect(() => {
    if (!existing) return;
    setOwnerName((v) => v || existing.owner_name);
    setBusinessName((v) => v || existing.business_name);
    setDescription((v) => v || existing.business_description || "");
    setCategoryId((v) => v || existing.category_id || "");
    setBusinessPhone((v) => v || existing.business_phone || "");
    setAddress((v) => v || existing.address || "");
    setCity((v) => v || existing.city);
    setLat((v) => v || (existing.lat != null ? String(existing.lat) : ""));
    setLng((v) => v || (existing.lng != null ? String(existing.lng) : ""));
    setOpensAt(existing.opens_at.slice(0, 5));
    setClosesAt(existing.closes_at.slice(0, 5));
  }, [existing]);

  const createAccount = async () => {
    if (password.length < 6) {
      toast.error(t("mj_err_pw_short"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("mj_err_pw_match"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/merchant/join`,
        data: { full_name: ownerName.trim(), phone: phone.trim() },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success(t("mj_created"));
    setStep(1);
  };

  const locate = () => {
    if (!navigator.geolocation) {
      toast.error(t("mj_err_no_geo"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(6));
        setLng(p.coords.longitude.toFixed(6));
        toast.success(t("mj_geo_ok"));
      },
      () => toast.error(t("mj_err_geo")),
    );
  };

  const submit = async () => {
    if (!user) {
      toast.error(t("mj_err_signin"));
      return;
    }
    if (!terms) {
      toast.error(t("mj_err_terms"));
      return;
    }
    if (!businessName.trim()) {
      toast.error(t("mj_err_business"));
      return;
    }
    setBusy(true);
    try {
      const folder = `merchants/${user.id}`;
      const logoPath = logo ? await uploadImage(logo, folder) : (existing?.logo_url ?? null);
      const coverPath = cover ? await uploadImage(cover, folder) : (existing?.cover_url ?? null);
      // Nullable application fields are optional in the database function but the
      // generated RPC types describe them as required non-null arguments.
      const args = {
        _owner_name: ownerName.trim(),
        _contact_phone: phone.trim(),
        _business_name: businessName.trim(),
        _business_description: description.trim(),
        _category_id: categoryId || null,
        _business_phone: businessPhone.trim(),
        _address: address.trim(),
        _city: city.trim(),
        _lat: lat ? Number(lat) : null,
        _lng: lng ? Number(lng) : null,
        _opens_at: opensAt,
        _closes_at: closesAt,
        _logo_url: logoPath,
        _cover_url: coverPath,
      } as unknown as Parameters<typeof supabase.rpc<"submit_merchant_application">>[1];
      const { error } = await supabase.rpc("submit_merchant_application", args);

      if (error) throw error;
      await Promise.all([refetch(), refresh()]);
      toast.success(t("mj_submitted"));
      void navigate({ to: "/merchant" });
    } catch (err) {
      const mediaKey = mediaErrorKey(err);
      toast.error(mediaKey ? t(mediaKey) : err instanceof Error ? err.message : t("mj_err_submit"));
    } finally {
      setBusy(false);
    }
  };

  const signedIn = !!user;
  const currentStep = signedIn && step === 0 ? 1 : step;

  return (
    <div className="container-ligo py-10">
      <header className="rounded-2xl bg-primary-soft p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {t("mj_for_business")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{t("mj_title")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("mj_sub")}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Store, tk: "mj_b1_t" as const, dk: "mj_b1_d" as const },
            { icon: Wallet, tk: "mj_b2_t" as const, dk: "mj_b2_d" as const },
            { icon: BadgeCheck, tk: "mj_b3_t" as const, dk: "mj_b3_d" as const },
          ].map((b) => (
            <div key={b.tk} className="rounded-xl bg-card p-4 shadow-card">
              <b.icon className="h-5 w-5 text-primary" />
              <p className="mt-2 font-semibold">{t(b.tk)}</p>
              <p className="text-sm text-muted-foreground">{t(b.dk)}</p>
            </div>
          ))}
        </div>
      </header>

      {existing && existing.status !== "rejected" ? (
        <section className="mt-8 max-w-xl rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-xl font-bold">
            {t("mj_app_status", { status: t(MERCHANT_STATUS_KEY[existing.status]) })}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {existing.status === "approved" ? t("mj_live") : t("mj_reviewing")}
          </p>
          {existing.review_notes && (
            <p className="mt-3 rounded-md bg-secondary p-3 text-sm">{existing.review_notes}</p>
          )}
          <Button asChild className="mt-5">
            <Link to="/merchant">{t("mj_dashboard")}</Link>
          </Button>
        </section>
      ) : (
        <>
          <ol className="mt-8 flex flex-wrap gap-2">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  i === currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : i < currentStep
                      ? "border-primary/40 bg-primary-soft text-foreground"
                      : "border-border text-muted-foreground"
                }`}
              >
                {i < currentStep ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
                {t(label)}
              </li>
            ))}
          </ol>

          <section className="mt-6 max-w-2xl space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
            {currentStep === 0 && (
              <>
                <h2 className="font-display text-xl font-bold">{t("mj_create_title")}</h2>
                <Field label={t("reg_full_name")}>
                  <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                </Field>
                <Field label={t("reg_phone")}>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+2519…"
                  />
                </Field>
                <Field label={t("reg_email")}>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("reg_password")}>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </Field>
                  <Field label={t("mj_confirm_password")}>
                    <Input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button onClick={() => void createAccount()} disabled={busy}>
                    {busy ? t("reg_creating") : t("mj_create_continue")}
                  </Button>
                  <Button asChild variant="ghost">
                    <Link to="/merchant/login">{t("mj_have_account")}</Link>
                  </Button>
                </div>
              </>
            )}

            {currentStep === 1 && (
              <>
                <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                  <Building2 className="h-5 w-5 text-primary" /> {t("mj_business_details")}
                </h2>
                <Field label={t("mj_business_name")}>
                  <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </Field>
                <Field label={t("mj_description")}>
                  <Textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("mj_description_ph")}
                  />
                </Field>
                <Field label={t("mj_category")}>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">{t("mj_select_category")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("mj_business_phone")}>
                    <Input
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                    />
                  </Field>
                  <Field label={t("mj_city")}>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} />
                  </Field>
                </div>
                <Field label={t("mj_business_address")}>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={t("mj_latitude")}>
                    <Input
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      inputMode="decimal"
                    />
                  </Field>
                  <Field label={t("mj_longitude")}>
                    <Input
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      inputMode="decimal"
                    />
                  </Field>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" onClick={locate} className="w-full">
                      <Crosshair className="mr-2 h-4 w-4" /> {t("mj_use_location")}
                    </Button>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("mj_opening")}>
                    <Input
                      type="time"
                      value={opensAt}
                      onChange={(e) => setOpensAt(e.target.value)}
                    />
                  </Field>
                  <Field label={t("mj_closing")}>
                    <Input
                      type="time"
                      value={closesAt}
                      onChange={(e) => setClosesAt(e.target.value)}
                    />
                  </Field>
                </div>
                <StepNav
                  onBack={signedIn ? undefined : () => setStep(0)}
                  onNext={() => {
                    if (!businessName.trim()) {
                      toast.error(t("mj_err_business_continue"));
                      return;
                    }
                    setStep(2);
                  }}
                />
              </>
            )}

            {currentStep === 2 && (
              <>
                <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                  <ImageIcon className="h-5 w-5 text-primary" /> {t("mj_shop_images")}
                </h2>
                <p className="text-sm text-muted-foreground">{t("mj_images_note")}</p>
                <Field label={t("mj_shop_logo")}>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                  />
                </Field>
                <Field label={t("mj_cover_image")}>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCover(e.target.files?.[0] ?? null)}
                  />
                </Field>
                <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} />
              </>
            )}

            {currentStep === 3 && (
              <>
                <h2 className="font-display text-xl font-bold">{t("mj_review_submit")}</h2>
                <dl className="divide-y divide-border rounded-lg border border-border">
                  {[
                    [t("mj_owner"), ownerName],
                    [t("mj_business"), businessName],
                    [t("mj_category"), categories.find((c) => c.id === categoryId)?.name ?? "—"],
                    [t("mj_business_phone"), businessPhone || "—"],
                    [t("mj_address"), `${address || "—"}, ${city}`],
                    [t("mj_hours"), `${opensAt} – ${closesAt}`],
                    [t("mj_logo"), logo?.name ?? (existing?.logo_url ? t("mj_uploaded") : "—")],
                    [t("mj_cover"), cover?.name ?? (existing?.cover_url ? t("mj_uploaded") : "—")],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-3 py-2 text-sm">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={terms}
                    onCheckedChange={(v) => setTerms(v === true)}
                    className="mt-0.5"
                  />
                  <span>{t("mj_terms")}</span>
                </label>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    {t("mj_back")}
                  </Button>
                  <Button onClick={() => void submit()} disabled={busy}>
                    {busy ? t("srd_submitting") : t("mj_submit")}
                  </Button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StepNav({ onBack, onNext }: { onBack?: (() => void) | undefined; onNext: () => void }) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap gap-3 pt-2">
      {onBack && (
        <Button variant="outline" onClick={onBack}>
          {t("mj_back")}
        </Button>
      )}
      <Button onClick={onNext}>{t("mj_continue")}</Button>
    </div>
  );
}
