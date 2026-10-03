import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  OCCASIONS,
  adminServiceOptionsQuery,
  type ServiceOption,
  type ServiceWithShop,
} from "@/lib/services";
import { ETB } from "@/lib/format";
import { supabaseErrorMessage } from "@/lib/supa-error";
import { StorageImage, uploadImage } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type { ServiceWithShop };
export type ServiceEditorCategory = { id: string; name: string; emoji: string | null };
export type ServiceEditorShop = { id: string; name: string };

// ===========================================================================

export type ServiceDraft = {
  id?: string;
  shop_id: string;
  service_category_id: string;
  name: string;
  summary: string;
  description: string;
  pricing_type: "fixed" | "quote";
  price: string;
  starting_price: string;
  price_unit: string;
  preparation_hours: string;
  lead_time_hours: string;
  min_guests: string;
  max_guests: string;
  service_area: string;
  includes: string[];
  occasions: string[];
  images: string[];
  cover_url: string | null;
  requires_location: boolean;
  requires_schedule: boolean;
  requires_recipient: boolean;
  anonymous_option: boolean;
  is_active: boolean;
  is_featured: boolean;
  allow_featured?: boolean;
};

export const emptyDraft = (): ServiceDraft => ({
  shop_id: "",
  service_category_id: "",
  name: "",
  summary: "",
  description: "",
  pricing_type: "fixed",
  price: "",
  starting_price: "",
  price_unit: "",
  preparation_hours: "",
  lead_time_hours: "24",
  min_guests: "",
  max_guests: "",
  service_area: "Bishoftu",
  includes: [],
  occasions: [],
  images: [],
  cover_url: null,
  requires_location: true,
  requires_schedule: true,
  requires_recipient: false,
  anonymous_option: false,
  is_active: true,
  is_featured: false,
});

