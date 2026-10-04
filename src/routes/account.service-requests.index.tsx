import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, MapPin, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  serviceRequestsQuery,
  servicesByIdsQuery,
  addonsTotal,
  type ServiceRequest,
  type ServiceRequestStatus,
} from "@/lib/special-moments";
import { occasionLabel } from "@/lib/service-catalog";
import { ETB, formatDate } from "@/lib/format";
import { AccountHeader } from "@/components/account/AccountShell";
import { AccountState, ErrorState, ListSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
  const { t } = useI18n();
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
            {serviceName ?? t("requests.serviceFallback")}
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
          {t(`reqStatus.${request.status}`)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {request.occasion && <span>{occasionLabel(t, request.occasion)}</span>}
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
            {t("requests.guests", { count: request.guest_count })}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {request.request_type === "quote" ? t("requests.quoteRequest") : t("requests.booking")}
        </span>
        <span className="font-display text-sm font-bold text-primary">
          {price != null
            ? ETB(price + addonsTotal(request.addons))
            : request.status === "quote_requested"
              ? t("requests.awaitingQuote")
              : "—"}
        </span>
      </div>
    </Link>
  );
}

const FILTERS: { id: "all" | "open" | "scheduled" | "completed"; labelKey: string }[] = [
  { id: "all", labelKey: "requests.filterAll" },
  { id: "open", labelKey: "requests.filterOpen" },
  { id: "scheduled", labelKey: "requests.filterScheduled" },
  { id: "completed", labelKey: "requests.filterCompleted" },
];

function ServiceRequestsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
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
      <AccountHeader title={t("requests.title")} description={t("requests.subtitle")} />

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
          title={data.length === 0 ? t("requests.none") : t("requests.noneInFilter")}
          description={data.length === 0 ? t("requests.noneDesc") : t("requests.noneInFilterDesc")}
          action={
            data.length === 0 ? (
              <Button asChild>
                <Link to="/special-moments">{t("requests.explore")}</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setFilter("all")}>
                {t("requests.showAll")}
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
