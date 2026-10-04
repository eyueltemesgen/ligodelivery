import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, MapPin, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_LABEL_KEY,
  serviceRequestsQuery,
  servicesByIdsQuery,
  addonsTotal,
  type ServiceRequest,
  type ServiceRequestStatus,
} from "@/lib/special-moments";
import { ETB, formatDate } from "@/lib/format";
import { AccountHeader } from "@/components/account/AccountShell";
import { AccountState, ErrorState, ListSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

export const Route = createFileRoute("/account/service-requests/")({
  head: () => ({
    meta: [
      { title: "Special Moments — My account · የኔ Go" },
      {
        name: "description",
        content:
          "Track your gift, surprise, catering and decoration requests, quotes and scheduled services.",
      },
    ],
  }),
  component: ServiceRequestsPage,
});

const STATUS_TONE: Record<ServiceRequestStatus, string> = {
  submitted: "bg-secondary text-secondary-foreground",
  quote_requested: "bg-warning/20 text-warning-foreground",
  quoted: "bg-primary-soft text-accent-foreground",
  accepted: "bg-primary-soft text-accent-foreground",
  confirmed: "bg-primary-soft text-accent-foreground",
  completed: "bg-primary-soft text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export function ServiceRequestCard({
  request,
  serviceName,
}: {
  request: ServiceRequest;
  serviceName?: string | undefined;
}) {
  const { t } = useLanguage();
  const price = request.quote_amount;
  return (
    <Link
      to="/account/service-requests/$requestId"
      params={{ requestId: request.id }}
      className="block rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold">
            {serviceName ?? t("sr_service_fallback")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {request.request_code} · {formatDate(request.created_at)}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            STATUS_TONE[request.status],
          )}
        >
          {REQUEST_STATUS_LABEL_KEY[request.status] ? t(REQUEST_STATUS_LABEL_KEY[request.status]) : REQUEST_STATUS_LABEL[request.status]}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {request.occasion && <span>{request.occasion}</span>}
        {request.event_date && (
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date(request.event_date).toLocaleDateString("en-GB")}
            {request.event_time ? ` · ${request.event_time.slice(0, 5)}` : ""}
          </span>
        )}
        {request.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {request.location}
          </span>
        )}
        {request.guest_count != null && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {t("sr_guests", { count: request.guest_count })}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {request.request_type === "quote" ? t("sr_quote_request") : t("sr_booking")}
        </span>
        <span className="font-display text-sm font-bold text-primary">
          {price != null
            ? ETB(price + addonsTotal(request.addons))
            : request.status === "quote_requested"
              ? t("sr_awaiting_quote")
              : "—"}
        </span>
      </div>
    </Link>
  );
}

const FILTERS: {
  id: "all" | "open" | "scheduled" | "completed";
  labelKey: "sr_filter_all" | "sr_filter_open" | "sr_filter_scheduled" | "sr_filter_completed";
}[] = [
  { id: "all", labelKey: "sr_filter_all" },
  { id: "open", labelKey: "sr_filter_open" },
  { id: "scheduled", labelKey: "sr_filter_scheduled" },
  { id: "completed", labelKey: "sr_filter_completed" },
];

function ServiceRequestsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data = [], isLoading, isError, refetch } = useQuery(serviceRequestsQuery(user?.id));
  const serviceIds = useMemo(
    () => [...new Set(data.map((r) => r.service_id).filter(Boolean))] as string[],
    [data],
  );
  const { data: services = {} } = useQuery(servicesByIdsQuery(serviceIds));
  const [filter, setFilter] = useState<"all" | "open" | "scheduled" | "completed">("all");

  const filtered = data.filter((r) => {
    if (filter === "all") return true;
    if (filter === "open")
      return ["submitted", "quote_requested", "quoted", "accepted"].includes(r.status);
    if (filter === "scheduled") return r.status === "confirmed" || r.event_date != null;
    return r.status === "completed" || r.status === "cancelled";
  });

  return (
    <>
      <AccountHeader title={t("sr_index_title")} description={t("sr_index_desc")} />

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                filter === f.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <AccountState
          icon={Sparkles}
          title={data.length === 0 ? t("sr_empty_title") : t("sr_filter_empty_title")}
          description={
            data.length === 0 ? t("sr_empty_desc") : t("sr_filter_empty_desc")
          }
          action={
            data.length === 0 ? (
              <Button asChild>
                <Link to="/special-moments">{t("sr_explore")}</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setFilter("all")}>
                {t("sr_show_all")}
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <ServiceRequestCard
              key={r.id}
              request={r}
              serviceName={r.service_id ? services[r.service_id]?.name : undefined}
            />
          ))}
        </div>
      )}
    </>
  );
}
