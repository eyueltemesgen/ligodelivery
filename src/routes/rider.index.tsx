import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  BadgeCheck,
  Bell,
  Bike,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  HelpCircle,
  Home,
  LogOut,
  MapPin,
  MessageSquare,
  Navigation,
  PackageCheck,
  Pencil,
  Phone,
  RefreshCw,
  Settings,
  Star,
  Store,
  TrendingUp,
  User,
  Wallet,
  WifiOff,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, type TranslationKey } from "@/lib/i18n";
import { RiderGate } from "@/components/auth/guards";
import { ETB, formatDate } from "@/lib/format";
import { uploadImage } from "@/lib/media";
import { IdentityAvatar } from "@/components/ligo/IdentityAvatar";
import { TierBadge } from "@/components/ligo/TierBadge";
import { publicSettingsQuery } from "@/lib/queries";
import { siteContentQuery } from "@/lib/content";
import { notificationsQuery, type NotificationRow } from "@/lib/account";
import { STATUS_LABEL_KEY, notify, type OrderStatus } from "@/lib/orders";
import { paymentLabelKey, paymentStatusLabelKey } from "@/components/account/OrderCard";
import { sounds, loadAudioSettings, primeAudio } from "@/lib/audio";
import { getRoute, formatDuration, haversineKm, type RouteQuote } from "@/lib/routing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const RiderTrackingMap = lazy(() => import("@/components/ligo/RiderTrackingMap"));

export const Route = createFileRoute("/rider/")({
  head: () => ({
    meta: [
      { title: translations.en.rider_meta_title },
      { name: "description", content: translations.en.rider_meta_desc },
      { property: "og:title", content: translations.en.rider_meta_og_title },
      { property: "og:description", content: translations.en.rider_meta_og_desc },
    ],
  }),
  component: RiderPortalPage,
});

function RiderPortalPage() {
  return (
    <RiderGate>
      <RiderPortal />
    </RiderGate>
  );
}

type OrderRow = {
  id: string;
  order_code: string;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  rider_payout: number;
  tip: number;
  discount: number;
  payment_method: string;
  payment_status: string;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_instructions: string | null;
  delivery_distance: number | null;
  delivery_duration_s: number | null;
  delivery_source: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  shop_id: string | null;
  dispatched_at: string | null;
};

type EarningRow = {
  id: string;
  amount: number;
  base_fare: number;
  tip: number;
  bonus: number;
  distance_km: number;
  distance_incentive: number;
  status: string;
  created_at: string;
};

type ShopRow = {
  name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
};

type Tab = "home" | "orders" | "earnings" | "notifications" | "profile";

const ORDER_SELECT =
  "id,order_code,status,total,subtotal,delivery_fee,rider_payout,tip,discount,payment_method,payment_status,customer_id,customer_name,customer_phone,delivery_address,delivery_instructions,delivery_distance,delivery_duration_s,delivery_source,lat,lng,created_at,shop_id,dispatched_at";

const AVATAR_DIM = { lg: "h-12 w-12 text-base", xl: "h-20 w-20 text-2xl" } as const;

/** How far along the delivery the order is (1 = heading to pickup … 4 = at customer). */
const stageOf = (status: string): 1 | 2 | 3 | 4 =>
  status === "accepted" ? 1 : status === "arrived_at_merchant" ? 2 : status === "picked_up" ? 3 : 4;

const riderPayoutOf = (order: OrderRow) =>
  Number(order.rider_payout) || Number(order.delivery_fee) + Number(order.tip ?? 0);

function RiderAvatar({
  path,
  name,
  size,
}: {
  path: string | null | undefined;
  name: string | null | undefined;
  size: "lg" | "xl";
}) {
  return <IdentityAvatar path={path} name={name} className={AVATAR_DIM[size]} />;
}

/** Shared shop lookup so the card, map and flow resolve the merchant once. */
function useOrderShop(shopId: string | null | undefined) {
  return useQuery<ShopRow | null>({
    queryKey: ["rider-shop", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase
        .from("shops")
        .select("name,address,lat,lng,phone")
        .eq("id", shopId!)
        .maybeSingle();
      return (data as ShopRow | null) ?? null;
    },
  });
}

const statusPill = (order: OrderRow, t: (k: TranslationKey) => string) => {
  const key = STATUS_LABEL_KEY[order.status as OrderStatus];
  return key ? t(key) : order.status;
};

/* ------------------------------------------------------------------ *
 * Header
 * ------------------------------------------------------------------ */

function RiderHeader({
  name,
  avatarUrl,
  rating,
  ratingCount,
  tier,
  vehicle,
  online,
  trips,
  unread,
  onNotifications,
  onAccount,
}: {
  name: string;
  avatarUrl: string | null | undefined;
  rating: number | null;
  ratingCount: number;
  tier: string | null | undefined;
  vehicle: string | null | undefined;
  online: boolean;
  trips: number;
  unread: number;
  onNotifications: () => void;
  onAccount: () => void;
}) {
  const { t } = useLanguage();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <div className="relative shrink-0">
          <RiderAvatar path={avatarUrl} name={name} size="lg" />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card",
              online ? "bg-primary" : "bg-muted-foreground",
            )}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold leading-tight">
            {name || t("rd_rider")}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {rating != null ? rating.toFixed(2) : "—"}
              {ratingCount > 0 && <span className="font-medium opacity-70">({ratingCount})</span>}
            </span>
            <TierBadge tier={tier} />
            {vehicle && (
              <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold capitalize text-secondary-foreground">
                <Bike className="h-3 w-3" />
                {t(VEHICLE_LABEL_KEY[vehicle] ?? "rd_motorcycle")}
              </span>
            )}
            {trips > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                {t("rd_trips", { count: trips })}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onNotifications}
          aria-label={t("rd_notifications")}
          className="relative rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onAccount}
          aria-label={t("rd_profile")}
          className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <User className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ *
 * Availability — the rider's primary control
 * ------------------------------------------------------------------ */

