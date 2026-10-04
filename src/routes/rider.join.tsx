import { translations } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { Bike, Clock, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { mediaErrorKey, uploadImage } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/rider/join")({
  head: () => ({
    meta: [
      { title: translations.en.rj_meta_title },
      {
        name: "description",
        content: translations.en.rj_meta_desc,
      },
      { property: "og:title", content: translations.en.rj_meta_og_title },
      {
        property: "og:description",
        content: translations.en.rj_meta_og_desc,
      },
    ],
  }),
  component: RiderJoin,
});

function RiderJoin() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [vehicle, setVehicle] = useState("motorbike");
  const [nationalId, setNationalId] = useState("");
  const [notes, setNotes] = useState("");
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [licenseDoc, setLicenseDoc] = useState<File | null>(null);
  const [payoutMethod, setPayoutMethod] = useState("telebirr");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutName, setPayoutName] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const idPath = idDoc ? await uploadImage(idDoc, `rider-docs/${user.id}`) : null;
      const licensePath = licenseDoc
        ? await uploadImage(licenseDoc, `rider-docs/${user.id}`)
        : null;
      const { error } = await supabase.from("riders").upsert(
        {
          id: user.id,
          vehicle_type: vehicle,
          national_id: nationalId,
          notes,
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
      toast.success(t("rj_submitted"));
    } catch (err) {
      const mediaKey = mediaErrorKey(err);
      toast.error(mediaKey ? t(mediaKey) : err instanceof Error ? err.message : t("rj_err"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-ligo py-10">
      <div className="rounded-2xl bg-primary-soft p-8">
        <h1 className="font-display text-3xl font-extrabold">{t("rj_title")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("rj_sub")}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Wallet, tk: "rj_b1_t" as const, dk: "rj_b1_d" as const },
            { icon: Clock, tk: "rj_b2_t" as const, dk: "rj_b2_d" as const },
            { icon: Bike, tk: "rj_b3_t" as const, dk: "rj_b3_d" as const },
          ].map((b) => (
            <div key={b.tk} className="rounded-xl bg-card p-4 shadow-card">
              <b.icon className="h-5 w-5 text-primary" />
              <p className="mt-2 font-semibold">{t(b.tk)}</p>
              <p className="text-sm text-muted-foreground">{t(b.dk)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 max-w-lg">
        {!user ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center shadow-card">
            <p className="font-semibold">{t("rj_create")}</p>
            <Button asChild className="mt-4">
              <Link to="/register" search={{ role: "rider" }}>
                {t("rj_register")}
              </Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={apply}
            className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h2 className="font-display text-lg font-bold">{t("rj_application")}</h2>
            <div className="space-y-1.5">
              <Label htmlFor="v">{t("reg_vehicle_type")}</Label>
              <select
                id="v"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
              >
                <option value="bicycle">{t("reg_vehicle_bicycle")}</option>
                <option value="motorbike">{t("reg_vehicle_motorbike")}</option>
                <option value="scooter">{t("reg_vehicle_scooter")}</option>
                <option value="car">{t("reg_vehicle_car")}</option>
                <option value="foot">{t("rj_onfoot")}</option>
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
                onChange={(e) => setLicenseDoc(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm">{t("reg_payout_method")}</Label>
              <select
                id="pm"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
              >
                <option value="telebirr">{t("pay_telebirr")}</option>
                <option value="bank_account">{t("reg_payout_bank")}</option>
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
            <div className="space-y-1.5">
              <Label htmlFor="nt">{t("rj_else")}</Label>
              <Textarea id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? t("srd_submitting") : t("rj_submit")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
