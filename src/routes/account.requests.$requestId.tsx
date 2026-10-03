import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Lock,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  canCancelServiceRequest,
  serviceRequestItemsQuery,
  serviceRequestQuery,
  SERVICE_STATUS_LABEL,
} from "@/lib/services";
import { ETB, formatDate } from "@/lib/format";
import { supabaseErrorMessage } from "@/lib/supa-error";
import { AccountHeader } from "@/components/account/AccountShell";
import { ServiceRequestTimeline, ServiceStatusBadge } from "@/components/ligo/ServiceCards";
import { AccountState, ErrorState, ListSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/account/requests/$requestId")({
  head: () => ({
    meta: [{ title: "Request details — Special Moments | Yene Go" }],
  }),
  component: RequestDetail,
});

function RequestDetail() {
  const { requestId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const {
    data: request,
    isLoading,
    isError,
    refetch,
  } = useQuery(serviceRequestQuery(requestId, user?.id));
  const { data: items = [] } = useQuery(serviceRequestItemsQuery(requestId));
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel(`service-request-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_requests",
          filter: `id=eq.${requestId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["service-request", requestId] });
          void qc.invalidateQueries({ queryKey: ["service-requests"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [requestId, qc]);

  const acceptQuote = async () => {
    setBusy(true);
    try {
      const { data: orderId, error } = await supabase.rpc("accept_service_quote", {
        p_request_id: requestId,
      });
      if (error) throw error;
      toast.success("Quote confirmed — complete payment on your order");
      void qc.invalidateQueries({ queryKey: ["service-request", requestId] });
      void qc.invalidateQueries({ queryKey: ["account-orders"] });
      void qc.invalidateQueries({ queryKey: ["account-summary"] });
      if (orderId) {
        void navigate({
          to: "/account/orders/$orderId",
          params: { orderId: orderId as string },
        });
      }
    } catch (err) {
      toast.error(supabaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("cancel_service_request", { p_request_id: requestId });
      if (error) throw error;
      toast.success("Request cancelled");
      setCancelOpen(false);
      void qc.invalidateQueries({ queryKey: ["service-request", requestId] });
      void qc.invalidateQueries({ queryKey: ["service-requests"] });
      void qc.invalidateQueries({ queryKey: ["account-summary"] });
    } catch (err) {
      toast.error(supabaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="h-8 w-40 rounded bg-secondary" />
        <ListSkeleton rows={3} />
      </>
    );
  }
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!request)
    return (
      <AccountState
        icon={X}
        title="Request not found"
        description="This request doesn't exist or isn't linked to your account."
        action={
          <Button asChild>
            <Link to="/account/requests">Back to my requests</Link>
          </Button>
        }
      />
    );

  const isQuote = request.pricing_type === "quote";
  const quoteReady = request.status === "quoted" && request.quoted_amount != null;

  return (
    <>
      <Link
        to="/account/requests"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All requests
      </Link>

      <AccountHeader
        title={request.service_name}
        description={`${request.request_code} · requested ${formatDate(request.created_at)}`}
        action={<ServiceStatusBadge status={request.status} />}
      />

      {/* Quote callout */}
      {quoteReady && (
        <div className="rounded-xl border border-primary bg-primary-soft p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-accent-foreground">
                Your quote is ready
              </h2>
              <p className="mt-1 text-sm text-accent-foreground/90">
                Review the amount below. Confirming creates your order so you can complete payment
                with your preferred method.
              </p>
              {request.quoted_notes && (
                <p className="mt-2 rounded-lg bg-background/60 p-3 text-sm">
                  {request.quoted_notes}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-accent-foreground/80">Quoted</p>
              <p className="font-display text-2xl font-extrabold">{ETB(request.quoted_amount!)}</p>
            </div>
          </div>
          <Button
            className="mt-4 w-full sm:w-auto"
            onClick={() => void acceptQuote()}
            disabled={busy}
          >
            {busy ? "Confirming…" : "Accept quote & confirm"}
          </Button>
        </div>
      )}

      {request.order_id && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-primary" />
            An order was created for this request.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to="/account/orders/$orderId" params={{ orderId: request.order_id }}>
              View order
            </Link>
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-bold">Event & delivery details</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail icon={CalendarDays} label="Date" value={request.event_date ?? "—"} />
              <Detail
                icon={Clock}
                label="Preferred time"
                value={request.event_time ? request.event_time.slice(0, 5) : "—"}
              />
              <Detail icon={MapPin} label="Location" value={request.location ?? "—"} />
              <Detail
                icon={Users}
                label="Guests"
                value={request.guest_count != null ? String(request.guest_count) : "—"}
              />
              <Detail icon={Sparkles} label="Occasion" value={request.event_type ?? "—"} />
              {request.theme && <Detail icon={Sparkles} label="Theme" value={request.theme} />}
              {request.budget != null && (
                <Detail icon={Sparkles} label="Budget" value={ETB(request.budget)} />
              )}
            </dl>
          </section>

          {(request.recipient_name || request.recipient_phone) && (
            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="flex items-center gap-2 font-display text-base font-bold">
                Recipient
                {request.keep_sender_anonymous && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    You're anonymous
                  </span>
                )}
              </h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <Detail icon={Sparkles} label="Name" value={request.recipient_name ?? "—"} />
                <Detail icon={Phone} label="Phone" value={request.recipient_phone ?? "—"} />
              </dl>
            </section>
          )}

          {(request.message || request.special_instructions) && (
            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="flex items-center gap-2 font-display text-base font-bold">
                <MessageSquare className="h-4 w-4 text-primary" />
                Notes
              </h2>
              {request.message && (
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Message</p>
                  <p className="mt-1 text-sm">{request.message}</p>
                </div>
              )}
              {request.special_instructions && (
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Special instructions
                  </p>
                  <p className="mt-1 text-sm">{request.special_instructions}</p>
                </div>
              )}
            </section>
          )}

          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-bold">Summary</h2>
            <ul className="mt-3 divide-y divide-border text-sm">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-muted-foreground">{it.name}</span>
                  <span>{Number(it.unit_price) === 0 ? "Included" : ETB(it.unit_price)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="font-semibold">{isQuote ? "Quoted total" : "Estimated total"}</span>
              <span className="font-display text-lg font-bold">
                {isQuote
                  ? request.quoted_amount != null
                    ? ETB(request.quoted_amount)
                    : "Pending quote"
                  : ETB(request.total)}
              </span>
            </div>
            {!isQuote && (
              <p className="mt-2 text-xs text-muted-foreground">
                Payment method: {request.payment_method ?? "cash"}
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-bold">Progress</h2>
            <div className="mt-4">
              <ServiceRequestTimeline status={request.status} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Current status: {SERVICE_STATUS_LABEL[request.status] ?? request.status}
            </p>
          </section>

          {canCancelServiceRequest(request.status) && (
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setCancelOpen(true)}
              disabled={busy}
            >
              Cancel request
            </Button>
          )}
        </aside>
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
            <AlertDialogDescription>
              The provider will stop working on it. You can always make a new request later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep request</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void cancel();
              }}
              disabled={busy}
            >
              {busy ? "Cancelling…" : "Cancel request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Detail({
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
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="text-sm font-semibold break-words">{value}</dd>
      </div>
    </div>
  );
}
