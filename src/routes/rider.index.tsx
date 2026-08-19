import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, MapPin, Navigation, Percent, Phone, Star, Wallet, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ETB, formatDate } from "@/lib/format";
import { STATUS_LABEL, statusTone, notify, type OrderStatus } from "@/lib/orders";
import { sounds, loadAudioSettings, primeAudio } from "@/lib/audio";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const RiderTrackingMap = lazy(() => import("@/components/ligo/RiderTrackingMap"));

const RIDER_FLOW: OrderStatus[] = ["picked_up", "on_the_way", "delivered"];
const BISHOFTU: [number, number] = [8.7522, 38.9969];

export const Route = createFileRoute("/rider/")({
  head: () => ({
    meta: [
      { title: "Rider portal — Ligo Delivery" },
      {
        name: "description",
        content: "Manage your assigned Ligo deliveries, go online and update delivery status.",
      },
      { property: "og:title", content: "Rider portal — Ligo Delivery" },
      { property: "og:description", content: "Manage your Ligo deliveries in Bishoftu." },
    ],
  }),
  component: RiderPortal,
});

type OrderRow = {
  id: string;
  order_code: string;
  status: string;
  total: number;
  delivery_fee: number;
  rider_payout: number;
  payment_method: string;
  payment_status: string;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
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
  status: string;
  created_at: string;
  order_id: string | null;
  payout_request_id: string | null;
};

type PayoutRow = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at: string | null;
};

type OfferEventRow = { order_id: string; event: string };

type RatingRow = { rating: number };

