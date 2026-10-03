import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  ImageOff,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isMissingTable, supabaseErrorMessage } from "@/lib/supa-error";
import { uploadImage } from "@/lib/media";
import { ETB, formatDate } from "@/lib/format";
import {
  OCCASIONS,
  HOLIDAY_OCCASIONS,
  REQUEST_STATUS_LABEL,
  type Service,
  type ServiceAddon,
  type ServiceCategory,
  type ServiceRequest,
  type ServiceRequestStatus,
} from "@/lib/special-moments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

const linesToArray = (s: string) =>
  s
    .split(/\r?\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);

const REQUEST_STATUS_OPTIONS: ServiceRequestStatus[] = [
  "submitted",
  "quote_requested",
  "quoted",
  "accepted",
  "confirmed",
  "completed",
  "cancelled",
];

/** Top-level Special Moments console embedded in the existing admin dashboard. */
export function SpecialMomentsAdmin() {
  return (
    <Tabs defaultValue="requests" className="mt-4">
      <TabsList className="h-auto w-max">
        <TabsTrigger value="requests">Requests</TabsTrigger>
        <TabsTrigger value="services">Services</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
      </TabsList>
      <TabsContent value="requests">
        <RequestsQueue />
      </TabsContent>
      <TabsContent value="services">
        <ServicesAdmin />
      </TabsContent>
      <TabsContent value="categories">
        <CategoriesAdmin />
      </TabsContent>
    </Tabs>
  );
}

/* ------------------------------------------------------------------ */
/* Requests                                                            */
/* ------------------------------------------------------------------ */

