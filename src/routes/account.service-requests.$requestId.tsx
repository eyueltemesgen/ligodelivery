import { translations } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/lib/toast";
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
  REQUEST_STATUS_LABEL_KEY,
  acceptServiceQuote,
  addonsTotal,
  placeServiceOrder,
  serviceQuery,
  serviceRequestQuery,
  type ServiceRequestStatus,
} from "@/lib/special-moments";
import { ETB, formatDate } from "@/lib/format";
import { supabaseErrorText } from "@/lib/supa-error";
import { AccountHeader } from "@/components/account/AccountShell";
import { AccountState, CardSkeleton, ErrorState } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { StorageImage } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

export const Route = createFileRoute("/account/service-requests/$requestId")({
  head: () => ({
    meta: [
      { title: translations.en.asrd_meta_title },
      { name: "description", content: translations.en.asrd_meta_desc },
    ],
  }),
  component: RequestDetailPage,
});

const PAYMENT_METHODS = [
  { id: "cash", labelKey: "pay_cash" },
  { id: "mobile_money", labelKey: "pay_mobile_money" },
  { id: "telebirr", labelKey: "pay_telebirr" },
  { id: "cbe", labelKey: "pay_cbe" },
  { id: "chapa", labelKey: "pay_chapa" },
  { id: "boa", labelKey: "pay_boa" },
] as const;

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
  const { t } = useLanguage();
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
        title={t("sr_not_found")}
        description={t("sr_not_found_desc")}
        action={
          <Button asChild>
            <Link to="/account/service-requests">{t("sr_back_requests")}</Link>
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
      toast.success(t("sr_quote_accepted"));
      await qc.invalidateQueries({ queryKey: ["service-request", requestId] });
      await qc.invalidateQueries({ queryKey: ["service-requests"] });
    } catch (err) {
      toast.error(supabaseErrorText(t, err));
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
      toast.success(t("sr_order_placed"));
      await qc.invalidateQueries({ queryKey: ["service-request", requestId] });
      window.location.assign(`/orders/${orderId}`);
    } catch (err) {
      toast.error(supabaseErrorText(t, err));
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
        {t("sr_my_requests")}
      </Link>

      <AccountHeader
        title={service?.name ?? t("sr_request_fallback")}
        description={`${request.request_code} · ${
          isQuoteType ? t("sr_quote_request") : t("sr_booking")
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
                width={160}
                height={160}
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
                    {t("sr_view_service")}
                  </Link>
                </Button>
              </div>
            </div>
          )}

          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">{t("sr_request_details")}</h2>
            <div className="mt-2">
              <Row label={t("sr_occasion")} value={request.occasion} />
              <Row label={t("sr_type")} value={request.surprise_type ?? request.event_type} />
              <Row
                label={t("sr_date")}
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
                label={t("sr_time")}
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
                label={t("sr_location")}
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
                label={t("sr_guests_label")}
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
                label={t("sr_recipient")}
                value={
                  request.recipient_name
                    ? `${request.recipient_name}${request.is_anonymous ? t("sr_anonymous_sender") : ""}`
                    : null
                }
              />
              <Row
                label={t("sr_theme")}
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
                label={t("sr_food_prefs")}
                value={
                  request.food_preferences ? (
                    <span className="inline-flex items-center gap-1">
                      <UtensilsCrossed className="h-3.5 w-3.5" />
                      {request.food_preferences}
                    </span>
                  ) : null
                }
              />
              <Row
                label={t("sr_budget")}
                value={request.budget != null ? ETB(request.budget) : null}
              />
            </div>
            {request.message && (
              <div className="mt-3 rounded-lg bg-surface p-3 text-sm">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <MessageSquareHeart className="h-3.5 w-3.5" />
                  {t("sr_message")}
                </p>
                <p className="mt-1 whitespace-pre-line">{request.message}</p>
              </div>
            )}
            {request.special_instructions && (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("sr_instructions")} {request.special_instructions}
              </p>
            )}
            {request.admin_notes && (
              <div className="mt-3 rounded-lg border border-primary/30 bg-primary-soft/50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                  {t("sr_team_note")}
                </p>
                <p className="mt-1">{request.admin_notes}</p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">{t("sr_summary")}</h2>
            <div className="mt-2">
              <Row
                label={
                  request.quote_amount != null ? t("sr_accepted_quote") : t("sr_service_price")
                }
                value={
                  payableBase != null ? ETB(payableBase) : isQuoteType ? t("sr_pending_quote") : "—"
                }
              />
              {addons > 0 && <Row label={t("sr_addons")} value={ETB(addons)} />}
              <Row label={t("sr_estimated_total")} value={total != null ? ETB(total) : "—"} />
            </div>

            {request.order_id ? (
              <div className="mt-4 space-y-2">
                <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm font-medium text-accent-foreground">
                  {t("sr_paid_order")}
                </p>
                <Button asChild className="w-full">
                  <Link to="/orders/$orderId" params={{ orderId: request.order_id }}>
                    {t("sr_view_order")}
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
                {busy
                  ? t("sr_accepting")
                  : t("sr_accept_quote", { amount: ETB(request.quote_amount ?? 0) })}
              </Button>
            ) : canPay ? (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="mb-2 text-sm font-semibold">{t("sr_payment_method")}</p>
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
                        {t(m.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
                <Button className="w-full" size="lg" disabled={busy} onClick={() => void pay()}>
                  {busy ? t("sr_placing_order") : t("sr_continue_payment")}
                </Button>
              </div>
            ) : request.status === "quote_requested" ? (
              <p className="mt-4 rounded-lg bg-warning/15 px-3 py-2 text-sm text-warning-foreground">
                {t("sr_quote_with_team")}
              </p>
            ) : (
              <p className="mt-4 rounded-lg bg-surface px-3 py-2 text-sm text-muted-foreground">
                {t("sr_no_payment_due")}
              </p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 text-sm shadow-card">
            <h2 className="font-display text-base font-bold">{t("sr_status_history")}</h2>
            <p className="mt-2 text-muted-foreground">
              {REQUEST_STATUS_LABEL_KEY[request.status]
                ? t(REQUEST_STATUS_LABEL_KEY[request.status])
                : REQUEST_STATUS_LABEL[request.status]}{" "}
              · {t("sr_updated", { date: formatDate(request.updated_at) })}
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

function StatusPill({ status }: { status: ServiceRequestStatus }) {
  const { t } = useLanguage();
  return (
    <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
      {t(REQUEST_STATUS_LABEL_KEY[status])}
    </span>
  );
}