function RiderPortal() {
  const { user, isRider, loading } = useAuth();
  const qc = useQueryClient();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [payoutBusy, setPayoutBusy] = useState(false);

  const { data: rider } = useQuery({
    queryKey: ["rider-me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("riders").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: orders = [] } = useQuery<OrderRow[]>({
    queryKey: ["rider-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "id,order_code,status,total,delivery_fee,rider_payout,payment_method,payment_status,customer_id,customer_name,customer_phone,delivery_address,lat,lng,created_at,shop_id,dispatched_at",
        )
        .eq("rider_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as OrderRow[];
    },
  });

  const { data: availableRaw = [] } = useQuery<OrderRow[]>({
    queryKey: ["rider-available", user?.id],
    enabled: !!user && !!rider?.is_approved,
    // Fallback polling: riders stop receiving realtime events for an order
    // the moment another rider accepts it (RLS hides it), so poll to guarantee
    // taken orders disappear from every screen.
    refetchInterval: 10000,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "id,order_code,status,total,delivery_fee,rider_payout,payment_method,payment_status,customer_id,customer_name,customer_phone,delivery_address,lat,lng,created_at,shop_id,dispatched_at",
        )
        .eq("status", "dispatched")
        .is("rider_id", null)
        .order("dispatched_at", { ascending: false });
      return (data ?? []) as OrderRow[];
    },
  });

  const { data: myEvents = [] } = useQuery<OfferEventRow[]>({
    queryKey: ["rider-offer-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("rider_offer_events")
        .select("order_id,event")
        .eq("rider_id", user!.id);
      return (data ?? []) as OfferEventRow[];
    },
  });

  const { data: shopNames = {} } = useQuery<Record<string, string>>({
    queryKey: ["rider-available-shops", availableRaw.map((o) => o.shop_id).join(",")],
    enabled: availableRaw.length > 0,
    queryFn: async () => {
      const ids = [...new Set(availableRaw.map((o) => o.shop_id).filter(Boolean))] as string[];
      if (ids.length === 0) return {};
      const { data } = await supabase.from("shops").select("id,name,address").in("id", ids);
      return Object.fromEntries(
        (data ?? []).map((s) => [s.id, `${s.name}${s.address ? ` — ${s.address}` : ""}`]),
      );
    },
  });

  const { data: earnings = [] } = useQuery<EarningRow[]>({
    queryKey: ["rider-earnings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("rider_earnings")
        .select("id,amount,base_fare,tip,bonus,status,created_at,order_id,payout_request_id")
        .eq("rider_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as EarningRow[];
    },
  });

  const { data: payouts = [] } = useQuery<PayoutRow[]>({
    queryKey: ["rider-payouts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("payout_requests")
        .select("id,amount,status,created_at,processed_at")
        .eq("rider_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as PayoutRow[];
    },
  });

  const { data: ratings = [] } = useQuery<RatingRow[]>({
    queryKey: ["rider-ratings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("rider_ratings")
        .select("rating")
        .eq("rider_id", user!.id);
      return (data ?? []) as RatingRow[];
    },
  });

  const declinedIds = useMemo(
    () => new Set(myEvents.filter((e) => e.event === "declined").map((e) => e.order_id)),
    [myEvents],
  );
  const available = useMemo(
    () => (rider?.is_online ? availableRaw.filter((o) => !declinedIds.has(o.id)) : []),
    [availableRaw, declinedIds, rider?.is_online],
  );

  useEffect(() => {
    void loadAudioSettings();
    const handler = () => primeAudio();
    window.addEventListener("pointerdown", handler, { once: true });
    return () => window.removeEventListener("pointerdown", handler);
  }, []);

  // Live dispatch broadcast: any order change can add/remove available orders
  useEffect(() => {
    if (!user || !rider?.is_approved) return;
    const channel = supabase
      .channel(`rider-dispatch-rt-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        const next = (payload.new ?? {}) as Partial<OrderRow>;
        if (payload.eventType === "UPDATE" && next.status === "dispatched") {
          sounds.newOrder();
          toast.success(`New order available: ${next.order_code ?? ""}`);
        }
        void qc.invalidateQueries({ queryKey: ["rider-available"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, rider?.is_approved, qc]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`rider-orders-rt-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `rider_id=eq.${user.id}` },
        () => {
          sounds.newOrder();
          toast.success("New delivery assigned!");
          void qc.invalidateQueries({ queryKey: ["rider-orders"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `rider_id=eq.${user.id}` },
        (payload) => {
          const next = payload.new as OrderRow;
          sounds.statusUpdate();
          void qc.invalidateQueries({ queryKey: ["rider-orders"] });
          if (next.status === "delivered") {
            void qc.invalidateQueries({ queryKey: ["rider-earnings"] });
            toast.success(`Order ${next.order_code} delivered — earning recorded`);
          }
          if (next.payment_status === "paid") {
            sounds.payment();
          }
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
          const next = (payload.new ?? {}) as Partial<PayoutRow>;
          if (next.status === "paid") {
            sounds.payment();
            toast.success("Your payout was sent!");
          }
          void qc.invalidateQueries({ queryKey: ["rider-payouts"] });
          void qc.invalidateQueries({ queryKey: ["rider-earnings"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, qc]);

  useEffect(() => {
    if (!user || !rider?.is_online || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        await supabase
          .from("riders")
          .update({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            location_updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [user, rider?.is_online]);

  if (loading) return <div className="container-ligo py-16 text-muted-foreground">Loading…</div>;
  if (!user)
    return (
      <div className="container-ligo py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">Sign in to open the rider portal</h1>
        <Button asChild className="mt-6">
          <Link to="/auth" search={{ mode: "login", role: "customer" }}>
            Sign in
          </Link>
        </Button>
      </div>
    );
  if (!isRider)
    return (
      <div className="container-ligo py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">You're not registered as a rider</h1>
        <Button asChild className="mt-6">
          <Link to="/rider/join">Apply to become a rider</Link>
        </Button>
      </div>
    );

  const toggleOnline = async (value: boolean) => {
    await supabase.from("riders").update({ is_online: value }).eq("id", user.id);
    void qc.invalidateQueries({ queryKey: ["rider-me"] });
  };

  const acceptOrder = async (orderId: string) => {
    setAcceptingId(orderId);
    const { error } = await supabase.rpc("accept_order", { _order_id: orderId });
    setAcceptingId(null);
    if (error) {
      toast.error("Too late — another rider accepted this order.");
      void qc.invalidateQueries({ queryKey: ["rider-available"] });
      return;
    }
    sounds.newOrder();
    toast.success("Order accepted — head to the pickup point!");
    void qc.invalidateQueries({ queryKey: ["rider-available"] });
    void qc.invalidateQueries({ queryKey: ["rider-orders"] });
    void qc.invalidateQueries({ queryKey: ["rider-offer-events"] });
  };

  const declineOrder = async (orderId: string) => {
    const { error } = await supabase
      .from("rider_offer_events")
      .insert({ order_id: orderId, rider_id: user.id, event: "declined" });
    if (error && error.code !== "23505") {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["rider-offer-events"] });
  };

  const setStatus = async (orderId: string, status: string, customerId: string, code: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await notify(
      customerId,
      `Order ${code} updated`,
      STATUS_LABEL[status as OrderStatus] ?? status,
      "order",
      orderId,
    );
    sounds.statusUpdate();
    void qc.invalidateQueries({ queryKey: ["rider-orders"] });
    if (status === "delivered") void qc.invalidateQueries({ queryKey: ["rider-earnings"] });
    toast.success("Status updated");
  };

  const requestPayout = async (amount: number) => {
    setPayoutBusy(true);
    try {
      const { data: payout, error } = await supabase
        .from("payout_requests")
        .insert({ rider_id: user.id, amount })
        .select("id")
        .single();
      if (error) throw error;
      const { error: linkError } = await supabase
        .from("rider_earnings")
        .update({ status: "requested", payout_request_id: payout.id })
        .eq("rider_id", user.id)
        .eq("status", "pending");
      if (linkError) throw linkError;
      toast.success("Payout requested — our team will process it shortly.");
      void qc.invalidateQueries({ queryKey: ["rider-earnings"] });
      void qc.invalidateQueries({ queryKey: ["rider-payouts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not request payout");
    } finally {
      setPayoutBusy(false);
    }
  };

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === "delivered");
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");

  const acceptedCount = myEvents.filter((e) => e.event === "accepted").length;
  const declinedCount = myEvents.filter((e) => e.event === "declined").length;
  const acceptanceRate =
    acceptedCount + declinedCount > 0
      ? Math.round((acceptedCount / (acceptedCount + declinedCount)) * 100)
      : 100;
  const completedCount = completedOrders.length;
  const completionRate =
    completedCount + cancelledOrders.length > 0
      ? Math.round((completedCount / (completedCount + cancelledOrders.length)) * 100)
      : 100;
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10
      : null;

  const pendingPayout = earnings
    .filter((e) => e.status === "pending")
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="container-ligo py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Rider portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rider?.is_approved
              ? "You're approved to take deliveries."
              : "Your account is pending admin approval."}
          </p>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <span className="text-sm font-medium">{rider?.is_online ? "Online" : "Offline"}</span>
          <Switch
            checked={!!rider?.is_online}
            onCheckedChange={(v) => void toggleOnline(v)}
            disabled={!rider?.is_approved}
          />
        </label>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Percent}
          label="Acceptance rate"
          value={`${acceptanceRate}%`}
          hint={`${acceptedCount} accepted · ${declinedCount} declined`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completion rate"
          value={`${completionRate}%`}
          hint={`${completedCount} delivered`}
        />
        <StatCard
          icon={Star}
          label="Customer rating"
          value={avgRating != null ? `${avgRating} / 5` : "No ratings yet"}
          hint={`${ratings.length} ratings`}
        />
        <StatCard
          icon={Zap}
          label="Available now"
          value={String(available.length)}
          hint={rider?.is_online ? "Dispatched orders" : "Go online to receive orders"}
        />
      </div>

      <Tabs defaultValue="available" className="mt-8">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="available">Available ({available.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="available">
          {!rider?.is_online ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Go online to receive dispatched orders.
            </p>
          ) : available.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No orders available right now — you'll hear a sound when one is dispatched.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {available.map((o) => (
                <div
                  key={o.id}
                  className="rounded-xl border border-primary/40 bg-card p-4 shadow-card"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display font-bold">{o.order_code}</p>
                      <p className="text-xs text-muted-foreground">
                        Dispatched {formatDate(o.dispatched_at ?? o.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-semibold text-accent-foreground">
                      Earn {ETB(o.rider_payout || o.delivery_fee)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm">
                    {o.shop_id && shopNames[o.shop_id] && (
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                        Pickup: {shopNames[o.shop_id]}
                      </p>
                    )}
                    <p className="flex items-start gap-2">
                      <Navigation className="mt-0.5 h-4 w-4 text-primary" />
                      Deliver to: {o.delivery_address}
                    </p>
                    <p className="text-muted-foreground">
                      {ETB(o.total)} · {o.payment_method} · {o.payment_status}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={acceptingId === o.id}
                      onClick={() => void acceptOrder(o.id)}
                    >
                      {acceptingId === o.id ? "Accepting…" : "Accept order"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void declineOrder(o.id)}>
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active">
          {activeOrders.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No active deliveries right now.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {activeOrders.map((o) => (
                <ActiveOrderCard
                  key={o.id}
                  order={o}
                  onStatus={(s) => void setStatus(o.id, s, o.customer_id, o.order_code)}
                  onTrack={() => setActiveOrderId((cur) => (cur === o.id ? null : o.id))}
                  trackingOpen={activeOrderId === o.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedOrders.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No completed deliveries yet.</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {completedOrders.map((o) => (
                <li key={o.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display font-bold">{o.order_code}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(o.status)}`}
                    >
                      {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{o.delivery_address}</p>
                  <p className="text-sm text-muted-foreground">
                    {o.customer_name} · {ETB(o.total)} · Earning{" "}
                    {ETB(o.rider_payout || o.delivery_fee)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="earnings">
          <EarningsPanel
            earnings={earnings}
            payouts={payouts}
            pendingPayout={pendingPayout}
            payoutBusy={payoutBusy}
            onRequestPayout={(amount) => void requestPayout(amount)}
          />
        </TabsContent>

        <TabsContent value="history">
          {orders.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No delivery history yet.</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {orders.map((o) => (
                <li key={o.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display font-bold">{o.order_code}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(o.status)}`}
                    >
                      {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {o.customer_name} · {o.customer_phone} · {ETB(o.total)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ActiveOrderCard({
  order,
  onStatus,
  onTrack,
  trackingOpen,
}: {
  order: OrderRow;
  onStatus: (s: OrderStatus) => void;
  onTrack: () => void;
  trackingOpen: boolean;
}) {
  const destLat = order.lat ?? BISHOFTU[0];
  const destLng = order.lng ?? BISHOFTU[1];

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display font-bold">{order.order_code}</p>
          <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(order.status)}`}
        >
          {STATUS_LABEL[order.status as OrderStatus] ?? order.status}
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-sm">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 text-primary" />
          {order.delivery_address}
        </p>
        <p className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          {order.customer_name} · {order.customer_phone}
        </p>
        <p className="text-muted-foreground">
          {ETB(order.total)} · {order.payment_method} · {order.payment_status} · Earning{" "}
          {ETB(order.rider_payout || order.delivery_fee)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {RIDER_FLOW.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={order.status === s ? "default" : "outline"}
            onClick={() => onStatus(s)}
          >
            {STATUS_LABEL[s]}
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={onTrack}>
          <Navigation className="mr-2 h-4 w-4" />
          {trackingOpen ? "Hide map" : "Track on map"}
        </Button>
      </div>

      {trackingOpen && (
        <div className="mt-4">
          <ClientOnly fallback={<div className="h-80 w-full rounded-xl bg-surface" />}>
            <Suspense fallback={<div className="h-80 w-full rounded-xl bg-surface" />}>
              <RiderTrackingMap
                destLat={destLat}
                destLng={destLng}
                riderLat={null}
                riderLng={null}
                status={order.status}
              />
            </Suspense>
          </ClientOnly>
          <p className="mt-2 text-xs text-muted-foreground">
            Live tracking shows your position when you're online and moving.
          </p>
        </div>
      )}
    </div>
  );
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfWeek = (d: Date) => {
  const day = startOfDay(d);
  const diff = (day.getDay() + 6) % 7;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - diff);
};

function EarningsPanel({
  earnings,
  payouts,
  pendingPayout,
  payoutBusy,
  onRequestPayout,
}: {
  earnings: EarningRow[];
  payouts: PayoutRow[];
  pendingPayout: number;
  payoutBusy: boolean;
  onRequestPayout: (amount: number) => void;
}) {
  const now = new Date();
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const inRange = (from: Date) => earnings.filter((e) => new Date(e.created_at) >= from);
  const sum = (list: EarningRow[], key: "amount" | "base_fare" | "tip" | "bonus") =>
    list.reduce((s, e) => s + Number(e[key]), 0);

  const periods = [
    { label: "Today", list: inRange(dayStart) },
    { label: "This week", list: inRange(weekStart) },
    { label: "This month", list: inRange(monthStart) },
  ];

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {periods.map((p) => (
          <div key={p.label} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{p.label}</p>
            <p className="mt-2 font-display text-3xl font-extrabold">
              {ETB(sum(p.list, "amount"))}
            </p>
            <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              <li>Base fares {ETB(sum(p.list, "base_fare"))}</li>
              <li>Tips {ETB(sum(p.list, "tip"))}</li>
              <li>Bonuses {ETB(sum(p.list, "bonus"))}</li>
              <li>{p.list.length} deliveries</li>
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-primary-soft p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Available for cashout
          </p>
          <p className="mt-1 font-display text-3xl font-extrabold text-accent-foreground">
            {ETB(pendingPayout)}
          </p>
        </div>
        <Button
          disabled={pendingPayout <= 0 || payoutBusy}
          onClick={() => onRequestPayout(pendingPayout)}
        >
          <Wallet className="mr-2 h-4 w-4" />
          {payoutBusy ? "Requesting…" : "Instant cashout"}
        </Button>
      </div>

      {payouts.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-bold">Payout requests</h3>
          <ul className="mt-3 space-y-2">
            {payouts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{ETB(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested {formatDate(p.created_at)}
                    {p.processed_at ? ` · Processed ${formatDate(p.processed_at)}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${p.status === "paid" ? "bg-primary-soft text-accent-foreground" : p.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}
                >
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="font-display text-lg font-bold">Earning history</h3>
        {earnings.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No earnings recorded yet. Complete a delivery to start earning.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {earnings.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{ETB(e.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(e.created_at)} · Base {ETB(e.base_fare)}
                    {Number(e.tip) > 0 ? ` · Tip ${ETB(e.tip)}` : ""}
                    {Number(e.bonus) > 0 ? ` · Bonus ${ETB(e.bonus)}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${e.status === "paid" ? "bg-primary-soft text-accent-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {e.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
