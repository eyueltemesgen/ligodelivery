import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Battery, Gauge, MapPin, PauseCircle, Phone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ETB, formatDate } from "@/lib/format";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders";
import { publicSettingsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import type { LiveMapDestination, LiveMapRider, LiveMapShop } from "@/components/admin/LiveMap";

const LiveMap = lazy(() => import("@/components/admin/LiveMap"));

const ACTIVE_STATUSES = ["accepted", "arrived_at_merchant", "picked_up", "on_the_way"];

export const Route = createFileRoute("/admin/map")({
  head: () => ({
    meta: [
      { title: "Live Delivery Map — Ligo Admin" },
      {
        name: "description",
        content: "Real-time rider, merchant and delivery tracking for LIGO dispatch.",
      },
      { property: "og:title", content: "Live Delivery Map — Ligo Admin" },
      { property: "og:description", content: "Real-time dispatch tracking." },
    ],
  }),
  component: LiveMapPage,
});

function LiveMapPage() {
  const qc = useQueryClient();
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);

  const { data: settings = {} } = useQuery(publicSettingsQuery);
  const dispatchPaused =
    (settings["platform"] as { dispatch_paused?: boolean } | undefined)?.dispatch_paused === true;

  const { data: riders = [] } = useQuery({
    queryKey: ["admin-map-riders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("riders")
        .select("id,is_online,is_approved,lat,lng,speed,battery,location_updated_at");
      const ids = (data ?? []).map((r) => r.id);
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id,full_name,phone").in("id", ids)
        : { data: [] };
      return (data ?? []).map((r) => ({
        ...r,
        name: profiles?.find((p) => p.id === r.id)?.full_name || "Rider",
        phone: profiles?.find((p) => p.id === r.id)?.phone ?? "",
      }));
    },
  });

  const { data: activeOrders = [] } = useQuery({
    queryKey: ["admin-map-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,order_code,status,rider_id,lat,lng,total,delivery_address")
        .in("status", ACTIVE_STATUSES);
      return data ?? [];
    },
  });

  const { data: shops = [] } = useQuery({
    queryKey: ["admin-map-shops"],
    queryFn: async () => {
      const [{ data: shopRows }, { data: orderRows }] = await Promise.all([
        supabase.from("shops").select("id,name,lat,lng").eq("is_active", true),
        supabase.from("orders").select("shop_id").not("status", "in", '("delivered","cancelled")'),
      ]);
      const counts = (orderRows ?? []).reduce<Record<string, number>>((acc, o) => {
        if (o.shop_id) acc[o.shop_id] = (acc[o.shop_id] ?? 0) + 1;
        return acc;
      }, {});
      return (shopRows ?? []).map((s) => ({ ...s, activeOrders: counts[s.id] ?? 0 }));
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-map-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "riders" }, () => {
        void qc.invalidateQueries({ queryKey: ["admin-map-riders"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        void qc.invalidateQueries({ queryKey: ["admin-map-orders"] });
        void qc.invalidateQueries({ queryKey: ["admin-map-shops"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const deliveringIds = useMemo(
    () => new Set(activeOrders.map((o) => o.rider_id).filter(Boolean)),
    [activeOrders],
  );

  const mapRiders: LiveMapRider[] = riders
    .filter((r) => r.is_approved && r.lat != null && r.lng != null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      lat: r.lat!,
      lng: r.lng!,
      state: !r.is_online ? "offline" : deliveringIds.has(r.id) ? "delivering" : "idle",
    }));

  const mapShops: LiveMapShop[] = shops
    .filter((s) => s.lat != null && s.lng != null)
    .map((s) => ({
      id: s.id,
      name: s.name,
      lat: s.lat!,
      lng: s.lng!,
      activeOrders: s.activeOrders,
    }));

  const mapDestinations: LiveMapDestination[] = activeOrders
    .filter((o) => o.lat != null && o.lng != null)
    .map((o) => ({
      orderId: o.id,
      code: o.order_code,
      lat: o.lat!,
      lng: o.lng!,
      riderId: o.rider_id,
    }));

  const selectedRider = riders.find((r) => r.id === selectedRiderId) ?? null;
  const selectedOrder = activeOrders.find((o) => o.rider_id === selectedRiderId) ?? null;

  const toggleDispatchPause = async (paused: boolean) => {
    const { data: row } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "platform")
      .maybeSingle();
    const value = { ...((row?.value ?? {}) as Record<string, unknown>), dispatch_paused: paused };
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "platform", value, is_public: true }, { onConflict: "key" });
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["settings-public"] });
    toast.success(paused ? "Dispatch paused platform-wide" : "Dispatch resumed");
  };

  const reassign = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ rider_id: null, status: "dispatched" })
      .eq("id", orderId);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-map-orders"] });
    toast.success("Order re-broadcast to all riders");
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] gap-4">
      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border shadow-card">
        <ClientOnly fallback={<div className="h-full w-full bg-surface" />}>
          <Suspense fallback={<div className="h-full w-full bg-surface" />}>
            <LiveMap
              riders={mapRiders}
              shops={mapShops}
              destinations={mapDestinations}
              onSelectRider={setSelectedRiderId}
            />
          </Suspense>
        </ClientOnly>
      </div>

      {selectedRider && (
        <aside className="w-80 shrink-0 space-y-4 overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">{selectedRider.name}</h2>
              <p className="text-xs text-muted-foreground">
                {selectedRider.is_online
                  ? deliveringIds.has(selectedRider.id)
                    ? "On delivery"
                    : "Online · idle"
                  : "Offline"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRiderId(null)}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              aria-label="Close rider panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <dt className="text-muted-foreground">Speed</dt>
              <dd className="ml-auto font-medium">
                {selectedRider.speed != null
                  ? `${Math.round(selectedRider.speed * 3.6)} km/h`
                  : "—"}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <Battery className="h-4 w-4 text-muted-foreground" />
              <dt className="text-muted-foreground">Battery</dt>
              <dd className="ml-auto font-medium">
                {selectedRider.battery != null ? `${selectedRider.battery}%` : "—"}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <dt className="text-muted-foreground">GPS</dt>
              <dd className="ml-auto font-mono text-xs">
                {selectedRider.lat?.toFixed(5) ?? "—"}, {selectedRider.lng?.toFixed(5) ?? "—"}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="text-muted-foreground">Last update</dt>
              <dd className="ml-auto text-xs">{formatDate(selectedRider.location_updated_at)}</dd>
            </div>
          </dl>

          {selectedOrder ? (
            <div className="rounded-lg border border-border bg-surface p-3 text-sm">
              <p className="font-semibold">{selectedOrder.order_code}</p>
              <p className="text-xs text-muted-foreground">
                {STATUS_LABEL[selectedOrder.status as OrderStatus] ?? selectedOrder.status} ·{" "}
                {ETB(selectedOrder.total)}
              </p>
              <p className="mt-1 text-xs">{selectedOrder.delivery_address}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => void reassign(selectedOrder.id)}
              >
                Reassign order
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active order assigned.</p>
          )}

          <div className="space-y-2">
            <Button size="sm" className="w-full" asChild disabled={!selectedRider.phone}>
              <a href={`tel:${selectedRider.phone}`}>
                <Phone className="mr-2 h-4 w-4" /> Contact rider
              </a>
            </Button>
            <Button
              size="sm"
              variant={dispatchPaused ? "default" : "outline"}
              className="w-full"
              onClick={() => void toggleDispatchPause(!dispatchPaused)}
            >
              <PauseCircle className="mr-2 h-4 w-4" />
              {dispatchPaused ? "Resume dispatch" : "Pause dispatch"}
            </Button>
          </div>
        </aside>
      )}
    </div>
  );
}
