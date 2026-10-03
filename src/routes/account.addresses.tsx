import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { addressesQuery, type AddressRow } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage, isMissingColumn } from "@/lib/supa-error";
import { AccountHeader } from "@/components/account/AccountShell";
import { AccountState, ErrorState, ListSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/account/addresses")({
  head: () => ({
    meta: [
      { title: "Delivery addresses — የኔ Go" },
      { name: "description", content: "Manage your saved delivery addresses in Bishoftu." },
    ],
  }),
  component: AddressesPage,
});

const AREAS = [
  "Kebele 01",
  "Kebele 02",
  "Kebele 03",
  "Kebele 04",
  "Kebele 05",
  "Bishoftu Guda",
  "Cheleleki",
  "Hora",
  "Other",
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
};

const EMPTY_FORM: FormState = {
  label: "Home",
  full_name: "",
  phone: "",
  area: "Kebele 01",
  address: "",
  instructions: "",
  is_default: false,
};

function AddressesPage() {
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
    });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["addresses"] });
    void qc.invalidateQueries({ queryKey: ["account-summary"] });
  };

  const save = async () => {
    if (!form || !user) return;
    if (!form.address.trim()) {
      toast.error("Street / landmark is required");
      return;
    }
    if (form.phone.trim() && form.phone.trim().length < 9) {
      toast.error("Enter a valid phone number");
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
        toast.error(supabaseErrorMessage(clearError));
        return;
      }
    }
    const base = {
      user_id: user.id,
      label: form.label.trim() || "Home",
      full_name: form.full_name.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim(),
      instructions: form.instructions.trim() || null,
      is_default: form.is_default,
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
      toast.error(supabaseErrorMessage(error));
      return;
    }
    setForm(null);
    invalidate();
    toast.success(form.id ? "Address updated" : "Address saved");
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
      toast.error(supabaseErrorMessage(error));
      return;
    }
    invalidate();
    toast.success("Default address updated");
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const { error } = await supabase.from("addresses").delete().eq("id", deleteTarget.id);
    setBusy(false);
    setDeleteTarget(null);
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    invalidate();
    toast.success("Address removed");
  };

  return (
    <>
      <AccountHeader
        title="Delivery addresses"
        description="Save the places you order to so checkout takes seconds."
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add address
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
          title="No saved addresses"
          description="Add your home, work or any spot in Bishoftu to speed up checkout."
          action={
            <Button onClick={openNew}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add your first address
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
                    Default
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-medium">{a.address}</p>
              <p className="text-sm text-muted-foreground">
                {[a.area, a.city].filter(Boolean).join(", ")}
              </p>
              {a.instructions && (
                <p className="mt-1 text-xs text-muted-foreground">Note: {a.instructions}</p>
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
                    Set default
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(a)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit address" : "Add a delivery address"}</DialogTitle>
            <DialogDescription>
              We deliver across Bishoftu. Add a clear landmark to help your rider.
            </DialogDescription>
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
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="Home, Work…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="area">Area / Kebele</Label>
                  <select
                    id="area"
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="street">Street / landmark</Label>
                <Input
                  id="street"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. near Bishoftu Hospital, blue gate"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rec-name">Recipient name</Label>
                  <Input
                    id="rec-name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rec-phone">Phone</Label>
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
                <Label htmlFor="instr">Delivery instructions</Label>
                <Textarea
                  id="instr"
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  rows={2}
                  placeholder="e.g. call on arrival, 3rd floor"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                Make this my default address
              </label>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : form.id ? "Save changes" : "Save address"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this address?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.address} will be removed from your saved addresses. This can't be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
