import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  Check,
  Clock,
  ImagePlus,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import {
  OCCASIONS,
  SERVICE_STATUSES,
  SERVICE_STATUS_LABEL,
  SERVICE_STATUS_TONE,
  adminServiceOptionsQuery,
  adminServiceRequestsQuery,
  adminServicesQuery,
  serviceCategoriesQuery,
  type ServiceOption,
  type ServiceRequest,
  type ServiceWithShop,
} from "@/lib/services";
import { shopsQuery } from "@/lib/queries";
import { ETB, formatDate } from "@/lib/format";
import { supabaseErrorMessage } from "@/lib/supa-error";
import { StorageImage, uploadImage } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ServiceEditor, emptyDraft, type ServiceDraft } from "@/components/ligo/ServiceEditor";
import { cn } from "@/lib/utils";

const TABS = ["services", "requests"] as const;
type AdminServicesTab = (typeof TABS)[number];

export const Route = createFileRoute("/admin/services")({
  validateSearch: (s: Record<string, unknown>) => {
    const out: { tab?: AdminServicesTab } = {};
    if (TABS.includes(s["tab"] as AdminServicesTab)) out.tab = s["tab"] as AdminServicesTab;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Special Moments — Ligo Admin" },
      {
        name: "description",
        content: "Manage surprise, gift, catering and decoration services and requests.",
      },
    ],
  }),
  component: AdminServicesPage,
});

function AdminServicesPage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold sm:text-2xl">Special Moments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Surprises, gifts, catering &amp; decoration services and customer requests.
          </p>
        </div>
      </div>
      <Tabs
        value={tab ?? "services"}
        onValueChange={(v) => void navigate({ search: { tab: v as AdminServicesTab } })}
        className="mt-5"
      >
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="services">
          <ServicesAdmin />
        </TabsContent>
        <TabsContent value="requests">
          <RequestsAdmin />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ===========================================================================
// Services catalogue

