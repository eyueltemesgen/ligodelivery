import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Copy,
  CreditCard,
  MapPin,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Store,
  Truck,
  Upload,
  User,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { orderQuery, shopsByIdsQuery } from "@/lib/account";
import { ETB, formatDate } from "@/lib/format";
import { canCancelOrder, isOrderOpen } from "@/lib/orders";
import { PROOF_BUCKET, StorageImage, uploadImage } from "@/lib/media";
import { publicSettingsQuery } from "@/lib/queries";
import { useCart } from "@/lib/cart";
import { AccountHeader } from "@/components/account/AccountShell";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { StatusBadge, paymentLabel, paymentStatusLabel } from "@/components/account/OrderCard";
import { AccountState, ErrorState, ListSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const OrderMap = lazy(() => import("@/components/ligo/OrderMap"));
const BISHOFTU: [number, number] = [8.7522, 38.9969];

export const Route = createFileRoute("/account/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order details — የኔ Go" },
      {
        name: "description",
        content: "Delivery timeline, payment and rider details for your order.",
      },
    ],
  }),
  component: OrderDetails,
});

function OrderDetails() {
  const { orderId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: order, isLoading, isError, refetch } = useQuery(orderQuery(orderId, user?.id));
  const { data: items = [] } = useQuery({
    queryKey: ["account-order-items-list", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      return data ?? [];
    },
  });
  const { data: shops = {} } = useQuery(shopsByIdsQuery(order?.shop_id ? [order.shop_id] : []));
  const { data: proofs = [] } = useQuery({
    queryKey: ["proofs", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_proofs")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: rider } = useQuery({
    queryKey: ["order-rider", order?.rider_id],
    enabled: !!order?.rider_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("riders")
        .select("id,vehicle_type,lat,lng,is_online")
        .eq("id", order!.rider_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: settings = {} } = useQuery(publicSettingsQuery);
  const { add } = useCart();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Live status updates while the order is open.
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`account-order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["account-order", orderId] });
          void qc.invalidateQueries({ queryKey: ["account-orders"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId, qc]);

  if (isLoading) {
    return (
      <>
        <div className="h-8 w-40 rounded bg-secondary" />
        <ListSkeleton rows={3} />
      </>
    );
  }
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!order)
    return (
      <AccountState
        icon={X}
        title="Order not found"
        description="This order doesn't exist or isn't linked to your account."
        action={
          <Button asChild>
            <Link to="/account/orders">Back to my orders</Link>
          </Button>
        }
      />
    );

  const shop = order.shop_id ? shops[order.shop_id] : undefined;
  const payment = (settings[`payment_${order.payment_method}`] ?? {}) as Record<string, string>;
  const needsProof = order.payment_method !== "cash" && order.payment_status !== "paid";
  const copy = (value: string, label: string) => {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const reorder = () => {
    for (const it of items) {
      add({
        productId: it.product_id ?? it.id,
        shopId: order.shop_id ?? "",
        shopName: shop?.name ?? "Shop",
        name: it.product_name,
        imagePath: it.image_url,
        unitPrice: Number(it.unit_price),
      });
    }
    toast.success("Items added to your cart");
  };

  const cancel = async () => {
    setCancelling(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id);
    setCancelling(false);
    setCancelOpen(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Order cancelled");
    void qc.invalidateQueries({ queryKey: ["account-order", orderId] });
    void qc.invalidateQueries({ queryKey: ["account-orders"] });
    void qc.invalidateQueries({ queryKey: ["account-summary"] });
  };

  return (
    <>
      <Link
        to="/account/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All orders
      </Link>

      <AccountHeader
        title={order.order_code}
        description={`Placed ${formatDate(order.created_at)}`}
        action={<StatusBadge status={order.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* Timeline */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 font-display text-lg font-bold">Delivery progress</h2>
            <OrderTimeline status={order.status} />
          </section>

          {/* Live tracking */}
          {isOrderOpen(order.status) && (
            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="mb-3 font-display text-lg font-bold">Live tracking</h2>
              <ClientOnly fallback={<div className="h-64 w-full rounded-xl bg-surface" />}>
                <Suspense fallback={<div className="h-64 w-full rounded-xl bg-surface" />}>
                  <OrderMap
                    lat={order.lat ?? BISHOFTU[0]}
                    lng={order.lng ?? BISHOFTU[1]}
                    riderLat={rider?.lat ?? null}
                    riderLng={rider?.lng ?? null}
                  />
                </Suspense>
              </ClientOnly>
              <p className="mt-2 text-xs text-muted-foreground">
                {rider
                  ? "Your rider's location updates live."
                  : "A rider will be assigned shortly."}
              </p>
            </section>
          )}

          {/* Items */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold">Items</h2>
              {shop && (
                <Link
                  to="/shops/$shopId"
                  params={{ shopId: shop.id }}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary"
                >
                  <Store className="h-4 w-4" />
                  {shop.name}
                </Link>
              )}
            </div>
            <ul className="divide-y divide-border">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 py-3">
                  <StorageImage
                    path={it.image_url}
                    alt={it.product_name}
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{it.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ETB(it.unit_price)} × {it.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {ETB(Number(it.unit_price) * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Payment */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-3 font-display text-lg font-bold">Payment</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Method</dt>
                <dd className="flex items-center gap-1.5 font-medium">
                  {order.payment_method === "cash" ? (
                    <Banknote className="h-4 w-4 text-primary" />
                  ) : (
                    <CreditCard className="h-4 w-4 text-primary" />
                  )}
                  {paymentLabel(order.payment_method)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{paymentStatusLabel(order.payment_status)}</dd>
              </div>
            </dl>

            {needsProof && (
              <div className="mt-4 space-y-4 rounded-lg bg-surface p-4">
                <div className="text-sm">
                  <p className="font-semibold">
                    Complete your {order.payment_method.toUpperCase()} payment
                  </p>
                  {Object.keys(payment).length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {Object.entries(payment)
                        .filter(([k]) => k !== "enabled" && k !== "instructions")
                        .map(([k, v]) => (
                          <li key={k} className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground capitalize">
                              {k.replace(/_/g, " ")}
                            </span>
                            <button
                              type="button"
                              onClick={() => copy(String(v), k.replace(/_/g, " "))}
                              className="flex items-center gap-1 font-semibold hover:text-primary"
                            >
                              {String(v)}
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-muted-foreground">
                      Payment account details will be shared by our team shortly.
                    </p>
                  )}
                  {payment["instructions"] && (
                    <p className="mt-2 text-xs text-muted-foreground">{payment["instructions"]}</p>
                  )}
                  <p className="mt-2 font-semibold">Amount to send: {ETB(order.total)}</p>
                </div>
                <PaymentProofForm
                  orderId={orderId}
                  userId={user!.id}
                  method={order.payment_method}
                  amount={Number(order.total)}
                  existing={proofs.length > 0}
                />
              </div>
            )}

            {proofs.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Receipts submitted
                </p>
                {proofs.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {p.reference ?? "Receipt"} · {formatDate(p.created_at)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.status === "approved"
                          ? "bg-primary-soft text-accent-foreground"
                          : p.status === "rejected"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning/20 text-warning-foreground"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Rider */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-3 font-display text-lg font-bold">Delivery</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="font-medium">{order.delivery_address ?? "—"}</dd>
                </div>
              </div>
              {order.delivery_instructions && (
                <div className="flex items-start gap-2">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-muted-foreground">Instructions</dt>
                    <dd className="font-medium">{order.delivery_instructions}</dd>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-muted-foreground">Recipient</dt>
                  <dd className="font-medium">
                    {order.customer_name} · {order.customer_phone}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-muted-foreground">Rider</dt>
                  <dd className="font-medium">
                    {order.rider_id
                      ? `${rider?.vehicle_type ? rider.vehicle_type : "Rider"} assigned`
                      : "Awaiting assignment"}
                  </dd>
                </div>
              </div>
            </dl>
            {order.delivery_pin && isOrderOpen(order.status) && (
              <p className="mt-4 rounded-lg bg-primary-soft p-3 text-center text-sm">
                Delivery PIN:{" "}
                <span className="font-display text-base font-extrabold tracking-widest text-accent-foreground">
                  {order.delivery_pin}
                </span>
                <span className="mt-0.5 block text-xs">
                  Share this with your rider to confirm delivery
                </span>
              </p>
            )}
          </section>
        </div>

        {/* Summary + actions */}
        <aside className="h-fit space-y-4 lg:sticky lg:top-20">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">Order summary</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{ETB(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery fee</dt>
                <dd>{ETB(order.delivery_fee)}</dd>
              </div>
              {Number(order.tip) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Rider tip</dt>
                  <dd>{ETB(order.tip)}</dd>
                </div>
              )}
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-primary">
                  <dt>Discount</dt>
                  <dd>−{ETB(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 font-display text-base font-bold">
                <dt>Total</dt>
                <dd>{ETB(order.total)}</dd>
              </div>
            </dl>
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <p>Order ID: {order.order_code}</p>
              <p>Placed: {formatDate(order.created_at)}</p>
            </div>
          </section>

          <section className="space-y-2 rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-base font-bold">Actions</h2>
            <Button className="w-full" onClick={reorder} disabled={items.length === 0}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reorder
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/account/help" search={{ order: order.order_code }}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Contact support
              </Link>
            </Button>
            {canCancelOrder(order.status) && (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setCancelOpen(true)}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel order
              </Button>
            )}
            {order.payment_status === "paid" && (
              <p className="flex items-center gap-1.5 pt-1 text-xs font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Payment confirmed
              </p>
            )}
            <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Payments are verified by the የኔ Go team
            </p>
          </section>
        </aside>
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order {order.order_code}?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. If you've already paid, our team will arrange a refund after
              cancellation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep order</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void cancel();
              }}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Cancelling…" : "Cancel order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PaymentProofForm({
  orderId,
  userId,
  method,
  amount,
  existing,
}: {
  orderId: string;
  userId: string;
  method: string;
  amount: number;
  existing: boolean;
}) {
  const qc = useQueryClient();
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Attach a screenshot of your payment receipt");
      return;
    }
    setBusy(true);
    try {
      const path = await uploadImage(file, `${userId}/${orderId}`, PROOF_BUCKET);
      const { error } = await supabase.from("payment_proofs").insert({
        order_id: orderId,
        user_id: userId,
        method,
        reference: reference.trim() || null,
        image_url: path,
        amount,
        admin_note: note.trim() || null,
      });
      if (error) throw error;
      setReference("");
      setNote("");
      setFile(null);
      void qc.invalidateQueries({ queryKey: ["proofs", orderId] });
      toast.success("Receipt submitted for verification");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 border-t border-border pt-4">
      {existing && (
        <p className="text-xs text-muted-foreground">
          A receipt is already under review. You can submit another if needed.
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="proof-ref">Transaction reference</Label>
        <Input
          id="proof-ref"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. FT23XXXXXX"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="proof-note">Note (optional)</Label>
        <Textarea
          id="proof-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Anything our team should know"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="proof-file">Receipt screenshot</Label>
        <Input
          id="proof-file"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        <Upload className="mr-2 h-4 w-4" />
        {busy ? "Submitting…" : "Submit receipt"}
      </Button>
    </form>
  );
}
