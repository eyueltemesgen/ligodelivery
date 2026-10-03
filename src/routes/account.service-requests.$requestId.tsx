import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  MessageSquareHeart,
  Palette,
  Send,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  REQUEST_STATUS_LABEL,
  acceptServiceQuote,
  addonsTotal,
  placeServiceOrder,
  serviceQuery,
  serviceRequestQuery,
  type ServiceRequestStatus,
} from "@/lib/special-moments";
import { ETB, formatDate } from "@/lib/format";
import { supabaseErrorMessage } from "@/lib/supa-error";
import { AccountHeader } from "@/components/account/AccountShell";
import { AccountState, CardSkeleton, ErrorState } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { StorageImage } from "@/lib/media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/service-requests/$requestId")({
  head: () => ({
    meta: [
      { title: "Request details — Special Moments · የኔ Go" },
      { name: "description", content: "Review your Special Moments request, quote and booking." },
    ],
  }),
  component: RequestDetailPage,
});

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash on delivery" },
  { id: "mobile_money", label: "Mobile Money" },
  { id: "telebirr", label: "Telebirr" },
  { id: "cbe", label: "CBE Birr" },
  { id: "chapa", label: "Chapa" },
  { id: "boa", label: "Bank of Abyssinia" },
];

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function RequestDetailPage() {
  const { requestId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const {
    data: request,
    isLoading,
    isError,
    refetch,
  } = useQuery(serviceRequestQuery(requestId, user?.id));
  const { data: service } = useQuery(serviceQuery(request?.service_id ?? undefined));
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);

  if (isLoading) {
    return (
      <div className="container-ligo py-10">
        <CardSkeleton />
      </div>
    );
  }
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!request)
    return (
      <AccountState
        icon={Send}
        title="Request not found"
        description="This request may have been removed or belongs to another account."
        action={
          <Button asChild>
            <Link to="/account/service-requests">Back to my requests</Link>
          </Button>
        }
      />
    );

  const isQuoteType = request.request_type === "quote";
  const payableBase =
    request.quote_amount ?? (service?.pricing_type === "fixed" ? service.price : null);
  const addons = addonsTotal(request.addons);
  const total = payableBase != null ? payableBase + addons : null;
  const canPay =
    !request.order_id &&
    total != null &&
    (request.status === "submitted" ||
      request.status === "quote_requested" ||
      request.status === "accepted") &&
    (!isQuoteType || request.quote_amount != null);
  const canAccept = request.status === "quoted" && request.quote_amount != null;

  const accept = async () => {
    setBusy(true);
    try {
      await acceptServiceQuote(request.id);
      toast.success("Quote accepted — you can now complete payment.");
      await qc.invalidateQueries({ queryKey: ["service-request", requestId] });
      await qc.invalidateQueries({ queryKey: ["service-requests"] });
    } catch (err) {
      toast.error(supabaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    setBusy(true);
    try {
      const orderId = await placeServiceOrder(request.id, method, {
        name: request.customer_name ?? undefined,
        phone: request.customer_phone ?? undefined,
        address: request.location ?? undefined,
        instructions: request.special_instructions ?? undefined,
      });
      toast.success("Order placed — awaiting payment verification");
      await qc.invalidateQueries({ queryKey: ["service-request", requestId] });
      window.location.assign(`/orders/${orderId}`);
    } catch (err) {
      toast.error(supabaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link
        to="/account/service-requests"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        My requests
      </Link>

      <AccountHeader
        title={service?.name ?? "Special Moments request"}
        description={`${request.request_code} · ${
          isQuoteType ? "Quote request" : "Booking"
        } · ${formatDate(request.created_at)}`}
        action={<StatusPill status={request.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          {service && (
            <div className="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
              <StorageImage
                path={service.image_url}
                alt={service.name}
                className="h-20 w-20 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="font-display font-bold">{service.name}</p>
                {service.service_area && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {service.service_area}
                  </p>
                )}
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link to="/special-moments/service/$serviceId" params={{ serviceId: service.id }}>
                    View service
                  </Link>
                </Button>
              </div>
            </div>
          )}

          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">Request details</h2>
            <div className="mt-2">
              <Row label="Occasion" value={request.occasion} />
              <Row label="Type" value={request.surprise_type ?? request.event_type} />
              <Row
                label="Date"
                value={
                  request.event_date ? (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(request.event_date).toLocaleDateString("en-GB")}
                    </span>
                  ) : null
                }
              />
              <Row
                label="Time"
                value={
                  request.event_time ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {request.event_time.slice(0, 5)}
                    </span>
                  ) : null
                }
              />
              <Row
                label="Location"
                value={
                  request.location ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {request.location}
                    </span>
                  ) : null
                }
              />
              <Row
                label="Guests"
                value={
                  request.guest_count != null ? (
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {request.guest_count}
                    </span>
                  ) : null
                }
              />
              <Row
                label="Recipient"
                value={
                  request.recipient_name
                    ? `${request.recipient_name}${request.is_anonymous ? " (anonymous sender)" : ""}`
                    : null
                }
              />
              <Row
                label="Theme / colours"
                value={
                  request.theme ? (
                    <span className="inline-flex items-center gap-1">
                      <Palette className="h-3.5 w-3.5" />
                      {request.theme}
                    </span>
                  ) : null
                }
              />
              <Row
                label="Food preferences"
                value={
                  request.food_preferences ? (
                    <span className="inline-flex items-center gap-1">
                      <UtensilsCrossed className="h-3.5 w-3.5" />
                      {request.food_preferences}
                    </span>
                  ) : null
                }
              />
              <Row label="Budget" value={request.budget != null ? ETB(request.budget) : null} />
            </div>
            {request.message && (
              <div className="mt-3 rounded-lg bg-surface p-3 text-sm">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <MessageSquareHeart className="h-3.5 w-3.5" />
                  Message
                </p>
                <p className="mt-1 whitespace-pre-line">{request.message}</p>
              </div>
            )}
            {request.special_instructions && (
              <p className="mt-3 text-sm text-muted-foreground">
                Instructions: {request.special_instructions}
              </p>
            )}
            {request.admin_notes && (
              <div className="mt-3 rounded-lg border border-primary/30 bg-primary-soft/50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                  Note from our team
                </p>
                <p className="mt-1">{request.admin_notes}</p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">Summary</h2>
            <div className="mt-2">
              <Row
                label={request.quote_amount != null ? "Accepted quote" : "Service price"}
                value={payableBase != null ? ETB(payableBase) : isQuoteType ? "Pending quote" : "—"}
              />
              {addons > 0 && <Row label="Add-ons" value={ETB(addons)} />}
              <Row label="Estimated total" value={total != null ? ETB(total) : "—"} />
            </div>

            {request.order_id ? (
              <div className="mt-4 space-y-2">
                <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm font-medium text-accent-foreground">
                  Paid order created for this request.
                </p>
                <Button asChild className="w-full">
                  <Link to="/orders/$orderId" params={{ orderId: request.order_id }}>
                    View order
                  </Link>
                </Button>
              </div>
            ) : canAccept ? (
              <Button
                className="mt-4 w-full"
                size="lg"
                disabled={busy}
                onClick={() => void accept()}
              >
                {busy ? "Accepting…" : `Accept quote — ${ETB(request.quote_amount ?? 0)}`}
              </Button>
            ) : canPay ? (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="mb-2 text-sm font-semibold">Payment method</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setMethod(m.id)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left text-xs font-medium",
                          method === m.id ? "border-primary bg-primary-soft" : "border-border",
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Button className="w-full" size="lg" disabled={busy} onClick={() => void pay()}>
                  {busy ? "Placing order…" : "Continue to payment"}
                </Button>
              </div>
            ) : request.status === "quote_requested" ? (
              <p className="mt-4 rounded-lg bg-warning/15 px-3 py-2 text-sm text-warning-foreground">
                Your quote request is with our team. You will be notified when a quote is ready.
              </p>
            ) : (
              <p className="mt-4 rounded-lg bg-surface px-3 py-2 text-sm text-muted-foreground">
                No payment is due right now.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 text-sm shadow-card">
            <h2 className="font-display text-base font-bold">Status history</h2>
            <p className="mt-2 text-muted-foreground">
              {REQUEST_STATUS_LABEL[request.status]} · updated {formatDate(request.updated_at)}
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

function StatusPill({ status }: { status: ServiceRequestStatus }) {
  return (
    <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
      {REQUEST_STATUS_LABEL[status]}
    </span>
  );
}
