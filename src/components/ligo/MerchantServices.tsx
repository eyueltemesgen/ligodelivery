import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Clock, MapPin, Pencil, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  SERVICE_STATUS_LABEL,
  SERVICE_STATUS_TONE,
  serviceCategoriesQuery,
  shopAdminServicesQuery,
  shopServiceRequestsQuery,
  type ServiceRequest,
} from "@/lib/services";
import { ETB } from "@/lib/format";
import { supabaseErrorMessage } from "@/lib/supa-error";
import { ServiceEditor, emptyDraft, type ServiceDraft } from "@/components/ligo/ServiceEditor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NEXT_STATUS: Record<string, { to: string; label: string } | undefined> = {
  requested: { to: "reviewing", label: "Start reviewing" },
  reviewing: { to: "confirmed", label: "Confirm" },
  confirmed: { to: "preparing", label: "Start preparing" },
  preparing: { to: "scheduled", label: "Mark scheduled" },
  scheduled: { to: "in_progress", label: "Start service" },
  in_progress: { to: "completed", label: "Mark completed" },
};

export function MerchantServices({
  shopIds,
  shops,
}: {
  shopIds: string[];
  shops: { id: string; name: string }[];
}) {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery(serviceCategoriesQuery);
  const { data: services = [], isLoading } = useQuery(shopAdminServicesQuery(shopIds));
  const { data: requests = [] } = useQuery(shopServiceRequestsQuery(shopIds));
  const [editing, setEditing] = useState<ServiceDraft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeRequests = useMemo(
    () => requests.filter((r) => !["completed", "cancelled"].includes(r.status)),
    [requests],
  );

  const advance = async (request: ServiceRequest, to: string) => {
    setBusyId(request.id);
    try {
      const { error } = await supabase
        .from("service_requests")
        .update({ status: to })
        .eq("id", request.id);
      if (error) throw error;
      toast.success(`Moved to ${SERVICE_STATUS_LABEL[to] ?? to}`);
      await qc.invalidateQueries({ queryKey: ["shop-service-requests"] });
    } catch (err) {
      toast.error(supabaseErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">Your services</h2>
          {shops.length > 0 && (
            <Button
              size="sm"
              onClick={() =>
                setEditing({ ...emptyDraft(), shop_id: shops[0]!.id, allow_featured: false })
              }
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add service
            </Button>
          )}
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading services…</p>
        ) : services.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            You have not published any Special Moments services yet. Add catering, decoration, gifts
            or surprise packages to appear on የኔ Go.
          </p>
        ) : (
          <ul className="space-y-2">
            {services.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.service_categories?.name ?? "Service"} ·{" "}
                    {s.pricing_type === "quote" ? "Request quote" : ETB(s.price)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    s.is_active
                      ? "bg-primary-soft text-accent-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {s.is_active ? "Live" : "Archived"}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setEditing({
                      id: s.id,
                      shop_id: s.shop_id,
                      service_category_id: s.service_category_id,
                      name: s.name,
                      summary: s.summary ?? "",
                      description: s.description ?? "",
                      pricing_type: s.pricing_type,
                      price: s.price ? String(s.price) : "",
                      starting_price: s.starting_price ? String(s.starting_price) : "",
                      price_unit: s.price_unit ?? "",
                      preparation_hours: s.preparation_hours ? String(s.preparation_hours) : "",
                      lead_time_hours: s.lead_time_hours ? String(s.lead_time_hours) : "24",
                      min_guests: s.min_guests ? String(s.min_guests) : "",
                      max_guests: s.max_guests ? String(s.max_guests) : "",
                      service_area: s.service_area ?? "",
                      includes: s.includes ?? [],
                      occasions: s.occasions ?? [],
                      images: s.images ?? [],
                      cover_url: s.cover_url,
                      requires_location: s.requires_location,
                      requires_schedule: s.requires_schedule,
                      requires_recipient: s.requires_recipient,
                      anonymous_option: s.anonymous_option,
                      is_active: s.is_active,
                      is_featured: s.is_featured,
                      allow_featured: false,
                    })
                  }
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">
          Service requests ({activeRequests.length})
        </h2>
        {activeRequests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No open requests. New Special Moments requests appear here instantly.
          </p>
        ) : (
          activeRequests.map((r) => {
            const next = NEXT_STATUS[r.status];
            return (
              <article
                key={r.id}
                className="rounded-xl border border-border bg-card p-4 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 font-display font-bold">
                      {r.request_code}
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          SERVICE_STATUS_TONE[r.status] ?? "bg-secondary text-secondary-foreground",
                        )}
                      >
                        {SERVICE_STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </p>
                    <p className="text-sm">{r.service_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.customer_name ?? "Customer"} · {r.customer_phone ?? "—"}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {r.event_date && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" /> {r.event_date}
                        </span>
                      )}
                      {r.event_time && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {String(r.event_time).slice(0, 5)}
                        </span>
                      )}
                      {r.guest_count ? (
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {r.guest_count} guests
                        </span>
                      ) : null}
                      {r.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {r.location}
                        </span>
                      )}
                    </div>
                    {r.recipient_name && (
                      <p className="text-xs text-muted-foreground">
                        Recipient: {r.recipient_name} {r.recipient_phone ?? ""}
                        {r.keep_sender_anonymous ? " · sender hidden from recipient" : ""}
                      </p>
                    )}
                    {r.message && <p className="text-xs italic">“{r.message}”</p>}
                    {r.special_instructions && (
                      <p className="text-xs text-muted-foreground">{r.special_instructions}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-display text-lg font-bold">
                      {r.pricing_type === "quote"
                        ? r.quoted_amount
                          ? ETB(r.quoted_amount)
                          : "Quote"
                        : ETB(r.total)}
                    </span>
                    {r.pricing_type === "quote" && r.status === "reviewing" ? (
                      <span className="max-w-[10rem] text-right text-xs text-muted-foreground">
                        Awaiting the Ligo team to quote
                      </span>
                    ) : next ? (
                      <Button
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() => void advance(r, next.to)}
                      >
                        {busyId === r.id ? "Saving…" : next.label}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">No action needed</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {editing && (
        <ServiceEditor
          draft={editing}
          categories={categories}
          shops={shops}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await qc.invalidateQueries({ queryKey: ["shop-admin-services"] });
          }}
        />
      )}
    </div>
  );
}
