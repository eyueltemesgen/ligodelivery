import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ETB, formatDate } from "@/lib/format";
import { STATUS_LABEL, TIMELINE, statusTone, type OrderStatus } from "@/lib/orders";
import { PROOF_BUCKET, uploadImage } from "@/lib/media";
import { publicSettingsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const OrderMap = lazy(() => import("@/components/ligo/OrderMap"));

export const Route = createFileRoute("/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order tracking — Ligo Delivery" },
      { name: "description", content: "Live tracking, delivery timeline and payment status for your Ligo order." },
      { property: "og:title", content: "Order tracking — Ligo Delivery" },
      { property: "og:description", content: "Track your Ligo order in real time." },
    ],
  }),
  component: OrderDetail,
});

const BISHOFTU: [number, number] = [8.7522, 38.9969];

function OrderDetail() {
  const { orderId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: order } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
      return data;
    },
  });
  const { data: items = [] } = useQuery({
    queryKey: ["order-items", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      return data ?? [];
    },
  });
  const { data: proofs = [] } = useQuery({
    queryKey: ["proofs", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("payment_proofs").select("*").eq("order_id", orderId);
      return data ?? [];
    },
  });
  const { data: rider } = useQuery({
    queryKey: ["rider", order?.rider_id],
    enabled: !!order?.rider_id,
    queryFn: async () => {
      const { data } = await supabase.from("riders").select("id,lat,lng,vehicle_type").eq("id", order!.rider_id!).maybeSingle();
      return data;
    },
  });
  const { data: settings = {} } = useQuery(publicSettingsQuery);

  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, () => {
        void qc.invalidateQueries({ queryKey: ["order", orderId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId, qc]);

  if (!order) return <div className="container-ligo py-16 text-muted-foreground">Loading order…</div>;

  const currentIndex = TIMELINE.indexOf(order.status as OrderStatus);
  const payment = (settings[`payment_${order.payment_method}`] ?? {}) as Record<string, string>;
  const needsProof = order.payment_method !== "cash" && order.payment_status !== "paid";

  return (
    <div className="container-ligo grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div>
          <Link to="/orders" className="text-sm text-muted-foreground hover:text-foreground">← All orders</Link>
          <h1 className="mt-2 font-display text-3xl font-extrabold">{order.order_code}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Placed {formatDate(order.created_at)}</p>
          <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusTone(order.status)}`}>
            {STATUS_LABEL[order.status as OrderStatus] ?? order.status}
          </span>
        </div>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Delivery progress</h2>
          <ol className="mt-4 space-y-3">
            {TIMELINE.map((s, idx) => {
              const done = currentIndex >= idx && order.status !== "cancelled";
              return (
                <li key={s} className="flex items-center gap-3">
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                  </span>
                  <span className={`text-sm ${done ? "font-semibold" : "text-muted-foreground"}`}>{STATUS_LABEL[s]}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 font-display text-lg font-bold">Live tracking</h2>
          <ClientOnly fallback={<div className="h-72 w-full rounded-xl bg-surface" />}>
            <Suspense fallback={<div className="h-72 w-full rounded-xl bg-surface" />}>
              <OrderMap
                lat={order.lat ?? BISHOFTU[0]}
                lng={order.lng ?? BISHOFTU[1]}
                riderLat={rider?.lat ?? null}
                riderLng={rider?.lng ?? null}
              />
            </Suspense>
          </ClientOnly>
          <p className="mt-2 text-xs text-muted-foreground">
            {rider ? "Your rider's location updates live." : "A rider will be assigned shortly."}
          </p>
        </section>

        {needsProof && user?.id === order.customer_id && (
          <PaymentProof orderId={orderId} userId={user.id} method={order.payment_method} amount={Number(order.total)} details={payment} existing={proofs.length > 0} />
        )}
      </div>

      <aside className="h-fit space-y-3 rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">Order summary</h2>
        <ul className="space-y-1 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span className="text-muted-foreground">{i.quantity} × {i.product_name}</span>
              <span>{ETB(Number(i.unit_price) * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-border pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{ETB(order.subtotal)}</span></div>
          <div className="flex justify-between"><span>Delivery</span><span>{ETB(order.delivery_fee)}</span></div>
          <div className="mt-2 flex justify-between font-display text-base font-bold"><span>Total</span><span>{ETB(order.total)}</span></div>
        </div>
        <div className="border-t border-border pt-3 text-sm text-muted-foreground">
          <p>Payment: <span className="font-medium text-foreground uppercase">{order.payment_method}</span> · {order.payment_status}</p>
          <p className="mt-1">{order.delivery_address}</p>
          <p>{order.customer_name} · {order.customer_phone}</p>
        </div>
      </aside>
    </div>
  );
}

function PaymentProof({
  orderId, userId, method, amount, details, existing,
}: {
  orderId: string; userId: string; method: string; amount: number; details: Record<string, string>; existing: boolean;
}) {
  const qc = useQueryClient();
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let path: string | null = null;
      if (file) path = await uploadImage(file, `${userId}/${orderId}`, PROOF_BUCKET);
      const { error } = await supabase.from("payment_proofs").insert({
        order_id: orderId, user_id: userId, method, reference, image_url: path, amount,
      });
      if (error) throw error;
      await supabase.from("orders").update({ status: "payment_verification" }).eq("id", orderId);
      void qc.invalidateQueries({ queryKey: ["proofs", orderId] });
      toast.success("Receipt submitted for verification");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="font-display text-lg font-bold">Complete your {method.toUpperCase()} payment</h2>
      <div className="rounded-lg bg-surface p-4 text-sm">
        {Object.keys(details).length === 0 ? (
          <p className="text-muted-foreground">Payment account details will be shared by our team shortly.</p>
        ) : (
          <ul className="space-y-1">
            {Object.entries(details).map(([k, v]) => (
              <li key={k}><span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}: </span><span className="font-semibold">{String(v)}</span></li>
            ))}
          </ul>
        )}
        <p className="mt-2 font-semibold">Amount to send: {ETB(amount)}</p>
      </div>
      {existing && <p className="text-sm text-muted-foreground">A receipt is already under review. You can submit another if needed.</p>}
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="ref">Transaction reference</Label>
          <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rc">Receipt screenshot</Label>
          <Input id="rc" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <Button type="submit" disabled={busy}><Upload className="mr-2 h-4 w-4" />{busy ? "Submitting…" : "Submit receipt"}</Button>
      </form>
    </section>
  );
}