export function ServiceEditor({
  draft: initial,
  categories,
  shops,
  onClose,
  onSaved,
}: {
  draft: ServiceDraft;
  categories: ServiceEditorCategory[];
  shops: ServiceEditorShop[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<ServiceDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newOption, setNewOption] = useState({ name: "", price: "" });
  const { data: options = [] } = useQuery(adminServiceOptionsQuery(initial.id));
  const qc = useQueryClient();

  const set = <K extends keyof ServiceDraft>(key: K, value: ServiceDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const paths: string[] = [];
      for (const file of Array.from(files).slice(0, 6)) {
        paths.push(await uploadImage(file, "services"));
      }
      setDraft((d) => ({
        ...d,
        images: [...d.images, ...paths],
        cover_url: d.cover_url ?? paths[0] ?? null,
      }));
      toast.success(`${paths.length} image(s) uploaded`);
    } catch (err) {
      toast.error(supabaseErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const save = async (): Promise<void> => {
    if (!draft.name.trim()) {
      toast.error("Service name is required");
      return;
    }
    if (!draft.shop_id) {
      toast.error("Choose a provider shop");
      return;
    }
    if (!draft.service_category_id) {
      toast.error("Choose a category");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        shop_id: draft.shop_id,
        service_category_id: draft.service_category_id,
        name: draft.name.trim(),
        summary: draft.summary.trim() || null,
        description: draft.description.trim() || null,
        pricing_type: draft.pricing_type,
        price: draft.pricing_type === "fixed" ? Number(draft.price || 0) : 0,
        starting_price: draft.starting_price ? Number(draft.starting_price) : null,
        price_unit: draft.price_unit.trim() || null,
        preparation_hours: draft.preparation_hours ? Number(draft.preparation_hours) : null,
        lead_time_hours: Number(draft.lead_time_hours || 24),
        min_guests: draft.min_guests ? Number(draft.min_guests) : null,
        max_guests: draft.max_guests ? Number(draft.max_guests) : null,
        service_area: draft.service_area.trim() || null,
        includes: draft.includes,
        occasions: draft.occasions,
        images: draft.images,
        cover_url: draft.cover_url,
        requires_location: draft.requires_location,
        requires_schedule: draft.requires_schedule,
        requires_recipient: draft.requires_recipient,
        anonymous_option: draft.anonymous_option,
        is_active: draft.is_active,
        is_featured: draft.is_featured,
      };
      if (draft.id) {
        const { error } = await supabase.from("services").update(payload).eq("id", draft.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
      }
      toast.success(draft.id ? "Service updated" : "Service created");
      onSaved();
    } catch (err) {
      toast.error(supabaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addOption = async (): Promise<void> => {
    if (!initial.id) {
      toast.error("Save the service first, then add add-ons");
      return;
    }
    if (!newOption.name.trim()) return;
    const { error } = await supabase.from("service_options").insert({
      service_id: initial.id,
      name: newOption.name.trim(),
      price_delta: Number(newOption.price || 0),
      option_type: "addon",
    });
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    setNewOption({ name: "", price: "" });
    void qc.invalidateQueries({ queryKey: ["admin-service-options", initial.id] });
    toast.success("Add-on added");
  };

  const deleteOption = async (o: ServiceOption): Promise<void> => {
    const { error } = await supabase.from("service_options").delete().eq("id", o.id);
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-service-options", initial.id] });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit service" : "New service"}</DialogTitle>
          <DialogDescription>
            Services appear on the Special Moments page once published.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sv-name">Service name</Label>
              <Input
                id="sv-name"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Birthday Decoration Package"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={draft.service_category_id}
                onValueChange={(v) => set("service_category_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Provider shop</Label>
              <Select value={draft.shop_id} onValueChange={(v) => set("shop_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shop" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sv-summary">Short summary</Label>
            <Input
              id="sv-summary"
              value={draft.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="One line shown on cards"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sv-desc">Description</Label>
            <Textarea
              id="sv-desc"
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Pricing</Label>
              <Select
                value={draft.pricing_type}
                onValueChange={(v) => set("pricing_type", v as "fixed" | "quote")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed price</SelectItem>
                  <SelectItem value="quote">Request quote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {draft.pricing_type === "fixed" ? (
              <div className="space-y-1.5">
                <Label htmlFor="sv-price">Price (ETB)</Label>
                <Input
                  id="sv-price"
                  type="number"
                  min={0}
                  value={draft.price}
                  onChange={(e) => set("price", e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="sv-start">Starting price (optional)</Label>
                <Input
                  id="sv-start"
                  type="number"
                  min={0}
                  value={draft.starting_price}
                  onChange={(e) => set("starting_price", e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="sv-unit">Price unit (optional)</Label>
              <Input
                id="sv-unit"
                value={draft.price_unit}
                onChange={(e) => set("price_unit", e.target.value)}
                placeholder="e.g. per guest"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="sv-lead">Booking lead time (hours)</Label>
              <Input
                id="sv-lead"
                type="number"
                min={0}
                value={draft.lead_time_hours}
                onChange={(e) => set("lead_time_hours", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sv-prep">Preparation hours (optional)</Label>
              <Input
                id="sv-prep"
                type="number"
                min={0}
                value={draft.preparation_hours}
                onChange={(e) => set("preparation_hours", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sv-area">Service area</Label>
              <Input
                id="sv-area"
                value={draft.service_area}
                onChange={(e) => set("service_area", e.target.value)}
                placeholder="Bishoftu"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sv-min">Min guests (optional)</Label>
              <Input
                id="sv-min"
                type="number"
                min={0}
                value={draft.min_guests}
                onChange={(e) => set("min_guests", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sv-max">Max guests (optional)</Label>
              <Input
                id="sv-max"
                type="number"
                min={0}
                value={draft.max_guests}
                onChange={(e) => set("max_guests", e.target.value)}
              />
            </div>
          </div>

          <ListEditor
            label="What's included"
            placeholder="e.g. Balloon arch, table styling"
            items={draft.includes}
            onChange={(v) => set("includes", v)}
          />

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Occasions</legend>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => {
                const active = draft.occasions.includes(o);
                return (
                  <button
                    type="button"
                    key={o}
                    onClick={() =>
                      set(
                        "occasions",
                        active ? draft.occasions.filter((x) => x !== o) : [...draft.occasions, o],
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label>Images</Label>
            <div className="flex flex-wrap gap-2">
              {draft.images.map((img) => (
                <div
                  key={img}
                  className="relative h-20 w-28 overflow-hidden rounded-lg border border-border"
                >
                  <StorageImage path={img} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        images: d.images.filter((x) => x !== img),
                        cover_url:
                          d.cover_url === img
                            ? (d.images.find((x) => x !== img) ?? null)
                            : d.cover_url,
                      }))
                    }
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-background/90 text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => set("cover_url", img)}
                    className={cn(
                      "absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-bold",
                      draft.cover_url === img
                        ? "bg-primary text-primary-foreground"
                        : "bg-background/90 text-foreground",
                    )}
                  >
                    {draft.cover_url === img ? "Cover" : "Set cover"}
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary/50">
                <ImagePlus className="h-4 w-4" />
                {uploading ? "Uploading…" : "Add"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => void onUpload(e.target.files)}
                />
              </label>
            </div>
          </div>

          {draft.id && (
            <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
              <Label>Optional add-ons</Label>
              {options.length > 0 && (
                <ul className="divide-y divide-border">
                  {options.map((o) => (
                    <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                      <span>{o.name}</span>
                      <span className="flex items-center gap-3">
                        <span className="font-semibold text-primary">
                          {Number(o.price_delta) === 0 ? "Free" : `+${ETB(o.price_delta)}`}
                        </span>
                        <button
                          type="button"
                          aria-label={`Delete ${o.name}`}
                          onClick={() => void deleteOption(o)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <Input
                  value={newOption.name}
                  onChange={(e) => setNewOption((n) => ({ ...n, name: e.target.value }))}
                  placeholder="Add-on name"
                  className="min-w-0 flex-1"
                />
                <Input
                  type="number"
                  value={newOption.price}
                  onChange={(e) => setNewOption((n) => ({ ...n, price: e.target.value }))}
                  placeholder="+ETB"
                  className="w-24"
                />
                <Button type="button" variant="outline" onClick={() => void addOption()}>
                  Add
                </Button>
              </div>
            </div>
          )}

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <ToggleRow
              label="Requires a date & time"
              checked={draft.requires_schedule}
              onChange={(v) => set("requires_schedule", v)}
            />
            <ToggleRow
              label="Requires a location"
              checked={draft.requires_location}
              onChange={(v) => set("requires_location", v)}
            />
            <ToggleRow
              label="Collect recipient details"
              checked={draft.requires_recipient}
              onChange={(v) => set("requires_recipient", v)}
            />
            <ToggleRow
              label="Offer “keep sender anonymous”"
              checked={draft.anonymous_option}
              onChange={(v) => set("anonymous_option", v)}
            />
            <ToggleRow
              label="Published"
              checked={draft.is_active}
              onChange={(v) => set("is_active", v)}
            />
            {draft.allow_featured !== false && (
              <ToggleRow
                label="Featured"
                checked={draft.is_featured}
                onChange={(v) => set("is_featured", v)}
              />
            )}
          </fieldset>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? "Saving…" : draft.id ? "Save changes" : "Create service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function ListEditor({
  label,
  placeholder,
  items,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (v: string[]) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((it) => (
            <li
              key={it}
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs"
            >
              {it}
              <button
                type="button"
                aria-label={`Remove ${it}`}
                onClick={() => onChange(items.filter((x) => x !== it))}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (value.trim()) {
                onChange([...items, value.trim()]);
                setValue("");
              }
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (value.trim()) {
              onChange([...items, value.trim()]);
              setValue("");
            }
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
