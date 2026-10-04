import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { Check, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { addressesQuery, type AddressRow } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";
import { isMissingColumn, supabaseErrorText } from "@/lib/supa-error";
import { AccountHeader } from "@/components/account/AccountShell";
import { AccountState, ErrorState, ListSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { LocationPicker } from "@/components/ligo/LocationPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, type TranslationKey } from "@/lib/i18n";

export const Route = createFileRoute("/account/addresses")({
  head: () => ({
    meta: [
      { title: translations.en.addr_meta_title },
      { name: "description", content: translations.en.addr_meta_desc },
    ],
  }),
  component: AddressesPage,
});

const AREAS: { value: string; key: TranslationKey }[] = [
  { value: "Kebele 01", key: "addr_area_kebele01" },
  { value: "Kebele 02", key: "addr_area_kebele02" },
  { value: "Kebele 03", key: "addr_area_kebele03" },
  { value: "Kebele 04", key: "addr_area_kebele04" },
  { value: "Kebele 05", key: "addr_area_kebele05" },
  { value: "Bishoftu Guda", key: "addr_area_guda" },
  { value: "Cheleleki", key: "addr_area_cheleleki" },
  { value: "Hora", key: "addr_area_hora" },
  { value: "Other", key: "addr_area_other" },
];

type FormState = {
  id?: string;
  label: string;
  full_name: string;
  phone: string;
  area: string;
  address: string;
  instructions: string;
  is_default: boolean;
  lat: number | null;
  lng: number | null;
};

const EMPTY_FORM: FormState = {
  label: "Home",
  full_name: "",
  phone: "",
  area: "Kebele 01",
  address: "",
  instructions: "",
  is_default: false,
  lat: null,
  lng: null,
};

function AddressesPage() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const { data = [], isLoading, isError, refetch } = useQuery(addressesQuery(user?.id));
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AddressRow | null>(null);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  const openNew = () =>
    setForm({
      ...EMPTY_FORM,
      full_name: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      is_default: data.length === 0,
    });

  const openEdit = (a: AddressRow) =>
    setForm({
      id: a.id,
      label: a.label,
      full_name: a.full_name ?? "",
      phone: a.phone ?? "",
      area: a.area ?? "Kebele 01",
      address: a.address,
      instructions: a.instructions ?? "",
      is_default: a.is_default,
      lat: a.lat,
      lng: a.lng,
    });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["addresses"] });
    void qc.invalidateQueries({ queryKey: ["account-summary"] });
  };

  const save = async () => {
    if (!form || !user) return;
    if (!form.address.trim()) {
      toast.error(t("addr_street_required"));
      return;
    }
    if (form.phone.trim() && form.phone.trim().length < 9) {
      toast.error(t("addr_invalid_phone"));
      return;
    }
    setBusy(true);
    // Keep exactly one default even before the DB trigger is applied: clear the
    // previous default before writing this address.
    if (form.is_default) {
      const clear = supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      const { error: clearError } = form.id ? await clear.neq("id", form.id) : await clear;
      if (clearError) {
        setBusy(false);
        toast.error(supabaseErrorText(t, clearError));
        return;
      }
    }
    const base = {
      user_id: user.id,
      label: form.label.trim() || t("addr_label_home"),
      full_name: form.full_name.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim(),
      instructions: form.instructions.trim() || null,
      is_default: form.is_default,
      lat: form.lat,
      lng: form.lng,
    };
    const withArea = { ...base, area: form.area || null, city: "Bishoftu" };
    const write = (payload: typeof base) =>
      form.id
        ? supabase.from("addresses").update(payload).eq("id", form.id)
        : supabase.from("addresses").insert(payload);
    let { error } = await write(withArea);
    // Live schema may predate the additive area/city migration — save the core
    // fields rather than failing the customer's write.
    if (error && isMissingColumn(error)) ({ error } = await write(base));
    setBusy(false);
    if (error) {
      toast.error(supabaseErrorText(t, error));
      return;
    }
    setForm(null);
    invalidate();
    toast.success(form.id ? t("addr_updated") : t("addr_saved"));
  };

  const makeDefault = async (a: AddressRow) => {
    if (!user) return;
    setSettingDefault(a.id);
    // Clear any existing default first so exactly one row is ever flagged, even
    // if the single-default DB trigger has not been applied yet.
    const { error: clearError } = await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .neq("id", a.id);
    const { error } = clearError
      ? { error: clearError }
      : await supabase.from("addresses").update({ is_default: true }).eq("id", a.id);
    setSettingDefault(null);
    if (error) {
      toast.error(supabaseErrorText(t, error));
      return;
    }
    invalidate();
    toast.success(t("addr_default_updated"));
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const { error } = await supabase.from("addresses").delete().eq("id", deleteTarget.id);
    setBusy(false);
    setDeleteTarget(null);
    if (error) {
      toast.error(supabaseErrorText(t, error));
      return;
    }
    invalidate();
    toast.success(t("addr_removed"));
  };

  return (
    <>
      <AccountHeader
        title={t("addr_title")}
        description={t("addr_desc")}
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("addr_add")}
          </Button>
        }
      />

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <AccountState
          icon={MapPin}
          title={t("addr_no_saved")}
          description={t("addr_no_saved_desc")}
          action={
            <Button onClick={openNew}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("addr_add_first")}
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.map((a) => (
            <li
              key={a.id}
              className={cn(
                "flex flex-col rounded-xl border bg-card p-4 shadow-card",
                a.is_default ? "border-primary/50" : "border-border",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-bold uppercase tracking-wide">
                  {a.label}
                </span>
                {a.is_default && (
                  <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    {t("addr_default")}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-medium">{a.address}</p>
              <p className="text-sm text-muted-foreground">
                {[a.area, a.city].filter(Boolean).join(", ")}
                {a.lat != null && a.lng != null && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    <MapPin className="h-3 w-3" />
                    {t("addr_pinned")}
                  </span>
                )}
              </p>
              {a.instructions && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("addr_note", { text: a.instructions })}
                </p>
              )}
              {(a.full_name || a.phone) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {[a.full_name, a.phone].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                {!a.is_default && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={settingDefault === a.id}
                    onClick={() => void makeDefault(a)}
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    {t("addr_set_default")}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {t("addr_edit")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(a)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {t("addr_delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.id ? t("addr_edit_title") : t("addr_add_title")}</DialogTitle>
            <DialogDescription>{t("addr_dialog_desc")}</DialogDescription>
          </DialogHeader>
          {form && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="label">{t("addr_label")}</Label>
                  <Input
                    id="label"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder={t("addr_label_placeholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="area">{t("addr_area")}</Label>
                  <select
                    id="area"
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {AREAS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {t(a.key)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="street">{t("addr_street")}</Label>
                <Input
                  id="street"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder={t("addr_street_placeholder")}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rec-name">{t("addr_recipient")}</Label>
                  <Input
                    id="rec-name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rec-phone">{t("addr_phone")}</Label>
                  <Input
                    id="rec-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    inputMode="tel"
                    placeholder="+251…"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="instr">{t("addr_instructions")}</Label>
                <Textarea
                  id="instr"
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  rows={2}
                  placeholder={t("addr_instructions_placeholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("addr_pin_location")}</Label>
                <p className="text-xs text-muted-foreground">{t("addr_pin_hint")}</p>
                <LocationPicker
                  lat={form.lat}
                  lng={form.lng}
                  onChange={(lat, lng) => setForm({ ...form, lat, lng })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                {t("addr_make_default")}
              </label>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>
                  {t("addr_cancel")}
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? t("addr_saving") : form.id ? t("addr_save_changes") : t("addr_save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("addr_delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("addr_delete_desc", { address: deleteTarget?.address ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("addr_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? t("addr_deleting") : t("addr_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
