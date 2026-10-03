import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  SERVICE_TABS,
  matchesServiceTab,
  serviceRequestsQuery,
  serviceTabCounts,
  type ServiceRequest,
  type ServiceTab,
} from "@/lib/services";
import { ETB, formatDate } from "@/lib/format";
import { AccountHeader } from "@/components/account/AccountShell";
import { ServiceStatusBadge } from "@/components/ligo/ServiceCards";
import { AccountState, ErrorState, ListSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/requests/")({
  head: () => ({
    meta: [
      { title: "Special moments — My requests | Yene Go" },
      {
        name: "description",
        content: "Track your surprise, gift, catering and decoration requests in one place.",
      },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ServiceTab>("all");
  const { data = [], isLoading, isError, refetch } = useQuery(serviceRequestsQuery(user?.id));

  const counts = useMemo(() => serviceTabCounts(data), [data]);
  const filtered = useMemo(() => data.filter((r) => matchesServiceTab(r, tab)), [data, tab]);

  return (
    <>
      <AccountHeader
        title="Special moments"
        description="Surprise, gift, catering and decoration requests you've made."
        action={
          <Button asChild variant="outline">
            <Link to="/special-moments">
              <Sparkles className="mr-2 h-4 w-4" />
              Browse services
            </Link>
          </Button>
        }
      />

      <div className="-mx-4 overflow-x-auto px-4">
        <div role="tablist" aria-label="Filter requests" className="flex w-max gap-2 pb-1">
          {SERVICE_TABS.map((t) => {
            const active = tab === t.id;
            const count = counts[t.id];
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40",
                )}
              >
                {t.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-bold",
                      active ? "bg-primary-foreground/20" : "bg-secondary",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <AccountState
          icon={Sparkles}
          title={data.length === 0 ? "No requests yet" : `No ${tab} requests`}
          description={
            data.length === 0
              ? "Plan a surprise, send a gift or book catering and decoration — your requests will show up here."
              : "Nothing matches this filter right now. Try another status."
          }
          action={
            data.length === 0 ? (
              <Button asChild>
                <Link to="/special-moments">Explore Special Moments</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setTab("all")}>
                Show all requests
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </>
  );
}

function RequestCard({ request }: { request: ServiceRequest }) {
  return (
    <Link
      to="/account/requests/$requestId"
      params={{ requestId: request.id }}
      className="block rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base font-bold">{request.service_name}</span>
            <ServiceStatusBadge status={request.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {request.request_code} · {formatDate(request.created_at)}
          </p>
        </div>
        <div className="text-right">
          {request.pricing_type === "quote" && request.quoted_amount != null ? (
            <>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quote</p>
              <p className="font-display font-bold text-primary">{ETB(request.quoted_amount)}</p>
            </>
          ) : request.total > 0 ? (
            <>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="font-display font-bold">{ETB(request.total)}</p>
            </>
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">Quote pending</span>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {request.event_date && (
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            {request.event_date}
            {request.event_time ? ` · ${request.event_time.slice(0, 5)}` : ""}
          </span>
        )}
        {request.guest_count != null && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-primary" />
            {request.guest_count} guests
          </span>
        )}
        {request.location && (
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{request.location}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