function ServicesAdmin() {
  const qc = useQueryClient();
  const { data: services = [], isLoading } = useQuery(adminServicesQuery);
  const { data: categories = [] } = useQuery(serviceCategoriesQuery);
  const { data: shops = [] } = useQuery(shopsQuery());
  const [editing, setEditing] = useState<ServiceDraft | null>(null);
  const [deleting, setDeleting] = useState<ServiceWithShop | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      services.filter((s) =>
        query.trim() ? s.name.toLowerCase().includes(query.trim().toLowerCase()) : true,
      ),
    [services, query],
  );

  const openNew = () => setEditing(emptyDraft());

  const openEdit = (s: ServiceWithShop) =>
    setEditing({
      id: s.id,
      shop_id: s.shop_id,
      service_category_id: s.service_category_id,
      name: s.name,
      summary: s.summary ?? "",
      description: s.description ?? "",
      pricing_type: s.pricing_type,
      price: s.price ? String(s.price) : "",
      starting_price: s.starting_price != null ? String(s.starting_price) : "",
      price_unit: s.price_unit ?? "",
      preparation_hours: s.preparation_hours != null ? String(s.preparation_hours) : "",
      lead_time_hours: String(s.lead_time_hours ?? 24),
      min_guests: s.min_guests != null ? String(s.min_guests) : "",
      max_guests: s.max_guests != null ? String(s.max_guests) : "",
      service_area: s.service_area ?? "",
      includes: Array.isArray(s.includes) ? s.includes : [],
      occasions: s.occasions ?? [],
      images: Array.isArray(s.images) ? s.images : [],
      cover_url: s.cover_url,
      requires_location: s.requires_location,
      requires_schedule: s.requires_schedule,
      requires_recipient: s.requires_recipient,
      anonymous_option: s.anonymous_option,
      is_active: s.is_active,
      is_featured: s.is_featured,
    });

  const toggleActive = async (s: ServiceWithShop): Promise<void> => {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !s.is_active })
      .eq("id", s.id);
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    toast.success(s.is_active ? "Service archived" : "Service published");
    void qc.invalidateQueries({ queryKey: ["admin-services"] });
    void qc.invalidateQueries({ queryKey: ["services"] });
  };

  const remove = async (): Promise<void> => {
    if (!deleting) return;
    const { error } = await supabase.from("services").delete().eq("id", deleting.id);
    setDeleting(null);
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    toast.success("Service deleted");
    void qc.invalidateQueries({ queryKey: ["admin-services"] });
    void qc.invalidateQueries({ queryKey: ["services"] });
  };

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services…"
            className="pl-9"
            aria-label="Search services"
          />
        </div>
        <Button onClick={openNew} disabled={shops.length === 0 || categories.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          New service
        </Button>
      </div>

      {shops.length === 0 && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          Add a shop first — every service belongs to a shop/provider.
        </p>
      )}

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading services…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-display text-lg font-bold">No services yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Create your first surprise, gift, catering or decoration service. It will appear on the
            Special Moments page as soon as it's published.
          </p>
          <Button className="mt-5" onClick={openNew} disabled={shops.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            New service
          </Button>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card"
            >
              <StorageImage
                path={s.cover_url ?? (Array.isArray(s.images) ? s.images[0] : null)}
                alt={s.name}
                className="h-32 w-full object-cover"
              />
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-sm font-bold">{s.name}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      s.is_active
                        ? "bg-primary-soft text-accent-foreground"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {s.is_active ? "Published" : "Archived"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.service_categories?.emoji} {s.service_categories?.name} · {s.shops?.name}
                </p>
                <p className="mt-2 text-sm font-semibold text-primary">
                  {s.pricing_type === "quote"
                    ? "Request quote"
                    : s.price
                      ? ETB(s.price)
                      : s.starting_price
                        ? `From ${ETB(s.starting_price)}`
                        : "No price"}
                </p>
                {s.is_featured && (
                  <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-warning-foreground">
                    <Star className="h-3 w-3 fill-warning text-warning" /> Featured
                  </span>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void toggleActive(s)}>
                    {s.is_active ? (
                      <>
                        <Archive className="mr-1.5 h-3.5 w-3.5" />
                        Archive
                      </>
                    ) : (
                      <>
                        <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />
                        Publish
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleting(s)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ServiceEditor
          draft={editing}
          categories={categories}
          shops={shops.map((s) => ({ id: s.id, name: s.name }))}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void qc.invalidateQueries({ queryKey: ["admin-services"] });
            void qc.invalidateQueries({ queryKey: ["services"] });
            void qc.invalidateQueries({ queryKey: ["service-categories"] });
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the service. Existing customer requests keep their own
              record. Prefer archiving if you may bring it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep service</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ===========================================================================
// Requests
// ===========================================================================

function RequestsAdmin() {
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery(adminServiceRequestsQuery);
  const [status, setStatus] = useState<string>("all");
  const [selected, setSelected] = useState<ServiceRequest | null>(null);

  const filtered = useMemo(
    () => (status === "all" ? requests : requests.filter((r) => r.status === status)),
    [requests, status],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of requests) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [requests]);

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatus("all")}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium",
            status === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          All ({requests.length})
        </button>
        {SERVICE_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium",
              status === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {SERVICE_STATUS_LABEL[s]}
            {counts[s] ? ` (${counts[s]})` : ""}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading requests…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-display text-lg font-bold">No requests here</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Customer bookings and quote requests will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r)}
              className="block w-full rounded-xl border border-border bg-card p-4 text-left shadow-card transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-bold">{r.service_name}</span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                        SERVICE_STATUS_TONE[r.status] ?? "bg-secondary",
                      )}
                    >
                      {SERVICE_STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    {r.pricing_type === "quote" && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                        Quote
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.request_code} · {r.customer_name ?? "Customer"} ·{" "}
                    {r.customer_phone ?? "no phone"} · {formatDate(r.created_at)}
                  </p>
                </div>
                <div className="text-right text-sm">
                  {r.quoted_amount != null ? (
                    <span className="font-bold text-primary">{ETB(r.quoted_amount)}</span>
                  ) : r.total > 0 ? (
                    <span className="font-bold">{ETB(r.total)}</span>
                  ) : (
                    <span className="text-muted-foreground">No price</span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {r.event_date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {r.event_date}
                  </span>
                )}
                {r.guest_count != null && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {r.guest_count}
                  </span>
                )}
                {r.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {r.location}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <RequestDialog
          request={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            void qc.invalidateQueries({ queryKey: ["admin-service-requests"] });
          }}
        />
      )}
    </>
  );
}

