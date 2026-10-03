import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bike, Clock, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadImage } from "@/lib/media";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/rider/join")({
  head: () => ({
    meta: [
      { title: "Become a የኔ Go rider in Bishoftu" },
      {
        name: "description",
        content:
          "Earn with የኔ Go — deliver food and groceries around Bishoftu on your own schedule.",
      },
      { property: "og:title", content: "Become a የኔ Go rider" },
      {
        property: "og:description",
        content: "Deliver with የኔ Go in Bishoftu and earn on your schedule.",
      },
    ],
  }),
  component: RiderJoin,
});

function RiderJoin() {
  const { user } = useAuth();
  const { t } = useI18n();
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
      toast.success(t("rjoin.submitted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("rjoin.submitFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-ligo py-10">
      <div className="rounded-2xl bg-primary-soft p-8">
        <h1 className="font-display text-3xl font-extrabold">{t("rjoin.title")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("rjoin.subtitle")}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Wallet, title: t("rjoin.perkPayouts"), d: t("rjoin.perkPayoutsDesc") },
            { icon: Clock, title: t("rjoin.perkHours"), d: t("rjoin.perkHoursDesc") },
            { icon: Bike, title: t("rjoin.perkVehicle"), d: t("rjoin.perkVehicleDesc") },
          ].map((b) => (
            <div key={b.title} className="rounded-xl bg-card p-4 shadow-card">
              <b.icon className="h-5 w-5 text-primary" />
              <p className="mt-2 font-semibold">{b.title}</p>
              <p className="text-sm text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 max-w-lg">
        {!user ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center shadow-card">
            <p className="font-semibold">{t("rjoin.createAccount")}</p>
            <Button asChild className="mt-4">
              <Link to="/register" search={{ role: "rider" }}>
                {t("rjoin.register")}
              </Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={apply}
            className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h2 className="font-display text-lg font-bold">{t("rjoin.application")}</h2>
            <div className="space-y-1.5">
              <Label htmlFor="v">{t("rjoin.vehicleType")}</Label>
              <select
                id="v"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
              >
                <option value="bicycle">{t("rider.vehicleBicycle")}</option>
                <option value="motorbike">{t("rider.vehicleMotorcycle")}</option>
                <option value="scooter">{t("rider.vehicleScooter")}</option>
                <option value="car">{t("rider.vehicleCar")}</option>
                <option value="foot">{t("rider.vehicleFoot")}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nid">{t("rjoin.nationalIdNumber")}</Label>
              <Input
                id="nid"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iddoc">{t("rjoin.nationalIdPhoto")}</Label>
              <Input
                id="iddoc"
                type="file"
                accept="image/*"
                onChange={(e) => setIdDoc(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="licdoc">{t("rjoin.licensePhoto")}</Label>
              <Input
                id="licdoc"
                type="file"
                accept="image/*"
                onChange={(e) => setLicenseDoc(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm">{t("rjoin.payoutMethod")}</Label>
              <select
                id="pm"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
              >
                <option value="telebirr">{t("payMethod.telebirr")}</option>
                <option value="bank_account">{t("rjoin.bankAccount")}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pa">
                {payoutMethod === "telebirr"
                  ? t("rjoin.telebirrNumber")
                  : t("rjoin.bankAccountNumber")}
              </Label>
              <Input
                id="pa"
                value={payoutAccount}
                onChange={(e) => setPayoutAccount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pn">{t("rjoin.accountHolderName")}</Label>
              <Input
                id="pn"
                value={payoutName}
                onChange={(e) => setPayoutName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nt">{t("rjoin.anythingElse")}</Label>
              <Textarea id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? t("rjoin.submitting") : t("rjoin.submit")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
