import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike, Clock, MapPin, Phone, TrendingUp, Wallet, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ETB, formatDate } from "@/lib/format";
import { STATUS_LABEL, statusTone, notify, type OrderStatus } from "@/lib/orders";
import { sounds, loadAudioSettings, primeAudio } from "@/lib/audio";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const RiderTrackingMap = lazy(() => import("@/components/ligo/RiderTrackingMap"));

const RIDER_FLOW: OrderStatus[] = ["rider_assigned", "picked_up", "on_the_way", "delivered"];
const BISHOFTU: [number, number] = [8.7522, 38.9969];

export const Route = createFileRoute("/rider/")({
  head: () => ({
    meta: [
      { title: "Rider portal — Ligo Delivery" },
      { name: "description", content: "Manage your assigned Ligo deliveries, go online and update delivery status." },
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
};

type EarningRow = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  order_id: string | null;
};

function RiderPortal() {
  const { user, isRider, loading } = useAuth();
  const qc = useQueryClient();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

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
        .select("id,order_code,status,total,delivery_fee,rider_payout,payment_method,payment_status,customer_id,customer_name,customer_phone,delivery_address,lat,lng,created_at,shop_id")
        .eq("rider_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as OrderRow[];
    },
  });

  const { data: earnings = [] } = useQuery<EarningRow[]>({
    queryKey: ["rider-earnings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("rider_earnings")
        .select("id,amount,status,created_at,order_id")
        .eq("rider_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as EarningRow[];
    },
  });

  useEffect(() => {
    void loadAudioSettings();
    const handler = () => primeAudio();
    window.addEventListener("pointerdown", handler, { once: true });
    return () => window.removeEventListener("pointerdown", handler);
  }, []);

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
          .update({ lat: pos.coords.latitude, lng: pos.coords.longitude, location_updated_at: new Date().toISOString() })
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
        <Button asChild className="mt-6"><Link to="/auth" search={{ mode: "login", role: "customer" }}>Sign in</Link></Button>
      </div>
    );
  if (!isRider)
    return (
      <div className="container-ligo py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">You're not registered as a rider</h1>
        <Button asChild className="mt-6"><Link to="/rider/join">Apply to become a rider</Link></Button>
      </div>
    );

  const toggleOnline = async (value: boolean) => {
    await supabase.from("riders").update({ is_online: value }).eq("id", user.id);
    void qc.invalidateQueries({ queryKey: ["rider-me"] });
  };

  const setStatus = async (orderId: string, status: string, customerId: string, code: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await notify(customerId, `Order ${code} updated`, STATUS_LABEL[status as OrderStatus] ?? status, "order", orderId);
    sounds.statusUpdate();
    void qc.invalidateQueries({ queryKey: ["rider-orders"] });
    if (status === "delivered") void qc.invalidateQueries({ queryKey: ["rider-earnings"] });
    toast.success("Status updated");
  };

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === "delivered");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEarnings = earnings.filter((e) => new Date(e.created_at) >= monthStart);
  const monthTotal = monthEarnings.reduce((s, e) => s + Number(e.amount), 0);
  const totalEarnings = earnings.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="container-ligo py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Rider portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rider?.is_approved ? "You're approved to take deliveries." : "Your account is pending admin approval."}
          </p>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <span className="text-sm font-medium">{rider?.is_online ? "Online" : "Offline"}</span>
          <Switch checked={!!rider?.is_online} onCheckedChange={(v) => void toggleOnline(v)} disabled={!rider?.is_approved} />
        </label>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="This month" value={ETB(monthTotal)} />
        <StatCard icon={TrendingUp} label="Total earnings" value={ETB(totalEarnings)} />
        <StatCard icon={Bike} label="Active deliveries" value={String(activeOrders.length)} />
        <StatCard icon={Clock} label="Completed" value={String(completedOrders.length)} />
      </div>

      <Tabs defaultValue="active" className="mt-8">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

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
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(o.status)}`}>
                      {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{o.delivery_address}</p>
                  <p className="text-sm text-muted-foreground">
                    {o.customer_name} · {ETB(o.total)} · Earning {ETB(o.rider_payout || o.delivery_fee)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="earnings">
          <EarningsPanel earnings={earnings} monthTotal={monthTotal} totalEarnings={totalEarnings} />
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
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(o.status)}`}>
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

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold">{value}</p>
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
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(order.status)}`}>
          {STATUS_LABEL[order.status as OrderStatus] ?? order.status}
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-sm">
        <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary" />{order.delivery_address}</p>
        <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />{order.customer_name} · {order.customer_phone}</p>
        <p className="text-muted-foreground">
          {ETB(order.total)} · {order.payment_method} · {order.payment_status} · Earning {ETB(order.rider_payout || order.delivery_fee)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {RIDER_FLOW.map((s) => (
          <Button key={s} size="sm" variant={order.status === s ? "default" : "outline"} onClick={() => onStatus(s)}>
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
              <RiderTrackingMap destLat={destLat} destLng={destLng} riderLat={null} riderLng={null} status={order.status} />
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

function EarningsPanel({
  earnings,
  monthTotal,
  totalEarnings,
}: {
  earnings: EarningRow[];
  monthTotal: number;
  totalEarnings: number;
}) {
  const now = new Date();
  const monthLabel = now.toLocaleString("en-GB", { month: "long", year: "numeric" });
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthCount = earnings.filter((e) => new Date(e.created_at) >= monthStart).length;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-primary-soft p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{monthLabel} earnings</p>
          <p className="mt-2 font-display text-3xl font-extrabold text-accent-foreground">{ETB(monthTotal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{monthCount} deliveries</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">All-time earnings</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{ETB(totalEarnings)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{earnings.length} deliveries</p>
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold">Earning history</h3>
        {earnings.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No earnings recorded yet. Complete a delivery to start earning.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {earnings.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                <div>
                  <p className="text-sm font-semibold">{ETB(e.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(e.created_at)}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${e.status === "paid" ? "bg-primary-soft text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
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
