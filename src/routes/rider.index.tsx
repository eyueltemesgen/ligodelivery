import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bike,
  CheckCircle2,
  ClipboardList,
  Home,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  Star,
  User,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RiderGate } from "@/components/auth/guards";
import { ETB, formatDate } from "@/lib/format";
import { uploadImage } from "@/lib/media";
import { publicSettingsQuery } from "@/lib/queries";
import { STATUS_LABEL, notify, type OrderStatus } from "@/lib/orders";
import { sounds, loadAudioSettings, primeAudio } from "@/lib/audio";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/rider/")({
  head: () => ({
    meta: [
      { title: "Rider — LIGO Delivery" },
      { name: "description", content: "LIGO rider operations: dispatch, deliveries and earnings." },
      { property: "og:title", content: "Rider — LIGO Delivery" },
      { property: "og:description", content: "LIGO rider operations." },
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
  delivery_fee: number;
  rider_payout: number;
  tip: number;
  payment_method: string;
  payment_status: string;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_instructions: string | null;
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

type Tab = "home" | "orders" | "earnings" | "profile";

const haversineKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(h)) * 100) / 100;
};

function RiderPortal() {
  const { user, isRider, profile } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("home");
  const [offer, setOffer] = useState<OrderRow | null>(null);
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
        .select(
          "id,order_code,status,total,delivery_fee,rider_payout,tip,payment_method,payment_status,customer_id,customer_name,customer_phone,delivery_address,delivery_instructions,lat,lng,created_at,shop_id,dispatched_at",
        )
        .eq("rider_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as OrderRow[];
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
        .select(
          "id,order_code,status,total,delivery_fee,rider_payout,tip,payment_method,payment_status,customer_id,customer_name,customer_phone,delivery_address,delivery_instructions,lat,lng,created_at,shop_id,dispatched_at",
        )
        .eq("status", "dispatched")
        .is("rider_id", null)
        .order("dispatched_at", { ascending: false });
      return (data ?? []) as OrderRow[];
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
  }, [user, rider?.is_approved, qc]);

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
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 4000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [user, rider?.is_online]);

  if (!user || !isRider)
    return <div className="py-16 text-center text-muted-foreground">Loading…</div>;

  const toggleOnline = async (value: boolean) => {
    await supabase.from("riders").update({ is_online: value }).eq("id", user.id);
    void qc.invalidateQueries({ queryKey: ["rider-me"] });
  };

  const acceptOrder = async (orderId: string) => {
    const { error } = await supabase.rpc("accept_order", { _order_id: orderId });
    setOffer(null);
    if (error) {
      toast.error("Too late — another rider accepted this order.");
      void qc.invalidateQueries({ queryKey: ["rider-available"] });
      return;
    }
    sounds.newOrder();
    toast.success("Order accepted — head to the pickup point!");
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
      `Order ${order.order_code} updated`,
      STATUS_LABEL[status],
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

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-surface pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft font-display text-sm font-extrabold text-accent-foreground">
          {(profile?.full_name ?? "R").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold">{profile?.full_name || "Rider"}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-warning text-warning" />
            {avgRating != null ? `${avgRating} ★` : "No ratings yet"}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold">
          {rider?.is_online ? "ONLINE" : "OFFLINE"}
          <Switch checked={!!rider?.is_online} onCheckedChange={(v) => void toggleOnline(v)} />
        </label>
      </header>

      {dispatchPaused && (
        <div className="mx-4 mt-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs font-medium">
          Dispatch is paused platform-wide — no new orders until operations resume.
        </div>
      )}

      <main className="px-4 py-4">
        {tab === "home" &&
          (activeOrder ? (
            <DeliveryFlow order={activeOrder} onStatus={(s) => void setStatus(activeOrder, s)} />
          ) : (
            <IdleDashboard
              online={!!rider?.is_online}
              todayTotal={todayTotal}
              trips={todayEarnings.length}
              distanceKm={todayKm}
              availableCount={available.length}
              onBrowse={() => setTab("orders")}
            />
          ))}
        {tab === "orders" && (
          <OrdersTab
            available={available}
            active={activeOrders}
            online={!!rider?.is_online}
            onAccept={(o) => setOffer(o)}
          />
        )}
        {tab === "earnings" && (
          <EarningsTab earnings={earnings} payouts={payouts} userId={user.id} />
        )}
        {tab === "profile" && <ProfileTab rider={rider ?? null} name={profile?.full_name ?? ""} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-border bg-card">
        <div className="grid grid-cols-4">
          {(
            [
              { id: "home", label: "Home", icon: Home },
              { id: "orders", label: "Orders", icon: ClipboardList },
              { id: "earnings", label: "Earnings", icon: Wallet },
              { id: "profile", label: "Profile", icon: User },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${
                tab === item.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </div>
      </nav>

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

function IdleDashboard({
  online,
  todayTotal,
  trips,
  distanceKm,
  availableCount,
  onBrowse,
}: {
  online: boolean;
  todayTotal: number;
  trips: number;
  distanceKm: number;
  availableCount: number;
  onBrowse: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-card">
        <p className="text-sm opacity-90">
          {online ? "You are Online — searching for orders near Bishoftu…" : "You are offline"}
        </p>
        <p className="mt-3 font-display text-3xl font-extrabold">{ETB(todayTotal)}</p>
        <p className="text-xs opacity-90">Today's earnings</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Trips completed</p>
          <p className="mt-1 font-display text-2xl font-extrabold">{trips}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Distance covered</p>
          <p className="mt-1 font-display text-2xl font-extrabold">
            {Math.round(distanceKm * 10) / 10} km
          </p>
        </div>
      </div>
      {online && availableCount > 0 && (
        <Button className="w-full" size="lg" onClick={onBrowse}>
          {availableCount} order{availableCount === 1 ? "" : "s"} available — view now
        </Button>
      )}
    </div>
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
  const [secondsLeft, setSecondsLeft] = useState(15);
  const declinedRef = useRef(false);

  const { data: shop } = useQuery({
    queryKey: ["offer-shop", order.shop_id],
    enabled: !!order.shop_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("shops")
        .select("name,address,lat,lng")
        .eq("id", order.shop_id!)
        .maybeSingle();
      return data;
    },
  });

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
      ? haversineKm(shop.lat, shop.lng, order.lat, order.lng)
      : null;
  const etaMins = distanceKm != null ? Math.max(Math.round((distanceKm / 25) * 60), 3) : null;
  const pct = Math.max(secondsLeft / 15, 0);
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-display text-lg font-extrabold">New order request</p>
        <button
          type="button"
          onClick={onDecline}
          aria-label="Decline"
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
              <span className="block text-xs text-muted-foreground">Pickup</span>
              <span className="font-semibold">{shop?.name ?? "Merchant"}</span>
              {shop?.address && (
                <span className="block text-xs text-muted-foreground">{shop.address}</span>
              )}
            </span>
          </p>
          <p className="flex items-start gap-2 text-sm">
            <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <span className="block text-xs text-muted-foreground">Deliver to</span>
              <span className="font-semibold">{order.delivery_address}</span>
            </span>
          </p>
          <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Distance</p>
              <p className="font-display font-bold">
                {distanceKm != null ? `${distanceKm} km` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Est. time</p>
              <p className="font-display font-bold">{etaMins != null ? `${etaMins} min` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">You earn</p>
              <p className="font-display font-bold text-primary">
                {ETB(order.rider_payout || order.delivery_fee)}
              </p>
            </div>
          </div>
          {Number(order.tip) > 0 && (
            <p className="rounded-lg bg-primary-soft p-2 text-center text-xs font-semibold text-accent-foreground">
              Customer tip included: {ETB(order.tip)}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-2 border-t border-border bg-card p-4">
        <Button size="lg" className="h-14 w-full text-base font-extrabold" onClick={onAccept}>
          ACCEPT ORDER
        </Button>
        <Button size="lg" variant="outline" className="w-full" onClick={onDecline}>
          Decline
        </Button>
      </div>
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
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [completed, setCompleted] = useState(false);

  const { data: shop } = useQuery({
    queryKey: ["flow-shop", order.shop_id],
    enabled: !!order.shop_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("shops")
        .select("name,address,lat,lng,phone")
        .eq("id", order.shop_id!)
        .maybeSingle();
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["flow-items", order.id],
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

  const completeDelivery = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("complete_delivery", {
        _order_id: order.id,
        _pin: pin.trim(),
      });
      if (error) throw error;
      if (proofFile) await uploadImage(proofFile, `delivery-proofs/${order.id}`);
      setCompleted(true);
      sounds.payment();
      navigator.vibrate?.([150, 80, 150]);
      setTimeout(() => {
        setPin("");
        setProofFile(null);
      }, 2200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete delivery");
    } finally {
      setBusy(false);
    }
  };

  const stage =
    order.status === "accepted"
      ? 1
      : order.status === "arrived_at_merchant"
        ? 2
        : order.status === "picked_up"
          ? 3
          : 4;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card">
        <div>
          <p className="font-display font-bold">{order.order_code}</p>
          <p className="text-xs text-muted-foreground">
            {ETB(order.total)} · {order.payment_method} · {order.payment_status}
          </p>
        </div>
        <p className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-accent-foreground">
          {STATUS_LABEL[order.status as OrderStatus] ?? order.status}
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
          <p className="font-display text-lg font-bold">Stage 1 · Head to the merchant</p>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <span className="font-semibold">{shop?.name ?? "Merchant"}</span>
              {shop?.address && <span className="block text-muted-foreground">{shop.address}</span>}
            </span>
          </p>
          {navigateUrl(shop?.lat, shop?.lng) && (
            <Button variant="outline" className="w-full" asChild>
              <a href={navigateUrl(shop?.lat, shop?.lng)!} target="_blank" rel="noreferrer">
                <Navigation className="mr-2 h-4 w-4" /> NAVIGATE
              </a>
            </Button>
          )}
          <Button
            size="lg"
            className="h-14 w-full text-base font-extrabold"
            onClick={() => onStatus("arrived_at_merchant")}
          >
            ARRIVED AT MERCHANT
          </Button>
        </div>
      )}

      {stage === 2 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="font-display text-lg font-bold">Stage 2 · Verify the pickup</p>
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
            PICKED UP ORDER
          </Button>
        </div>
      )}

      {stage === 3 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="font-display text-lg font-bold">Stage 3 · Deliver to the customer</p>
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
                <Phone className="mr-2 h-4 w-4" /> Call customer
              </a>
            </Button>
          )}
          {navigateUrl(order.lat, order.lng) && (
            <Button variant="outline" className="w-full" asChild>
              <a href={navigateUrl(order.lat, order.lng)!} target="_blank" rel="noreferrer">
                <Navigation className="mr-2 h-4 w-4" /> NAVIGATE TO CUSTOMER
              </a>
            </Button>
          )}
          <Button
            size="lg"
            className="h-14 w-full text-base font-extrabold"
            onClick={() => onStatus("on_the_way")}
          >
            ON THE WAY
          </Button>
        </div>
      )}

      {stage === 4 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
          {completed ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-primary text-primary-foreground">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <p className="mt-4 font-display text-xl font-extrabold">Delivery complete!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {ETB(order.rider_payout || order.delivery_fee)} added to your balance.
              </p>
            </div>
          ) : (
            <>
              <p className="font-display text-lg font-bold">Stage 4 · Confirm delivery</p>
              <p className="text-sm text-muted-foreground">
                Ask the customer for their 4-digit delivery PIN to complete this order.
              </p>
              <input
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="h-14 w-full rounded-xl border border-input bg-background text-center font-display text-2xl font-extrabold tracking-[0.5em] outline-none focus:border-primary"
              />
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Photo proof (optional)</p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-xs file:font-semibold"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <Button
                size="lg"
                className="h-14 w-full text-base font-extrabold"
                disabled={busy || pin.length < 4}
                onClick={() => void completeDelivery()}
              >
                {busy ? "Completing…" : "COMPLETE DELIVERY"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function OrdersTab({
  available,
  active,
  online,
  onAccept,
}: {
  available: OrderRow[];
  active: OrderRow[];
  online: boolean;
  onAccept: (o: OrderRow) => void;
}) {
  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div>
          <h2 className="font-display text-base font-bold">Active delivery</h2>
          {active.map((o) => (
            <p
              key={o.id}
              className="mt-2 rounded-xl border border-primary/40 bg-primary-soft p-3 text-sm"
            >
              <span className="font-semibold">{o.order_code}</span> —{" "}
              {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
            </p>
          ))}
        </div>
      )}
      <div>
        <h2 className="font-display text-base font-bold">Available orders</h2>
        {!online ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Go online to receive dispatched orders.
          </p>
        ) : available.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No orders right now — you'll get a loud alert when one is dispatched.
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {available.map((o) => (
              <li key={o.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="font-display font-bold">{o.order_code}</p>
                  <p className="font-semibold text-primary">
                    {ETB(o.rider_payout || o.delivery_fee)}
                  </p>
                </div>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  {o.delivery_address}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ETB(o.total)} · {o.payment_method} · Dispatched{" "}
                  {formatDate(o.dispatched_at ?? o.created_at)}
                </p>
                <Button className="mt-3 w-full" onClick={() => onAccept(o)}>
                  View & accept
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const startOfWeek = (d: Date) => {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return new Date(day.getTime() - ((day.getDay() + 6) % 7) * 86400000);
};

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
  const [busy, setBusy] = useState(false);

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const sum = (
    list: EarningRow[],
    key: "amount" | "base_fare" | "tip" | "bonus" | "distance_incentive",
  ) => list.reduce((s, e) => s + Number(e[key]), 0);
  const inRange = (from: Date) => earnings.filter((e) => new Date(e.created_at) >= from);

  const periods = [
    { label: "Today", list: inRange(dayStart) },
    { label: "This week", list: inRange(weekStart) },
    { label: "This month", list: inRange(monthStart) },
  ];

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
      toast.success("Instant payout requested to your Telebirr / bank account.");
      void qc.invalidateQueries({ queryKey: ["rider-earnings"] });
      void qc.invalidateQueries({ queryKey: ["rider-payouts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not request payout");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {periods.map((p) => (
          <div
            key={p.label}
            className="rounded-xl border border-border bg-card p-3 text-center shadow-card"
          >
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{p.label}</p>
            <p className="mt-1 font-display text-sm font-extrabold">{ETB(sum(p.list, "amount"))}</p>
            <p className="text-[10px] text-muted-foreground">{p.list.length} trips</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-primary p-5 text-primary-foreground">
        <div>
          <p className="text-xs opacity-90">Available for cashout</p>
          <p className="font-display text-2xl font-extrabold">{ETB(pendingPayout)}</p>
        </div>
        <Button
          variant="secondary"
          disabled={pendingPayout <= 0 || busy}
          onClick={() => void requestPayout()}
        >
          {busy ? "Requesting…" : "Instant payout"}
        </Button>
      </div>

      {payouts.length > 0 && (
        <div>
          <h3 className="font-display text-base font-bold">Payout requests</h3>
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
        <h3 className="font-display text-base font-bold">Earning history</h3>
        {earnings.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Complete a delivery to start earning.
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
                  Base {ETB(e.base_fare)}
                  {Number(e.distance_incentive) > 0 &&
                    ` · Distance ${ETB(e.distance_incentive)} (${e.distance_km} km)`}
                  {Number(e.tip) > 0 && ` · Tip ${ETB(e.tip)}`}
                  {Number(e.bonus) > 0 && ` · Bonus ${ETB(e.bonus)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProfileTab({ rider, name }: { rider: Record<string, unknown> | null; name: string }) {
  const { profile } = useAuth();
  if (!rider) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const rows: [string, string][] = [
    ["Name", name],
    ["Phone", (profile?.phone as string) ?? "—"],
    ["Vehicle", String(rider["vehicle_type"] ?? "—")],
    ["National ID", String(rider["national_id"] ?? "—")],
    [
      "Verification",
      String(rider["verification_status"] ?? "pending_verification").replace(/_/g, " "),
    ],
    [
      "Payout",
      `${String(rider["payout_method"] ?? "telebirr").replace("_", " ")} · ${String(rider["payout_account"] ?? "—")}`,
    ],
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft font-display text-lg font-extrabold text-accent-foreground">
            {(name || "R").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="font-display text-lg font-bold">{name}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Bike className="h-3.5 w-3.5" /> {String(rider["vehicle_type"] ?? "")} rider
            </p>
          </div>
        </div>
      </div>
      <dl className="divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-4 py-3 text-sm">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium capitalize">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
