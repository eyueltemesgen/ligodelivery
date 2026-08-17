import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ETB, formatDate } from "@/lib/format";
import { ORDER_STATUSES, STATUS_LABEL, statusTone, notify, type OrderStatus } from "@/lib/orders";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RIDER_FLOW: OrderStatus[] = ["rider_assigned", "picked_up", "on_the_way", "delivered"];

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

function RiderPortal() {
  const { user, isRider, loading } = useAuth();
  const qc = useQueryClient();

  const { data: rider } = useQuery({
    queryKey: ["rider-me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("riders").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["rider-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("rider_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

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
    void qc.invalidateQueries({ queryKey: ["rider-orders"] });
    toast.success("Status updated");
  };

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

      <h2 className="mt-8 font-display text-xl font-bold">Assigned deliveries</h2>
      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No deliveries assigned yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
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
              <p className="mt-2 text-sm">{o.delivery_address}</p>
              <p className="text-sm text-muted-foreground">{o.customer_name} · {o.customer_phone} · {ETB(o.total)} ({o.payment_method})</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {RIDER_FLOW.map((s) => (
                  <Button key={s} size="sm" variant={o.status === s ? "default" : "outline"} onClick={() => void setStatus(o.id, s, o.customer_id, o.order_code)}>
                    {STATUS_LABEL[s]}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
