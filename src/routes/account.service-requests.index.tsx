import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, MapPin, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  REQUEST_STATUS_LABEL,
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
            {serviceName ?? "Special Moments service"}
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
          {REQUEST_STATUS_LABEL[request.status]}
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
            {request.guest_count} guests
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {request.request_type === "quote" ? "Quote request" : "Booking"}
        </span>
        <span className="font-display text-sm font-bold text-primary">
          {price != null
            ? ETB(price + addonsTotal(request.addons))
            : request.status === "quote_requested"
              ? "Awaiting quote"
              : "—"}
        </span>
      </div>
    </Link>
  );
}

const FILTERS: { id: "all" | "open" | "scheduled" | "completed"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "scheduled", label: "Scheduled" },
  { id: "completed", label: "Completed" },
];

function ServiceRequestsPage() {
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
      <AccountHeader
        title="Special Moments"
        description="Your gift, surprise, catering and decoration requests, quotes and scheduled services."
      />

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
              {f.label}
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
          title={data.length === 0 ? "No Special Moments yet" : "Nothing in this filter"}
          description={
            data.length === 0
              ? "Book a gift, surprise, catering or decoration service and it will appear here with its status."
              : "Try another filter to see more of your requests."
          }
          action={
            data.length === 0 ? (
              <Button asChild>
                <Link to="/special-moments">Explore Special Moments</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setFilter("all")}>
                Show all
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