function RequestDialog({
  request,
  onClose,
  onSaved,
}: {
  request: ServiceRequest;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(request.status);
  const [quote, setQuote] = useState(
    request.quoted_amount != null ? String(request.quoted_amount) : "",
  );
  const [quoteNotes, setQuoteNotes] = useState(request.quoted_notes ?? "");
  const [adminNotes, setAdminNotes] = useState(request.admin_notes ?? "");
  const [scheduledAt, setScheduledAt] = useState(request.scheduled_at?.slice(0, 16) ?? "");
  const [busy, setBusy] = useState(false);

  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      const payload: TablesUpdate<"service_requests"> = {
        status,
        admin_notes: adminNotes.trim() || null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      };
      if (request.pricing_type === "quote") {
        const amount = quote ? Number(quote) : null;
        payload.quoted_amount = amount;
        payload.quoted_notes = quoteNotes.trim() || null;
        payload.quoted_at = amount != null ? new Date().toISOString() : null;
      }
      if (status === "completed") payload.completed_at = new Date().toISOString();
      if (status === "cancelled") payload.cancelled_at = new Date().toISOString();

      const { error } = await supabase
        .from("service_requests")
        .update(payload)
        .eq("id", request.id);
      if (error) throw error;
      toast.success("Request updated");
      onSaved();
    } catch (err) {
      toast.error(supabaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{request.service_name}</DialogTitle>
          <DialogDescription>
            {request.request_code} · {formatDate(request.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2">
            <Info icon={User} label="Customer" value={request.customer_name ?? "—"} />
            <Info icon={Phone} label="Phone" value={request.customer_phone ?? "—"} />
            <Info icon={CalendarDays} label="Event date" value={request.event_date ?? "—"} />
            <Info
              icon={Clock}
              label="Preferred time"
              value={request.event_time ? request.event_time.slice(0, 5) : "—"}
            />
            <Info icon={MapPin} label="Location" value={request.location ?? "—"} />
            <Info
              icon={Users}
              label="Guests"
              value={request.guest_count != null ? String(request.guest_count) : "—"}
            />
            <Info icon={Sparkles} label="Occasion" value={request.event_type ?? "—"} />
            <Info
              icon={Sparkles}
              label="Budget"
              value={request.budget != null ? ETB(request.budget) : "—"}
            />
            {request.recipient_name && (
              <Info
                icon={User}
                label="Recipient"
                value={`${request.recipient_name}${request.keep_sender_anonymous ? " (sender anonymous)" : ""}`}
              />
            )}
            {request.recipient_phone && (
              <Info icon={Phone} label="Recipient phone" value={request.recipient_phone} />
            )}
          </section>

          {request.message && (
            <div className="rounded-lg border border-border bg-surface p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Message</p>
              <p className="mt-1">{request.message}</p>
            </div>
          )}
          {request.special_instructions && (
            <div className="rounded-lg border border-border bg-surface p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Special instructions
              </p>
              <p className="mt-1">{request.special_instructions}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SERVICE_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-sched">Scheduled date &amp; time</Label>
              <Input
                id="req-sched"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          </div>

          {request.pricing_type === "quote" && (
            <div className="space-y-3 rounded-lg border border-primary/40 bg-primary-soft p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="req-quote">Quote amount (ETB)</Label>
                  <Input
                    id="req-quote"
                    type="number"
                    min={0}
                    value={quote}
                    onChange={(e) => setQuote(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="req-quote-notes">Quote notes</Label>
                  <Input
                    id="req-quote-notes"
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    placeholder="What's included"
                  />
                </div>
              </div>
              <p className="text-xs text-accent-foreground/90">
                Setting an amount and saving notifies the customer their quote is ready. They
                confirm it and pay through the existing checkout.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="req-admin-notes">Internal notes</Label>
            <Textarea
              id="req-admin-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
              placeholder="Fulfilment notes (not shown to the customer)"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            <Check className="mr-2 h-4 w-4" />
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold break-words">{value}</p>
      </div>
    </div>
  );
}