function AvailabilityCard({
  online,
  busy,
  onToggle,
  gps,
  onEnableLocation,
}: {
  online: boolean;
  busy: boolean;
  onToggle: (value: boolean) => void;
  gps: "unknown" | "ok" | "denied";
  onEnableLocation: () => void;
}) {
  const { t } = useLanguage();
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 shadow-card transition-colors",
        online ? "border-primary/30 bg-primary text-primary-foreground" : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("font-display text-lg font-extrabold", !online && "text-foreground")}>
            {online ? t("rd_status_online") : t("rd_status_offline")}
          </p>
          <p
            className={cn(
              "mt-0.5 text-sm",
              online ? "text-primary-foreground/90" : "text-muted-foreground",
            )}
          >
            {online ? t("rd_online_body") : t("rd_offline_body")}
          </p>
        </div>
        <span className="relative flex h-3.5 w-3.5 shrink-0" aria-hidden>
          {online && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground/70" />
          )}
          <span
            className={cn(
              "relative inline-flex h-3.5 w-3.5 rounded-full",
              online ? "bg-primary-foreground" : "bg-muted-foreground",
            )}
          />
        </span>
      </div>

      <Button
        size="lg"
        variant={online ? "secondary" : "default"}
        disabled={busy}
        onClick={() => onToggle(!online)}
        className={cn(
          "mt-4 h-13 w-full text-base font-extrabold",
          online && "bg-primary-foreground text-primary hover:bg-primary-foreground/90",
        )}
      >
        {online ? t("rd_go_offline") : t("rd_go_online")}
      </Button>

      {online && gps === "denied" && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-primary-foreground/15 p-3 text-xs">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{t("rd_gps_denied")}</p>
            <button
              type="button"
              onClick={onEnableLocation}
              className="mt-1.5 inline-flex items-center gap-1 font-bold underline underline-offset-2"
            >
              <RefreshCw className="h-3 w-3" /> {t("rd_enable_location")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Active delivery
 * ------------------------------------------------------------------ */

function DeliveryMap({
  order,
  riderLat,
  riderLng,
}: {
  order: OrderRow;
  riderLat: number | null;
  riderLng: number | null;
}) {
  const { t } = useLanguage();
  const { data: shop } = useOrderShop(order.shop_id);
  const stage = stageOf(order.status);
  const toPickup = stage <= 2;
  const destLat = (toPickup ? shop?.lat : order.lat) ?? order.lat ?? shop?.lat ?? null;
  const destLng = (toPickup ? shop?.lng : order.lng) ?? order.lng ?? shop?.lng ?? null;

  const [leg, setLeg] = useState<RouteQuote | null>(null);
  useEffect(() => {
    if (riderLat == null || riderLng == null || destLat == null || destLng == null) {
      setLeg(null);
      return;
    }
    let active = true;
    void getRoute(riderLat, riderLng, destLat, destLng, order.shop_id).then((r) => {
      if (active) setLeg(r);
    });
    return () => {
      active = false;
    };
  }, [riderLat, riderLng, destLat, destLng, order.shop_id]);

  const distanceKm = leg?.distanceKm ?? order.delivery_distance ?? null;
  const durationS = leg?.durationS || order.delivery_duration_s || 0;
  const estimated = leg ? leg.source !== "road" : order.delivery_source !== "road";

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Suspense
        fallback={<div className="h-56 w-full animate-pulse rounded-xl bg-surface" aria-hidden />}
      >
        {destLat != null && destLng != null ? (
          <RiderTrackingMap
            shopLat={toPickup ? null : (shop?.lat ?? null)}
            shopLng={toPickup ? null : (shop?.lng ?? null)}
            riderLat={riderLat}
            riderLng={riderLng}
            destLat={destLat}
            destLng={destLng}
            status={order.status}
          />
        ) : (
          <div className="grid h-56 place-items-center bg-surface text-sm text-muted-foreground">
            {t("rd_estimate_note")}
          </div>
        )}
      </Suspense>
      <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-3 py-2 text-xs">
        <span className="flex items-center gap-1.5 font-semibold">
          <Navigation className="h-3.5 w-3.5 text-primary" />
          {distanceKm != null ? `${distanceKm} km` : "—"}
          {estimated && (
            <span className="font-normal text-muted-foreground">· {t("rd_estimate_note")}</span>
          )}
        </span>
        {durationS > 0 && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {t("rd_eta")} {formatDuration(durationS)}
          </span>
        )}
      </div>
    </div>
  );
}

function ActiveDeliveryCard({
  order,
  riderLat,
  riderLng,
  onStatus,
  onView,
  onDeliver,
}: {
  order: OrderRow;
  riderLat: number | null;
  riderLng: number | null;
  onStatus: (s: OrderStatus) => void;
  onView: () => void;
  onDeliver: () => void;
}) {
  const { t } = useLanguage();
  const { data: shop } = useOrderShop(order.shop_id);
  const stage = stageOf(order.status);
  const pay = riderPayoutOf(order);
  const navigateUrl = (lat?: number | null, lng?: number | null) =>
    lat != null && lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : null;
  const navTo = stage <= 2 ? navigateUrl(shop?.lat, shop?.lng) : navigateUrl(order.lat, order.lng);

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-accent-foreground">
            <PackageCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("rd_active_delivery")}
            </p>
            <p className="font-display text-sm font-bold">{order.order_code}</p>
          </div>
        </div>
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-accent-foreground">
          {statusPill(order, t)}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <DeliveryMap order={order} riderLat={riderLat} riderLng={riderLng} />

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface p-3 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("rd_road_distance")}
            </p>
            <p className="font-display text-sm font-bold">
              {order.delivery_distance != null ? `${order.delivery_distance} km` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("rd_eta")}
            </p>
            <p className="font-display text-sm font-bold">
              {order.delivery_duration_s ? formatDuration(order.delivery_duration_s) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("rd_rider_earning")}
            </p>
            <p className="font-display text-sm font-bold text-primary">{ETB(pay)}</p>
          </div>
        </div>

        <div className="space-y-2.5 rounded-xl border border-border p-3">
          <p className="flex items-start gap-2 text-sm">
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">{t("rd_pickup")}</span>
              <span className="font-semibold">{shop?.name ?? t("rd_merchant")}</span>
              {shop?.address && (
                <span className="block truncate text-xs text-muted-foreground">{shop.address}</span>
              )}
            </span>
          </p>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">{t("rd_dropoff")}</span>
              <span className="font-semibold">{order.customer_name ?? t("rd_deliver_to")}</span>
              <span className="block text-xs text-muted-foreground">
                {order.delivery_address ?? "—"}
              </span>
            </span>
          </p>
          {order.delivery_instructions && (
            <p className="rounded-lg bg-surface p-2 text-xs">{order.delivery_instructions}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
            <span>
              {t("rd_order_value")}:{" "}
              <span className="font-semibold text-foreground">{ETB(order.total)}</span>
            </span>
            <span>
              {paymentLabelKey(order.payment_method)
                ? t(paymentLabelKey(order.payment_method)!)
                : order.payment_method}
            </span>
            <span>
              {paymentStatusLabelKey(order.payment_status)
                ? t(paymentStatusLabelKey(order.payment_status)!)
                : order.payment_status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {navTo ? (
            <Button variant="outline" size="sm" className="h-11" asChild>
              <a href={navTo} target="_blank" rel="noreferrer">
                <Navigation className="mr-1.5 h-4 w-4" />
                {stage <= 2 ? t("rd_pickup") : t("rd_dropoff")}
              </a>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-11" disabled>
              <Navigation className="mr-1.5 h-4 w-4" /> —
            </Button>
          )}
          {order.customer_phone ? (
            <Button variant="outline" size="sm" className="h-11" asChild>
              <a href={`tel:${order.customer_phone}`}>
                <Phone className="mr-1.5 h-4 w-4" /> {t("rd_call_customer")}
              </a>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-11" disabled>
              <Phone className="mr-1.5 h-4 w-4" /> —
            </Button>
          )}
          {order.customer_phone ? (
            <Button variant="outline" size="sm" className="h-11" asChild>
              <a href={`sms:${order.customer_phone}`}>
                <MessageSquare className="mr-1.5 h-4 w-4" /> {t("rd_message_customer")}
              </a>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-11" disabled>
              <MessageSquare className="mr-1.5 h-4 w-4" /> —
            </Button>
          )}
        </div>

        <StageAction order={order} onStatus={onStatus} onDeliver={onDeliver} />

        <Button variant="ghost" size="sm" className="w-full" onClick={onView}>
          {t("rd_view_delivery")} <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

/** The single contextual primary action for the order's current stage. */
function StageAction({
  order,
  onStatus,
  onDeliver,
}: {
  order: OrderRow;
  onStatus: (s: OrderStatus) => void;
  onDeliver: () => void;
}) {
  const { t } = useLanguage();
  const stage = stageOf(order.status);
  if (stage === 1)
    return (
      <Button
        size="lg"
        className="h-14 w-full text-base font-extrabold"
        onClick={() => onStatus("arrived_at_merchant")}
      >
        {t("rd_arrived")}
      </Button>
    );
  if (stage === 2)
    return (
      <Button
        size="lg"
        className="h-14 w-full text-base font-extrabold"
        onClick={() => onStatus("picked_up")}
      >
        {t("rd_mark_picked_up")}
      </Button>
    );
  if (stage === 3)
    return (
      <Button
        size="lg"
        className="h-14 w-full text-base font-extrabold"
        onClick={() => onStatus("on_the_way")}
      >
        {t("rd_go_to_customer")}
      </Button>
    );
  return (
    <Button size="lg" className="h-14 w-full text-base font-extrabold" onClick={onDeliver}>
      {t("rd_mark_delivered")}
    </Button>
  );
}

/* ------------------------------------------------------------------ *
 * Idle state + performance
 * ------------------------------------------------------------------ */

function IdleState({
  online,
  todayTotal,
  trips,
  distanceKm,
  avgPerTrip,
  availableCount,
  area,
  onBrowse,
}: {
  online: boolean;
  todayTotal: number;
  trips: number;
  distanceKm: number;
  avgPerTrip: number | null;
  availableCount: number;
  area: string;
  onBrowse: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5 text-center shadow-card">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-accent-foreground">
          <Bike className="h-7 w-7" />
        </span>
        <p className="mt-3 font-display text-lg font-extrabold">
          {t("rd_ready")} <span aria-hidden>🚴</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("rd_no_active_delivery")}</p>
        <p className="text-sm text-muted-foreground">{t("rd_looking_nearby")}</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 font-medium">
            <MapPin className="h-3.5 w-3.5 text-primary" /> {area}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold",
              online ? "bg-primary-soft text-accent-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                online ? "animate-pulse bg-primary" : "bg-muted-foreground",
              )}
            />
            {online ? t("rd_searching") : t("rd_status_offline")}
          </span>
        </div>
        {online && availableCount > 0 && (
          <Button className="mt-4 w-full" size="lg" onClick={onBrowse}>
            {t("rd_orders_available", { count: availableCount })}
          </Button>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("rd_today_earnings")} value={ETB(todayTotal)} accent />
        <StatCard label={t("rd_trips_count")} value={String(trips)} />
        <StatCard
          label={t("rd_distance_covered")}
          value={`${Math.round(distanceKm * 10) / 10} km`}
        />
        <StatCard label={t("rd_avg_per_trip")} value={avgPerTrip != null ? ETB(avgPerTrip) : "—"} />
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-card",
        accent ? "border-primary/30 bg-primary-soft" : "border-border bg-card",
      )}
    >
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-extrabold">{value}</p>
    </div>
  );
}