function RequestsQueue() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | ServiceRequestStatus>("all");
  const { data: requests = [], isError } = useQuery({
    queryKey: ["admin-service-requests"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        if (!isMissingTable(error)) console.warn(error);
        return [] as ServiceRequest[];
      }
      return (data ?? []) as ServiceRequest[];
    },
  });
  const { data: services = {} } = useQuery({
    queryKey: ["admin-services-map"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("id,name");
      const map: Record<string, string> = {};
      for (const s of data ?? []) map[s.id] = s.name;
      return map;
    },
  });

  const filtered =
    statusFilter === "all" ? requests : requests.filter((r) => r.status === statusFilter);

  if (isError) {
    return <p className="mt-4 text-sm text-muted-foreground">Could not load requests.</p>;
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium",
            statusFilter === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border",
          )}
        >
          All ({requests.length})
        </button>
        {REQUEST_STATUS_OPTIONS.map((s) => {
          const n = requests.filter((r) => r.status === s).length;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium",
                statusFilter === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border",
              )}
            >
              {REQUEST_STATUS_LABEL[s]} ({n})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requests in this view.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <RequestRow
              key={r.id}
              request={r}
              serviceName={r.service_id ? services[r.service_id] : undefined}
              onChanged={() => {
                void qc.invalidateQueries({ queryKey: ["admin-service-requests"] });
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestRow({
  request,
  serviceName,
  onChanged,
}: {
  request: ServiceRequest;
  serviceName?: string | undefined;
  onChanged: () => void;
}) {
  const [quote, setQuote] = useState(
    request.quote_amount != null ? String(request.quote_amount) : "",
  );
  const [notes, setNotes] = useState(request.admin_notes ?? "");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const review = async (status: ServiceRequestStatus) => {
    setBusy(true);
    try {
      const quoteAmount = quote.trim() === "" ? null : Number(quote);
      const { error } = await supabase.rpc("review_service_request", {
        p_request: request.id,
        p_status: status,
        ...(quoteAmount != null ? { p_quote_amount: quoteAmount } : {}),
        ...(notes ? { p_notes: notes } : {}),
      });
      if (error) throw error;
      toast.success(`Request marked ${status}`);
      onChanged();
    } catch (err) {
      toast.error(supabaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reveal = request.recipient_name ? `For ${request.recipient_name}` : null;

  return (
    <li className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold">
            {serviceName ?? "Unlinked service"}
            {request.is_anonymous && (
              <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase">
                Anonymous
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {request.request_code} ·{" "}
            {request.request_type === "quote" ? "Quote request" : "Booking"} ·{" "}
            {formatDate(request.created_at)}
          </p>
        </div>
        <Badge variant="secondary">{REQUEST_STATUS_LABEL[request.status]}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {request.occasion && <span>Occasion: {request.occasion}</span>}
        {(request.surprise_type || request.event_type) && (
          <span>Type: {request.surprise_type ?? request.event_type}</span>
        )}
        {request.event_date && (
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date(request.event_date).toLocaleDateString("en-GB")}
            {request.event_time ? ` · ${request.event_time.slice(0, 5)}` : ""}
          </span>
        )}
        {request.guest_count != null && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {request.guest_count} guests
          </span>
        )}
        {reveal && <span>{reveal}</span>}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 text-xs font-semibold text-primary"
      >
        {open ? "Hide details" : "Customer & event details"}
      </button>

      {open && (
        <div className="mt-3 space-y-2 rounded-lg bg-surface p-3 text-sm">
          <p>
            <span className="text-muted-foreground">Customer:</span> {request.customer_name ?? "—"}{" "}
            {request.customer_phone ? `· ${request.customer_phone}` : ""}
          </p>
          {request.location && (
            <p className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {request.location}
            </p>
          )}
          {request.recipient_phone && <p>Recipient phone: {request.recipient_phone}</p>}
          {request.theme && <p>Theme / colours: {request.theme}</p>}
          {request.food_preferences && <p>Food preferences: {request.food_preferences}</p>}
          {request.budget != null && <p>Budget: {ETB(request.budget)}</p>}
          {request.message && <p>Message: {request.message}</p>}
          {request.special_instructions && <p>Instructions: {request.special_instructions}</p>}
          {request.addons.length > 0 && (
            <p>Add-ons: {request.addons.map((a) => `${a.name} (${ETB(a.price)})`).join(", ")}</p>
          )}
          {request.order_id && <p className="text-primary">Order created for this request.</p>}
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-[140px_1fr]">
        <div className="space-y-1">
          <Label className="text-xs">Quote amount (ETB)</Label>
          <Input
            type="number"
            min={0}
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="0"
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Internal / customer note</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Visible to the customer"
            className="h-9"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => void review("quoted")}>
          Send quote
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void review("confirmed")}
        >
          Confirm
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void review("completed")}
        >
          Complete
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={busy}
          onClick={() => void review("cancelled")}
        >
          Cancel
        </Button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

function CategoriesAdmin() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-service-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("sort_order");
      if (error) {
        if (!isMissingTable(error)) console.warn(error);
        return [] as ServiceCategory[];
      }
      return (data ?? []) as ServiceCategory[];
    },
  });
  const [draft, setDraft] = useState({
    name: "",
    tagline: "",
    description: "",
    sort_order: "0",
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const image = file ? await uploadImage(file, "services/categories") : null;
      const { error } = await supabase.from("service_categories").insert({
        name: draft.name.trim(),
        slug: slugify(draft.name),
        tagline: draft.tagline.trim() || null,
        description: draft.description.trim() || null,
        image_url: image,
        sort_order: Number(draft.sort_order) || 0,
      });
      if (error) throw error;
      setDraft({ name: "", tagline: "", description: "", sort_order: "0" });
      setFile(null);
      void qc.invalidateQueries({ queryKey: ["admin-service-categories"] });
      void qc.invalidateQueries({ queryKey: ["service-categories"] });
      toast.success("Category created");
    } catch (err) {
      toast.error(supabaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: string, p: Record<string, unknown>) => {
    const { error } = await supabase
      .from("service_categories")
      .update(p as never)
      .eq("id", id);
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-service-categories"] });
    void qc.invalidateQueries({ queryKey: ["service-categories"] });
  };

  const remove = async (id: string, name: string) => {
    if (
      !window.confirm(`Delete category "${name}"? Services keep their data but lose this category.`)
    )
      return;
    const { error } = await supabase.from("service_categories").delete().eq("id", id);
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-service-categories"] });
    toast.success("Category deleted");
  };

  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[320px_1fr]">
      <form
        onSubmit={create}
        className="h-fit space-y-3 rounded-xl border border-border bg-card p-4 shadow-card"
      >
        <h3 className="font-display font-bold">New category</h3>
        <Input
          placeholder="Name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          required
        />
        <Input
          placeholder="Tagline"
          value={draft.tagline}
          onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
        />
        <Textarea
          placeholder="Description"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Sort order"
          value={draft.sort_order}
          onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
        />
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create category"}
        </Button>
      </form>

      <ul className="space-y-2">
        {rows.length === 0 && <li className="text-sm text-muted-foreground">No categories yet.</li>}
        {rows.map((c) => (
          <li key={c.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <Input
                  defaultValue={c.name}
                  className="h-9 max-w-xs"
                  onBlur={(e) =>
                    e.target.value !== c.name && void patch(c.id, { name: e.target.value })
                  }
                />
                <p className="mt-1 text-xs text-muted-foreground">/{c.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  defaultValue={c.sort_order}
                  className="h-9 w-20"
                  onBlur={(e) =>
                    Number(e.target.value) !== c.sort_order &&
                    void patch(c.id, { sort_order: Number(e.target.value) })
                  }
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Active
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={(v) => void patch(c.id, { is_active: v })}
                  />
                </label>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  aria-label={`Delete ${c.name}`}
                  onClick={() => void remove(c.id, c.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

type ServiceForm = {
  id?: string;
  name: string;
  slug: string;
  service_category_id: string;
  shop_id: string;
  occasion: string;
  pricing_type: "fixed" | "quote";
  price: string;
  starting_price: string;
  description: string;
  included_items: string;
  image_url: string | null;
  gallery: string;
  service_area: string;
  lead_time_hours: string;
  available_from: string;
  available_to: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: string;
};

const emptyForm = (): ServiceForm => ({
  name: "",
  slug: "",
  service_category_id: "",
  shop_id: "",
  occasion: "",
  pricing_type: "fixed",
  price: "",
  starting_price: "",
  description: "",
  included_items: "",
  image_url: null,
  gallery: "",
  service_area: "",
  lead_time_hours: "24",
  available_from: "",
  available_to: "",
  is_active: true,
  is_featured: false,
  sort_order: "0",
});

const toForm = (s: Service): ServiceForm => ({
  id: s.id,
  name: s.name,
  slug: s.slug,
  service_category_id: s.service_category_id ?? "",
  shop_id: s.shop_id ?? "",
  occasion: s.occasion ?? "",
  pricing_type: s.pricing_type,
  price: s.price != null ? String(s.price) : "",
  starting_price: s.starting_price != null ? String(s.starting_price) : "",
  description: s.description ?? "",
  included_items: (s.included_items ?? []).join("\n"),
  image_url: s.image_url,
  gallery: (s.gallery ?? []).join("\n"),
  service_area: s.service_area ?? "",
  lead_time_hours: String(s.lead_time_hours ?? 24),
  available_from: s.available_from ?? "",
  available_to: s.available_to ?? "",
  is_active: s.is_active,
  is_featured: s.is_featured,
  sort_order: String(s.sort_order ?? 0),
});

function ServicesAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ServiceForm | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: services = [] } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("sort_order");
      if (error) {
        if (!isMissingTable(error)) console.warn(error);
        return [] as Service[];
      }
      return (data ?? []) as Service[];
    },
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["admin-service-categories"],
    queryFn: async () =>
      ((await supabase.from("service_categories").select("*").order("sort_order")).data ??
        []) as ServiceCategory[],
  });
  const { data: shops = [] } = useQuery({
    queryKey: ["admin-shops-lite"],
    queryFn: async () => (await supabase.from("shops").select("id,name").order("name")).data ?? [],
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-services"] });
    void qc.invalidateQueries({ queryKey: ["services"] });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      let imageUrl = editing.image_url;
      if (imageFile) imageUrl = await uploadImage(imageFile, "services");
      const payload = {
        name: editing.name.trim(),
        slug: editing.slug.trim() || slugify(editing.name),
        service_category_id: editing.service_category_id || null,
        shop_id: editing.shop_id || null,
        occasion: editing.occasion.trim() || null,
        pricing_type: editing.pricing_type,
        price:
          editing.pricing_type === "fixed" && editing.price !== "" ? Number(editing.price) : null,
        starting_price: editing.starting_price !== "" ? Number(editing.starting_price) : null,
        description: editing.description.trim() || null,
        included_items: linesToArray(editing.included_items),
        image_url: imageUrl,
        gallery: linesToArray(editing.gallery),
        service_area: editing.service_area.trim() || null,
        lead_time_hours: Number(editing.lead_time_hours) || 0,
        available_from: editing.available_from || null,
        available_to: editing.available_to || null,
        is_active: editing.is_active,
        is_featured: editing.is_featured,
        sort_order: Number(editing.sort_order) || 0,
      };
      const { error } = editing.id
        ? await supabase
            .from("services")
            .update(payload as never)
            .eq("id", editing.id)
        : await supabase.from("services").insert(payload as never);
      if (error) throw error;
      toast.success(editing.id ? "Service updated" : "Service created");
      setEditing(null);
      setImageFile(null);
      invalidate();
    } catch (err) {
      toast.error(supabaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, p: Record<string, unknown>) => {
    const { error } = await supabase
      .from("services")
      .update(p as never)
      .eq("id", id);
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    invalidate();
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? Existing requests keep their record but lose the link.`))
      return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      const { error: deactivateError } = await supabase
        .from("services")
        .update({ is_active: false })
        .eq("id", id);
      if (deactivateError) {
        toast.error(supabaseErrorMessage(error));
        return;
      }
      toast.success("Referenced by orders — hidden from the app instead");
    } else {
      toast.success("Service deleted");
    }
    invalidate();
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold">Services</h3>
          <p className="text-sm text-muted-foreground">
            Gifts, surprises, holiday gifts, catering and decoration packages.
          </p>
        </div>
        <Button onClick={() => setEditing(emptyForm())}>
          <Plus className="mr-2 h-4 w-4" />
          New service
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <Sparkles className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-3 font-display font-bold">No services yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Create your first Special Moments service. It becomes visible in the app as soon as it
            is active — nothing is shown to customers before that.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {services.map((s) => (
            <ServiceAdminRow
              key={s.id}
              service={s}
              onEdit={() => setEditing(toForm(s))}
              onToggle={(p) => void toggle(s.id, p)}
              onDelete={() => void remove(s.id, s.name)}
            />
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto p-5 sm:w-full">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-extrabold">
              {editing?.id ? "Edit service" : "New service"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        name: e.target.value,
                        slug: editing.id ? editing.slug : slugify(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input
                    value={editing.slug}
                    onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                    placeholder="auto-generated"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={editing.service_category_id || "none"}
                    onValueChange={(v) =>
                      setEditing({ ...editing, service_category_id: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Uncategorised</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Provider (shop)</Label>
                  <Select
                    value={editing.shop_id || "none"}
                    onValueChange={(v) =>
                      setEditing({ ...editing, shop_id: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Link a shop" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No linked shop</SelectItem>
                      {shops.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Pricing</Label>
                  <Select
                    value={editing.pricing_type}
                    onValueChange={(v) =>
                      setEditing({ ...editing, pricing_type: v as "fixed" | "quote" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed price</SelectItem>
                      <SelectItem value="quote">Request a quote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Price (ETB)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                    disabled={editing.pricing_type !== "fixed"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Starting price</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.starting_price}
                    onChange={(e) => setEditing({ ...editing, starting_price: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Occasion</Label>
                  <Input
                    list="admin-sm-occasions"
                    value={editing.occasion}
                    onChange={(e) => setEditing({ ...editing, occasion: e.target.value })}
                    placeholder="e.g. Birthday, Holiday"
                  />
                  <datalist id="admin-sm-occasions">
                    {[...OCCASIONS, ...HOLIDAY_OCCASIONS].map((o) => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label>Service area</Label>
                  <Input
                    value={editing.service_area}
                    onChange={(e) => setEditing({ ...editing, service_area: e.target.value })}
                    placeholder="e.g. Bishoftu and nearby"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label>What&apos;s included (one per line)</Label>
                <Textarea
                  value={editing.included_items}
                  onChange={(e) => setEditing({ ...editing, included_items: e.target.value })}
                  rows={3}
                  placeholder={"Setup and delivery\nBalloons and flowers"}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Lead time (hours)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.lead_time_hours}
                    onChange={(e) => setEditing({ ...editing, lead_time_hours: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Available from</Label>
                  <Input
                    type="date"
                    value={editing.available_from}
                    onChange={(e) => setEditing({ ...editing, available_from: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Available to</Label>
                  <Input
                    type="date"
                    value={editing.available_to}
                    onChange={(e) => setEditing({ ...editing, available_to: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Main image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Gallery image paths (one per line, optional)</Label>
                <Textarea
                  value={editing.gallery}
                  onChange={(e) => setEditing({ ...editing, gallery: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex flex-wrap items-center gap-5">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={editing.is_active}
                    onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={editing.is_featured}
                    onCheckedChange={(v) => setEditing({ ...editing, is_featured: v })}
                  />
                  Featured
                </label>
                <div className="flex items-center gap-2 text-sm">
                  <Label className="text-xs">Sort</Label>
                  <Input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })}
                    className="h-8 w-20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : editing.id ? "Save changes" : "Create service"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ServiceAdminRow({
  service,
  onEdit,
  onToggle,
  onDelete,
}: {
  service: Service;
  onEdit: () => void;
  onToggle: (p: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [addonsOpen, setAddonsOpen] = useState(false);
  return (
    <li className="rounded-xl border border-border bg-card p-3 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold">{service.name}</p>
          <p className="text-xs text-muted-foreground">
            {service.pricing_type === "fixed"
              ? service.price != null
                ? ETB(service.price)
                : "No price set"
              : "Quote based"}
            {service.occasion ? ` · ${service.occasion}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Featured
            <Switch
              checked={service.is_featured}
              onCheckedChange={(v) => onToggle({ is_featured: v })}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Active
            <Switch
              checked={service.is_active}
              onCheckedChange={(v) => onToggle({ is_active: v })}
            />
          </label>
          <Button size="sm" variant="outline" onClick={() => setAddonsOpen((v) => !v)}>
            Add-ons
          </Button>
          <Button size="icon" variant="ghost" aria-label={`Edit ${service.name}`} onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            aria-label={`Delete ${service.name}`}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {addonsOpen && <AddonsEditor serviceId={service.id} />}
    </li>
  );
}

function AddonsEditor({ serviceId }: { serviceId: string }) {
  const qc = useQueryClient();
  const key = ["admin-service-addons", serviceId];
  const { data: addons = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_addons")
        .select("*")
        .eq("service_id", serviceId)
        .order("sort_order");
      if (error) {
        if (!isMissingTable(error)) console.warn(error);
        return [] as ServiceAddon[];
      }
      return (data ?? []) as ServiceAddon[];
    },
  });
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase.from("service_addons").insert({
      service_id: serviceId,
      name: name.trim(),
      price: Number(price) || 0,
    });
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    setName("");
    setPrice("");
    void qc.invalidateQueries({ queryKey: key });
    toast.success("Add-on added");
  };

  const remove = async (id: string) => {
    await supabase.from("service_addons").delete().eq("id", id);
    void qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="mt-3 rounded-lg bg-surface p-3">
      {addons.length === 0 ? (
        <p className="text-xs text-muted-foreground">No add-ons yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {addons.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {a.name} · <span className="text-muted-foreground">{ETB(a.price)}</span>
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                aria-label={`Remove ${a.name}`}
                onClick={() => void remove(a.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="mt-2 flex flex-wrap gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add-on name"
          className="h-9 max-w-[200px]"
        />
        <Input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price"
          className="h-9 w-28"
        />
        <Button size="sm" type="submit" variant="outline">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add
        </Button>
      </form>
    </div>
  );
}

/** Fallback tile used when a service list is empty in the admin console. */
export function NoServicesHint() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <ImageOff className="h-4 w-4" />
      No services to show.
    </div>
  );
}