function PerformanceCard({
  rating,
  ratingCount,
  trips,
  distanceKm,
}: {
  rating: number | null;
  ratingCount: number;
  trips: number;
  distanceKm: number;
}) {
  const { t } = useLanguage();
  const rows: [string, string][] = [
    [t("rd_rating"), rating != null ? `${rating.toFixed(2)} (${ratingCount})` : "—"],
    [t("rd_trips_completed"), String(trips)],
    [t("rd_distance_covered"), `${Math.round(distanceKm * 10) / 10} km`],
    [t("rd_on_time"), "—"],
    [t("rd_acceptance_rate"), "—"],
  ];
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <h2 className="flex items-center gap-2 font-display text-base font-bold">
        <TrendingUp className="h-4 w-4 text-primary" /> {t("rd_your_performance")}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-surface p-3">
            <dt className="text-[11px] text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 font-display text-sm font-bold">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Delivery requests
 * ------------------------------------------------------------------ */

function DeliveryRequestCard({
  order,
  onAccept,
  onDecline,
}: {
  order: OrderRow;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useLanguage();
  const { data: shop } = useOrderShop(order.shop_id);
  const distanceKm =
    shop?.lat != null && shop?.lng != null && order.lat != null && order.lng != null
      ? Math.round(haversineKm(shop.lat, shop.lng, order.lat, order.lng) * 100) / 100
      : order.delivery_distance;
  const eta = distanceKm != null ? Math.max(Math.round((distanceKm / 25) * 60), 3) : null;
  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-primary-soft px-4 py-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-accent-foreground">
          {t("rd_new_delivery")}
        </span>
        <span className="font-display text-sm font-extrabold text-primary">
          {ETB(riderPayoutOf(order))}
        </span>
      </div>
      <div className="space-y-2.5 p-4">
        <p className="flex items-start gap-2 text-sm">
          <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">{t("rd_pickup")}</span>
            <span className="font-semibold">{shop?.name ?? t("rd_merchant")}</span>
            {shop?.address && (
              <span className="block truncate text-xs text-muted-foreground">{shop.address}</span>
            )}
          </span>
        </p>
        <p className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">{t("rd_deliver_to")}</span>
            <span className="font-semibold">{order.delivery_address ?? "—"}</span>
          </span>
        </p>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface p-3 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("rd_distance")}
            </p>
            <p className="font-display text-sm font-bold">
              {distanceKm != null ? `${distanceKm} km` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("rd_est_time")}
            </p>
            <p className="font-display text-sm font-bold">{eta != null ? `${eta} min` : "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("rd_order_value")}
            </p>
            <p className="font-display text-sm font-bold">{ETB(order.total)}</p>
          </div>
        </div>
        {Number(order.tip) > 0 && (
          <p className="rounded-lg bg-primary-soft p-2 text-center text-xs font-semibold text-accent-foreground">
            {t("rd_tip_included", { amount: ETB(order.tip) })}
          </p>
        )}
        <p className="text-center text-[11px] text-muted-foreground">{t("rd_estimated_earning")}</p>
        <div className="flex gap-2">
          <Button size="lg" className="h-12 flex-1 font-extrabold" onClick={onAccept}>
            {t("rd_accept")}
          </Button>
          <Button size="lg" variant="outline" className="h-12" onClick={onDecline}>
            {t("rd_decline")}
          </Button>
        </div>
      </div>
    </li>
  );
}

function IncomingOrderModal({
  order,
  onAccept,
  onDecline,
}: {
  order: OrderRow;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useLanguage();
  const [secondsLeft, setSecondsLeft] = useState(15);
  const declinedRef = useRef(false);
  const { data: shop } = useOrderShop(order.shop_id);

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0 && !declinedRef.current) {
      declinedRef.current = true;
      onDecline();
    }
  }, [secondsLeft, onDecline]);

  const distanceKm =
    shop?.lat != null && shop?.lng != null && order.lat != null && order.lng != null
      ? Math.round(haversineKm(shop.lat, shop.lng, order.lat, order.lng) * 100) / 100
      : order.delivery_distance;
  const etaMins = distanceKm != null ? Math.max(Math.round((distanceKm / 25) * 60), 3) : null;
  const pct = Math.max(secondsLeft / 15, 0);
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-display text-lg font-extrabold">{t("rd_new_request")}</p>
        <button
          type="button"
          onClick={onDecline}
          aria-label={t("rd_decline")}
          className="rounded-md p-1.5 hover:bg-secondary"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6">
        <div className="relative">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={R} fill="none" stroke="#e2e8f0" strokeWidth="6" />
            <circle
              cx="36"
              cy="36"
              r={R}
              fill="none"
              stroke={secondsLeft <= 5 ? "#dc2626" : "#059669"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              transform="rotate(-90 36 36)"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-extrabold">
            {Math.max(secondsLeft, 0)}
          </span>
        </div>

        <div className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <span className="block text-xs text-muted-foreground">{t("rd_pickup")}</span>
              <span className="font-semibold">{shop?.name ?? t("rd_merchant")}</span>
              {shop?.address && (
                <span className="block text-xs text-muted-foreground">{shop.address}</span>
              )}
            </span>
          </p>
          <p className="flex items-start gap-2 text-sm">
            <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <span className="block text-xs text-muted-foreground">{t("rd_deliver_to")}</span>
              <span className="font-semibold">{order.delivery_address}</span>
            </span>
          </p>
          <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">{t("rd_distance")}</p>
              <p className="font-display font-bold">
                {distanceKm != null ? `${distanceKm} km` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("rd_est_time")}</p>
              <p className="font-display font-bold">{etaMins != null ? `${etaMins} min` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("rd_you_earn")}</p>
              <p className="font-display font-bold text-primary">{ETB(riderPayoutOf(order))}</p>
            </div>
          </div>
          {Number(order.tip) > 0 && (
            <p className="rounded-lg bg-primary-soft p-2 text-center text-xs font-semibold text-accent-foreground">
              {t("rd_tip_included", { amount: ETB(order.tip) })}
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("rd_expires_in", { seconds: Math.max(secondsLeft, 0) })}
        </p>
      </div>
      <div className="space-y-2 border-t border-border bg-card p-4">
        <Button size="lg" className="h-14 w-full text-base font-extrabold" onClick={onAccept}>
          {t("rd_accept_order")}
        </Button>
        <Button size="lg" variant="outline" className="w-full" onClick={onDecline}>
          {t("rd_decline")}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Delivery flow (detail sheet)
 * ------------------------------------------------------------------ */

/** PIN confirmation, shared by the stage-4 flow and the quick "delivered" sheet. */
function PinForm({ orderId, onDone }: { orderId: string; onDone?: () => void }) {
  const { t } = useLanguage();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const complete = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("complete_delivery", {
      _order_id: orderId,
      _pin: pin.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("rd_delivered"));
    setPin("");
    onDone?.();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("rd_pin_hint")}</p>
      <input
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        placeholder="••••"
        className="h-14 w-full rounded-xl border border-input bg-background text-center font-display text-2xl font-extrabold tracking-[0.5em] outline-none focus:border-primary"
      />
      <Button
        size="lg"
        className="h-14 w-full text-base font-extrabold"
        disabled={busy || pin.length < 4}
        onClick={() => void complete()}
      >
        {busy ? t("rd_completing") : t("rd_complete_delivery")}
      </Button>
    </div>
  );
}

function DeliveryFlow({
  order,
  onStatus,
}: {
  order: OrderRow;
  onStatus: (s: OrderStatus) => void;
}) {
  const { t } = useLanguage();
  const { data: shop } = useOrderShop(order.shop_id);

  const { data: items = [] } = useQuery({
    queryKey: ["rider-flow-items", order.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_items")
        .select("id,product_name,quantity,unit_price")
        .eq("order_id", order.id);
      return data ?? [];
    },
  });

  const navigateUrl = (lat?: number | null, lng?: number | null) =>
    lat != null && lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : null;

  const stage = stageOf(order.status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card">
        <div>
          <p className="font-display font-bold">{order.order_code}</p>
          <p className="text-xs text-muted-foreground">
            {ETB(order.total)} ·{" "}
            {paymentLabelKey(order.payment_method)
              ? t(paymentLabelKey(order.payment_method)!)
              : order.payment_method}{" "}
            ·{" "}
            {paymentStatusLabelKey(order.payment_status)
              ? t(paymentStatusLabelKey(order.payment_status)!)
              : order.payment_status}
          </p>
        </div>
        <p className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-accent-foreground">
          {statusPill(order, t)}
        </p>
      </div>

      <ol className="flex items-center gap-1">
        {[1, 2, 3, 4].map((s) => (
          <li
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= stage ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </ol>

      {stage === 1 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="font-display text-lg font-bold">{t("rd_stage1")}</p>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <span className="font-semibold">{shop?.name ?? t("rd_merchant")}</span>
              {shop?.address && <span className="block text-muted-foreground">{shop.address}</span>}
            </span>
          </p>
          {navigateUrl(shop?.lat, shop?.lng) && (
            <Button variant="outline" className="w-full" asChild>
              <a href={navigateUrl(shop?.lat, shop?.lng)!} target="_blank" rel="noreferrer">
                <Navigation className="mr-2 h-4 w-4" /> {t("rd_navigate")}
              </a>
            </Button>
          )}
          <Button
            size="lg"
            className="h-14 w-full text-base font-extrabold"
            onClick={() => onStatus("arrived_at_merchant")}
          >
            {t("rd_arrived")}
          </Button>
        </div>
      )}

      {stage === 2 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="font-display text-lg font-bold">{t("rd_stage2")}</p>
          <ul className="space-y-2">
            {items.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <span>
                  {i.quantity}× {i.product_name}
                </span>
                <PackageCheck className="h-4 w-4 text-primary" />
              </li>
            ))}
          </ul>
          <Button
            size="lg"
            className="h-14 w-full text-base font-extrabold"
            onClick={() => onStatus("picked_up")}
          >
            {t("rd_picked")}
          </Button>
        </div>
      )}

      {stage === 3 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="font-display text-lg font-bold">{t("rd_stage3")}</p>
          <p className="text-sm">
            <span className="font-semibold">{order.customer_name}</span>
            <span className="block text-muted-foreground">{order.delivery_address}</span>
            {order.delivery_instructions && (
              <span className="mt-1 block rounded-lg bg-surface p-2 text-xs">
                {order.delivery_instructions}
              </span>
            )}
          </p>
          {order.customer_phone && (
            <Button variant="outline" className="w-full" asChild>
              <a href={`tel:${order.customer_phone}`}>
                <Phone className="mr-2 h-4 w-4" /> {t("rd_call_customer")}
              </a>
            </Button>
          )}
          {navigateUrl(order.lat, order.lng) && (
            <Button variant="outline" className="w-full" asChild>
              <a href={navigateUrl(order.lat, order.lng)!} target="_blank" rel="noreferrer">
                <Navigation className="mr-2 h-4 w-4" /> {t("rd_navigate_customer")}
              </a>
            </Button>
          )}
          <Button
            size="lg"
            className="h-14 w-full text-base font-extrabold"
            onClick={() => onStatus("on_the_way")}
          >
            {t("rd_on_the_way")}
          </Button>
        </div>
      )}

      {stage === 4 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="font-display text-lg font-bold">{t("rd_stage4")}</p>
          <PinForm orderId={order.id} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Deliveries tab
 * ------------------------------------------------------------------ */

function OrdersTab({
  available,
  active,
  online,
  onAccept,
  onDecline,
  onOpenTrip,
}: {
  available: OrderRow[];
  active: OrderRow[];
  online: boolean;
  onAccept: (o: OrderRow) => void;
  onDecline: (o: OrderRow) => void;
  onOpenTrip: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-5">
      {active.length > 0 && (
        <div>
          <h2 className="font-display text-base font-bold">{t("rd_active_delivery")}</h2>
          <ul className="mt-2 space-y-2">
            {active.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary-soft p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{o.order_code}</p>
                  <p className="text-xs text-muted-foreground">{statusPill(o, t)}</p>
                </div>
                <Button size="sm" onClick={onOpenTrip}>
                  {t("rd_resume_trip")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h2 className="font-display text-base font-bold">{t("rd_available_orders")}</h2>
        {!online ? (
          <p className="mt-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            {t("rd_go_online_hint")}
          </p>
        ) : available.length === 0 ? (
          <p className="mt-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            {t("rd_no_orders")}
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {available.map((o) => (
              <DeliveryRequestCard
                key={o.id}
                order={o}
                onAccept={() => onAccept(o)}
                onDecline={() => onDecline(o)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Earnings tab
 * ------------------------------------------------------------------ */

const startOfWeek = (d: Date) => {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return new Date(day.getTime() - ((day.getDay() + 6) % 7) * 86400000);
};

const WALLET_PERIODS = [
  { key: "day", labelKey: "rd_today" as const },
  { key: "week", labelKey: "rd_this_week" as const },
  { key: "month", labelKey: "rd_this_month" as const },
] as const;

type WalletPeriod = (typeof WALLET_PERIODS)[number]["key"];

function EarningsTab({
  earnings,
  payouts,
  userId,
}: {
  earnings: EarningRow[];
  payouts: {
    id: string;
    amount: number;
    status: string;
    created_at: string;
    processed_at: string | null;
  }[];
  userId: string;
}) {
  const qc = useQueryClient();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<WalletPeriod>("day");

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const sum = (
    list: EarningRow[],
    key: "amount" | "base_fare" | "tip" | "bonus" | "distance_incentive",
  ) => list.reduce((s, e) => s + Number(e[key]), 0);
  const inRange = (from: Date) => earnings.filter((e) => new Date(e.created_at) >= from);

  const periodStart = period === "day" ? dayStart : period === "week" ? weekStart : monthStart;
  const inPeriod = inRange(periodStart);
  const periodTrips = inPeriod.length;
  const periodKm = inPeriod.reduce((s, e) => s + Number(e.distance_km), 0);
  const periodGross = sum(inPeriod, "amount");
  const tips = sum(inPeriod, "tip");
  const bonus = sum(inPeriod, "bonus");
  const commission = sum(inPeriod, "base_fare") + sum(inPeriod, "distance_incentive");
  const netPay = periodGross - tips - bonus;
  const avgPerTrip = periodTrips > 0 ? Math.round(netPay / periodTrips) : null;

  const pendingPayout = earnings
    .filter((e) => e.status === "pending")
    .reduce((s, e) => s + Number(e.amount), 0);

  const requestPayout = async () => {
    setBusy(true);
    try {
      const { data: payout, error } = await supabase
        .from("payout_requests")
        .insert({ rider_id: userId, amount: pendingPayout })
        .select("id")
        .single();
      if (error) throw error;
      const { error: linkError } = await supabase
        .from("rider_earnings")
        .update({ status: "requested", payout_request_id: payout.id })
        .eq("rider_id", userId)
        .eq("status", "pending");
      if (linkError) throw linkError;
      toast.success(t("rd_payout_requested"));
      void qc.invalidateQueries({ queryKey: ["rider-earnings"] });
      void qc.invalidateQueries({ queryKey: ["rider-payouts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("rd_err_payout"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
          {WALLET_PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                period === p.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
        <div className="mt-4 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("rd_net_pay")}</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{ETB(netPay)}</p>
          <p className="text-xs text-muted-foreground">
            {t("rd_trips", { count: periodTrips })} ·{" "}
            {t(WALLET_PERIODS.find((p) => p.key === period)!.labelKey)}
          </p>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-xs text-muted-foreground">{t("rd_tips")}</dt>
            <dd className="mt-0.5 font-display font-bold">{ETB(tips)}</dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-xs text-muted-foreground">{t("rd_bonuses")}</dt>
            <dd className="mt-0.5 font-display font-bold">{ETB(bonus)}</dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-xs text-muted-foreground">{t("rd_base_distance")}</dt>
            <dd className="mt-0.5 font-display font-bold">{ETB(commission)}</dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-xs text-muted-foreground">{t("rd_distance_covered")}</dt>
            <dd className="mt-0.5 font-display font-bold">{Math.round(periodKm * 10) / 10} km</dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-xs text-muted-foreground">{t("rd_avg_per_trip")}</dt>
            <dd className="mt-0.5 font-display font-bold">
              {avgPerTrip != null ? ETB(avgPerTrip) : "—"}
            </dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-xs text-muted-foreground">{t("rd_gross_total")}</dt>
            <dd className="mt-0.5 font-display font-bold">{ETB(periodGross)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary p-5 text-primary-foreground">
        <div>
          <p className="text-xs opacity-90">{t("rd_available_cashout")}</p>
          <p className="font-display text-2xl font-extrabold">{ETB(pendingPayout)}</p>
        </div>
        <Button
          variant="secondary"
          disabled={pendingPayout <= 0 || busy}
          onClick={() => void requestPayout()}
        >
          {busy ? t("rd_requesting") : t("rd_instant_payout")}
        </Button>
      </div>

      {payouts.length > 0 && (
        <div>
          <h3 className="font-display text-base font-bold">{t("rd_payout_requests")}</h3>
          <ul className="mt-2 space-y-2">
            {payouts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm"
              >
                <div>
                  <p className="font-semibold">{ETB(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    p.status === "paid"
                      ? "bg-primary-soft text-accent-foreground"
                      : p.status === "rejected"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="font-display text-base font-bold">{t("rd_earning_history")}</h3>
        {earnings.length === 0 ? (
          <p className="mt-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            {t("rd_start_earning")}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {earnings.map((e) => (
              <li key={e.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{ETB(e.amount)}</p>
                  <span className="text-xs text-muted-foreground">{formatDate(e.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("rd_base_amt", { amount: ETB(e.base_fare) })}
                  {Number(e.distance_incentive) > 0 &&
                    ` · ${t("rd_distance_amt", {
                      amount: ETB(e.distance_incentive),
                      km: e.distance_km,
                    })}`}
                  {Number(e.tip) > 0 && ` · ${t("rd_tip_amt", { amount: ETB(e.tip) })}`}
                  {Number(e.bonus) > 0 && ` · ${t("rd_bonus_amt", { amount: ETB(e.bonus) })}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Delivery history
 * ------------------------------------------------------------------ */

function HistoryTab({ orders }: { orders: OrderRow[] }) {
  const { t } = useLanguage();
  const delivered = orders.filter((o) => o.status === "delivered");
  if (delivered.length === 0)
    return (
      <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        {t("rd_history_empty")}
      </p>
    );
  return (
    <ul className="space-y-2">
      {delivered.map((o) => (
        <li key={o.id} className="rounded-xl border border-border bg-card p-3 shadow-card">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-bold">{o.order_code}</p>
            <span className="font-display text-sm font-extrabold text-primary">
              +{ETB(riderPayoutOf(o))}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{o.delivery_address ?? "—"}</p>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {o.delivery_distance != null ? `${o.delivery_distance} km` : "—"} ·{" "}
              {formatDate(o.created_at)}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" /> {t("rd_completed")}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

function NotificationsTab({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(notificationsQuery(userId));

  useEffect(() => {
    const channel = supabase
      .channel(`rider-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => void qc.invalidateQueries({ queryKey: ["notifications", userId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const markAll = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    void qc.invalidateQueries({ queryKey: ["notifications", userId] });
  };

  const rows = data as NotificationRow[];
  const unread = rows.filter((n) => !n.is_read).length;

  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-surface" aria-hidden />;
  if (rows.length === 0)
    return (
      <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        {t("rd_notifications_empty")}
      </p>
    );

  return (
    <div className="space-y-3">
      {unread > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {unread} {t("rd_unread")}
          </p>
          <Button variant="ghost" size="sm" onClick={() => void markAll()}>
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> {t("rd_mark_all_read")}
          </Button>
        </div>
      )}
      <ul className="space-y-2">
        {rows.map((n) => (
          <li
            key={n.id}
            className={cn(
              "rounded-xl border p-3 shadow-card",
              n.is_read ? "border-border bg-card" : "border-primary/30 bg-primary-soft",
            )}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-card text-primary">
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(n.created_at)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Profile
 * ------------------------------------------------------------------ */

function ProfileRow({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium transition-colors hover:bg-surface",
        danger && "text-destructive",
      )}
    >
      <Icon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function ProfileTab({
  rider,
  name,
  rating,
  ratingCount,
  trips,
}: {
  rider: Record<string, unknown> | null;
  name: string;
  rating: number | null;
  ratingCount: number;
  trips: number;
}) {
  const { profile, signOut } = useAuth();
  const { t } = useLanguage();
  const [editOpen, setEditOpen] = useState(false);

  if (!rider) return <p className="text-sm text-muted-foreground">{t("common_loading")}</p>;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <RiderAvatar path={profile?.avatar_url} name={name} size="xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold">{name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <TierBadge tier={rider["commission_tier"] as string | null} />
              <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground">
                <Star className="h-3 w-3 fill-warning text-warning" />
                {rating != null ? rating.toFixed(2) : "—"}
                {ratingCount > 0 && <span className="opacity-70">({ratingCount})</span>}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs capitalize text-muted-foreground">
              <Bike className="h-3.5 w-3.5" />
              {t("rd_vehicle_rider", { vehicle: String(rider["vehicle_type"] ?? "") })} ·{" "}
              {t("rd_trips", { count: trips })}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t("md_edit")}
          </Button>
        </div>
      </section>

      <section className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <ProfileRow icon={User} label={t("rd_personal_info")} onClick={() => setEditOpen(true)} />
        <ProfileRow icon={Bike} label={t("rd_vehicle_info")} onClick={() => setEditOpen(true)} />
        <ProfileRow icon={BadgeCheck} label={t("rd_documents")} onClick={() => setEditOpen(true)} />
        <ProfileRow icon={Wallet} label={t("rd_earnings")} onClick={() => undefined} />
        <ProfileRow
          icon={ClipboardList}
          label={t("rd_delivery_history")}
          onClick={() => undefined}
        />
        <ProfileRow icon={Star} label={t("rd_ratings")} onClick={() => undefined} />
        <ProfileRow icon={Bell} label={t("rd_notifications")} onClick={() => undefined} />
        <ProfileRow icon={HelpCircle} label={t("rd_help_support")} onClick={() => undefined} />
        <ProfileRow icon={Settings} label={t("rd_settings")} onClick={() => setEditOpen(true)} />
        <ProfileRow icon={LogOut} label={t("rd_logout")} onClick={() => void signOut()} danger />
      </section>

      <dl className="divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
        {(
          [
            [t("rd_name"), name],
            [t("reg_phone"), (profile?.phone as string) ?? "—"],
            [
              t("rd_verification"),
              String(rider["verification_status"] ?? "pending_verification").replace(/_/g, " "),
            ],
            [
              t("rd_payout"),
              `${String(rider["payout_method"] ?? "telebirr").replace("_", " ")} · ${String(rider["payout_account"] ?? "—")}`,
            ],
          ] as [string, string][]
        ).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-4 py-3 text-sm">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium capitalize">{v}</dd>
          </div>
        ))}
      </dl>

      <EditProfileDrawer rider={rider} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

const VEHICLE_TYPES: { value: string; labelKey: TranslationKey }[] = [
  { value: "motorcycle", labelKey: "rd_motorcycle" },
  { value: "bicycle", labelKey: "reg_vehicle_bicycle" },
  { value: "car", labelKey: "reg_vehicle_car" },
];

const VEHICLE_LABEL_KEY: Record<string, TranslationKey> = {
  motorcycle: "rd_motorcycle",
  motorbike: "reg_vehicle_motorbike",
  bicycle: "reg_vehicle_bicycle",
  scooter: "reg_vehicle_scooter",
  car: "reg_vehicle_car",
  foot: "rj_onfoot",
};

function EditProfileDrawer({
  rider,
  open,
  onOpenChange,
}: {
  rider: Record<string, unknown>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, profile, refresh } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("motorcycle");
  const [payoutMethod, setPayoutMethod] = useState("telebirr");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutAccountName, setPayoutAccountName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setVehicleType(String(rider["vehicle_type"] ?? "motorcycle"));
    setPayoutMethod(String(rider["payout_method"] ?? "telebirr"));
    setPayoutAccount(String(rider["payout_account"] ?? ""));
    setPayoutAccountName(String(rider["payout_account_name"] ?? ""));
  }, [open, profile, rider]);

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    try {
      const path = await uploadImage(file, "avatars");
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);
      if (error) throw error;
      await refresh();
      toast.success(t("rd_photo_updated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("rd_err_photo"));
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName.trim()) {
      toast.error(t("rd_err_name"));
      return;
    }
    setBusy(true);
    const [{ error: profileError }, { error: riderError }] = await Promise.all([
      supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq("id", user.id),
      supabase
        .from("riders")
        .update({
          vehicle_type: vehicleType,
          payout_method: payoutMethod,
          payout_account: payoutAccount.trim() || null,
          payout_account_name: payoutAccountName.trim() || null,
        })
        .eq("id", user.id),
    ]);
    setBusy(false);
    if (profileError || riderError) {
      toast.error(profileError?.message ?? riderError?.message ?? t("rd_err_profile"));
      return;
    }
    await refresh();
    void qc.invalidateQueries({ queryKey: ["rider-me"] });
    toast.success(t("rd_profile_updated"));
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>{t("rd_edit_profile")}</SheetTitle>
          <SheetDescription>{t("rd_edit_profile_desc")}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex items-center gap-3">
          <RiderAvatar path={profile?.avatar_url} name={profile?.full_name} size="lg" />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadAvatar(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="mr-1.5 h-4 w-4" /> {t("rd_change_photo")}
          </Button>
        </div>

        <form onSubmit={save} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full-name">{t("reg_full_name")}</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("reg_full_name")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("reg_phone")}</Label>
            <Input
              id="phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+251 …"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("reg_vehicle_type")}</Label>
            <Select value={vehicleType} onValueChange={setVehicleType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPES.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {t(v.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold">{t("rd_payout_prefs")}</p>
            <div className="space-y-1.5">
              <Label>{t("reg_payout_method")}</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="telebirr">{t("pay_telebirr")}</SelectItem>
                  <SelectItem value="bank_account">{t("rd_cbe_bank")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payout-account">
                {payoutMethod === "telebirr" ? t("reg_telebirr_phone") : t("rd_account_number")}
              </Label>
              <Input
                id="payout-account"
                value={payoutAccount}
                onChange={(e) => setPayoutAccount(e.target.value)}
                placeholder={payoutMethod === "telebirr" ? "09…" : "1000…"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payout-account-name">{t("reg_account_holder")}</Label>
              <Input
                id="payout-account-name"
                value={payoutAccountName}
                onChange={(e) => setPayoutAccountName(e.target.value)}
                placeholder={t("rd_name_on_account")}
              />
            </div>
          </div>

          <Button type="submit" size="lg" className="h-12 w-full font-extrabold" disabled={busy}>
            {busy ? t("md_saving") : t("rd_save_changes")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ *
 * Orchestrator
 * ------------------------------------------------------------------ */

function RiderPortal() {
  const { user, isRider, profile } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("home");
  const [offer, setOffer] = useState<OrderRow | null>(null);
  const [flowOpen, setFlowOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [gps, setGps] = useState<"unknown" | "ok" | "denied">("unknown");
  const [networkUp, setNetworkUp] = useState(true);
  const seenOfferIds = useRef(new Set<string>());

  const { data: rider } = useQuery({
    queryKey: ["rider-me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("riders").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: publicSettings = {} } = useQuery(publicSettingsQuery);
  const dispatchPaused =
    (publicSettings["platform"] as { dispatch_paused?: boolean } | undefined)?.dispatch_paused ===
    true;

  const { data: orders = [] } = useQuery<OrderRow[]>({
    queryKey: ["rider-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("rider_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as OrderRow[];
    },
  });

  const { data: availableRaw = [] } = useQuery<OrderRow[]>({
    queryKey: ["rider-available", user?.id],
    enabled: !!user && !!rider?.is_approved,
    // Riders stop receiving realtime events for an order the moment another
    // rider accepts it (RLS hides it), so poll as a fallback.
    refetchInterval: 10000,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("status", "dispatched")
        .is("rider_id", null)
        .order("dispatched_at", { ascending: false });
      return (data ?? []) as unknown as OrderRow[];
    },
  });

  const { data: myEvents = [] } = useQuery<{ order_id: string; event: string }[]>({
    queryKey: ["rider-offer-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("rider_offer_events")
        .select("order_id,event")
        .eq("rider_id", user!.id);
      return data ?? [];
    },
  });

  const { data: earnings = [] } = useQuery<EarningRow[]>({
    queryKey: ["rider-earnings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("rider_earnings")
        .select("id,amount,base_fare,tip,bonus,distance_km,distance_incentive,status,created_at")
        .eq("rider_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as EarningRow[];
    },
  });

  const { data: payouts = [] } = useQuery<
    {
      id: string;
      amount: number;
      status: string;
      created_at: string;
      processed_at: string | null;
    }[]
  >({
    queryKey: ["rider-payouts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("payout_requests")
        .select("id,amount,status,created_at,processed_at")
        .eq("rider_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: ratings = [] } = useQuery<{ rating: number }[]>({
    queryKey: ["rider-ratings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("rider_ratings")
        .select("rating")
        .eq("rider_id", user!.id);
      return data ?? [];
    },
  });

  const { data: notifications = [] } = useQuery(notificationsQuery(user?.id));
  const unread = (notifications as NotificationRow[]).filter((n) => !n.is_read).length;

  const { data: siteContent } = useQuery(siteContentQuery);

  const declinedIds = useMemo(
    () => new Set(myEvents.filter((e) => e.event === "declined").map((e) => e.order_id)),
    [myEvents],
  );
  const activeOrders = orders.filter((o) =>
    ["accepted", "arrived_at_merchant", "picked_up", "on_the_way"].includes(o.status),
  );
  const activeOrder = activeOrders[0] ?? null;
  const available = useMemo(
    () =>
      rider?.is_online && !activeOrder ? availableRaw.filter((o) => !declinedIds.has(o.id)) : [],
    [availableRaw, declinedIds, rider?.is_online, activeOrder],
  );

  // Pop the full-screen incoming-order modal for the newest offer
  useEffect(() => {
    const next = available.find((o) => !seenOfferIds.current.has(o.id));
    if (next) {
      seenOfferIds.current.add(next.id);
      setOffer(next);
      sounds.newOrder();
      navigator.vibrate?.([200, 100, 200]);
    }
  }, [available]);

  useEffect(() => {
    void loadAudioSettings();
    const handler = () => primeAudio();
    window.addEventListener("pointerdown", handler, { once: true });
    return () => window.removeEventListener("pointerdown", handler);
  }, []);

  useEffect(() => {
    const up = () => setNetworkUp(true);
    const down = () => setNetworkUp(false);
    setNetworkUp(navigator.onLine);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  useEffect(() => {
    if (!user || !rider?.is_approved) return;
    const channel = supabase
      .channel(`rider-dispatch-rt-${user.id}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        const next = (payload.new ?? {}) as Partial<OrderRow>;
        if (payload.eventType === "UPDATE" && next.status === "dispatched") {
          sounds.newOrder();
          toast.success(`New order available: ${next.order_code ?? ""}`);
        }
        void qc.invalidateQueries({ queryKey: ["rider-available"] });
      })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `rider_id=eq.${user.id}` },
        (payload) => {
          const next = payload.new as OrderRow;
          sounds.statusUpdate();
          void qc.invalidateQueries({ queryKey: ["rider-orders"] });
          if (next.status === "delivered") {
            void qc.invalidateQueries({ queryKey: ["rider-earnings"] });
          }
          if (next.payment_status === "paid") sounds.payment();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payout_requests",
          filter: `rider_id=eq.${user.id}`,
        },
        (payload) => {
          const next = (payload.new ?? {}) as { status?: string };
          if (next.status === "paid") {
            sounds.payment();
            toast.success(t("rd_payout_sent"));
          }
          void qc.invalidateQueries({ queryKey: ["rider-payouts"] });
          void qc.invalidateQueries({ queryKey: ["rider-earnings"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, rider?.is_approved, qc, t]);

  // Stream GPS (speed + battery) to the platform every ~5 seconds while online
  useEffect(() => {
    if (!user || !rider?.is_online || !navigator.geolocation) return;
    let batteryLevel: number | null = null;
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> };
    void nav.getBattery?.().then((b) => {
      batteryLevel = Math.round(b.level * 100);
    });
    let lastWrite = 0;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGps("ok");
        const now = Date.now();
        if (now - lastWrite < 5000) return;
        lastWrite = now;
        void supabase
          .from("riders")
          .update({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed,
            battery: batteryLevel,
            location_updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      },
      () => setGps("denied"),
      { enableHighAccuracy: true, maximumAge: 4000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [user, rider?.is_online]);

  if (!user || !isRider)
    return <div className="py-16 text-center text-muted-foreground">{t("common_loading")}</div>;

  const toggleOnline = async (value: boolean) => {
    setToggling(true);
    await supabase.from("riders").update({ is_online: value }).eq("id", user.id);
    setToggling(false);
    void qc.invalidateQueries({ queryKey: ["rider-me"] });
  };

  const retryLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      () => setGps("ok"),
      () => setGps("denied"),
      { enableHighAccuracy: true },
    );
  };

  const acceptOrder = async (orderId: string) => {
    const { error } = await supabase.rpc("accept_order", { _order_id: orderId });
    setOffer(null);
    if (error) {
      toast.error(t("rd_too_late"));
      void qc.invalidateQueries({ queryKey: ["rider-available"] });
      return;
    }
    sounds.newOrder();
    toast.success(t("rd_accepted"));
    setTab("home");
    void qc.invalidateQueries({ queryKey: ["rider-available"] });
    void qc.invalidateQueries({ queryKey: ["rider-orders"] });
    void qc.invalidateQueries({ queryKey: ["rider-offer-events"] });
  };

  const declineOrder = async (orderId: string) => {
    setOffer(null);
    await supabase
      .from("rider_offer_events")
      .upsert(
        { order_id: orderId, rider_id: user.id, event: "declined" },
        { onConflict: "order_id,rider_id" },
      );
    void qc.invalidateQueries({ queryKey: ["rider-offer-events"] });
  };

  const setStatus = async (order: OrderRow, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await notify(
      order.customer_id,
      t("rd_notify_order_updated", { code: order.order_code }),
      t(STATUS_LABEL_KEY[status]),
      "order",
      order.id,
    );
    sounds.statusUpdate();
    void qc.invalidateQueries({ queryKey: ["rider-orders"] });
  };

  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 100) / 100
      : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEarnings = earnings.filter((e) => new Date(e.created_at) >= today);
  const todayTotal = todayEarnings.reduce((s, e) => s + Number(e.amount), 0);
  const todayKm = todayEarnings.reduce((s, e) => s + Number(e.distance_km), 0);
  const avgPerTrip =
    todayEarnings.length > 0 ? Math.round(todayTotal / todayEarnings.length) : null;

  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const area = siteContent?.city ?? "Bishoftu";

  const TABS = [
    { id: "home" as const, labelKey: "rd_home" as const, icon: Home },
    { id: "orders" as const, labelKey: "rd_deliveries" as const, icon: ClipboardList },
    { id: "earnings" as const, labelKey: "md_tab_earnings" as const, icon: Wallet },
    { id: "notifications" as const, labelKey: "rd_notifications" as const, icon: Bell },
    { id: "profile" as const, labelKey: "rd_profile" as const, icon: User },
  ];

  return (
    <div className="min-h-screen bg-surface pb-24">
      <RiderHeader
        name={profile?.full_name ?? ""}
        avatarUrl={profile?.avatar_url}
        rating={avgRating}
        ratingCount={ratings.length}
        tier={rider?.commission_tier}
        vehicle={rider?.vehicle_type}
        online={!!rider?.is_online}
        trips={deliveredCount}
        unread={unread}
        onNotifications={() => setTab("notifications")}
        onAccount={() => setTab("profile")}
      />

      {!networkUp && (
        <div className="mx-auto max-w-6xl px-4 pt-3">
          <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs font-medium">
            <WifiOff className="h-4 w-4 shrink-0" /> {t("rd_network_offline")}
          </div>
        </div>
      )}

      {dispatchPaused && (
        <div className="mx-auto max-w-6xl px-4 pt-3">
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs font-medium">
            {t("rd_dispatch_paused")}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-4">
        {tab === "home" && (
          <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-5 lg:space-y-0">
            <div className="space-y-4">
              <AvailabilityCard
                online={!!rider?.is_online}
                busy={toggling}
                onToggle={(v) => void toggleOnline(v)}
                gps={gps}
                onEnableLocation={retryLocation}
              />
              {activeOrder ? (
                <ActiveDeliveryCard
                  order={activeOrder}
                  riderLat={rider?.lat ?? null}
                  riderLng={rider?.lng ?? null}
                  onStatus={(s) => void setStatus(activeOrder, s)}
                  onView={() => setFlowOpen(true)}
                  onDeliver={() => setPinOpen(true)}
                />
              ) : (
                <IdleState
                  online={!!rider?.is_online}
                  todayTotal={todayTotal}
                  trips={todayEarnings.length}
                  distanceKm={todayKm}
                  avgPerTrip={avgPerTrip}
                  availableCount={available.length}
                  area={area}
                  onBrowse={() => setTab("orders")}
                />
              )}
            </div>
            <div className="space-y-4">
              {available.length > 0 && (
                <section>
                  <h2 className="mb-2 font-display text-base font-bold">
                    {t("rd_available_orders")}
                  </h2>
                  <ul className="space-y-3">
                    {available.slice(0, 3).map((o) => (
                      <DeliveryRequestCard
                        key={o.id}
                        order={o}
                        onAccept={() => void acceptOrder(o.id)}
                        onDecline={() => void declineOrder(o.id)}
                      />
                    ))}
                  </ul>
                </section>
              )}
              <PerformanceCard
                rating={avgRating}
                ratingCount={ratings.length}
                trips={deliveredCount}
                distanceKm={earnings.reduce((s, e) => s + Number(e.distance_km), 0)}
              />
            </div>
          </div>
        )}
        {tab === "orders" && (
          <div className="space-y-6">
            <OrdersTab
              available={available}
              active={activeOrders}
              online={!!rider?.is_online}
              onAccept={(o) => void acceptOrder(o.id)}
              onDecline={(o) => void declineOrder(o.id)}
              onOpenTrip={() => setTab("home")}
            />
            <section>
              <h2 className="mb-2 font-display text-base font-bold">{t("rd_delivery_history")}</h2>
              <HistoryTab orders={orders} />
            </section>
          </div>
        )}
        {tab === "earnings" && (
          <EarningsTab earnings={earnings} payouts={payouts} userId={user.id} />
        )}
        {tab === "notifications" && <NotificationsTab userId={user.id} />}
        {tab === "profile" && (
          <ProfileTab
            rider={rider ?? null}
            name={profile?.full_name ?? ""}
            rating={avgRating}
            ratingCount={ratings.length}
            trips={deliveredCount}
          />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto grid max-w-6xl grid-cols-5">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors",
                tab === item.id ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className="relative">
                <item.icon className="h-5 w-5" />
                {item.id === "notifications" && unread > 0 && (
                  <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              {t(item.labelKey)}
              {tab === item.id && (
                <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <Sheet open={flowOpen} onOpenChange={setFlowOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t("rd_active_delivery")}</SheetTitle>
            <SheetDescription>{activeOrder?.order_code}</SheetDescription>
          </SheetHeader>
          {activeOrder && (
            <div className="mt-4">
              <DeliveryFlow order={activeOrder} onStatus={(s) => void setStatus(activeOrder, s)} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={pinOpen} onOpenChange={setPinOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t("rd_stage4")}</SheetTitle>
            <SheetDescription>{t("rd_pin_hint")}</SheetDescription>
          </SheetHeader>
          {activeOrder && (
            <div className="mt-4">
              <PinForm orderId={activeOrder.id} onDone={() => setPinOpen(false)} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {offer && (
        <IncomingOrderModal
          order={offer}
          onAccept={() => void acceptOrder(offer.id)}
          onDecline={() => void declineOrder(offer.id)}
        />
      )}
    </div>
  );
}
