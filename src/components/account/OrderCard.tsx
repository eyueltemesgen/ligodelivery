import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Banknote,
  CreditCard,
  MapPin,
  MessageCircle,
  RefreshCw,
  Store,
  Truck,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { shopsByIdsQuery, type OrderItemRow, type OrderRow, type ShopLite } from "@/lib/account";
import { ETB, formatDate } from "@/lib/format";
import { STATUS_LABEL, canCancelOrder, statusTone, type OrderStatus } from "@/lib/orders";
import { StorageImage } from "@/lib/media";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
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

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(status)} ${className}`}
    >
      {STATUS_LABEL[status as OrderStatus] ?? status}
    </span>
  );
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash on delivery",
  mobile_money: "Mobile Money",
  telebirr: "Telebirr",
  cbe: "CBE Birr",
  boa: "Bank of Abyssinia",
  chapa: "Chapa",
};

export const paymentLabel = (method: string) => PAYMENT_LABEL[method] ?? method;

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  pending: "Pending verification",
  pending_verification: "Pending verification",
  paid: "Paid",
  verified: "Verified",
  rejected: "Rejected",
  refunded: "Refunded",
};

export const paymentStatusLabel = (status: string) => PAYMENT_STATUS_LABEL[status] ?? status;

function paymentIcon(method: string) {
  if (method === "cash") return Banknote;
  return CreditCard;
}

export function OrderCard({ order }: { order: OrderRow }) {
  const { data: shops = {} } = useQuery(shopsByIdsQuery(order.shop_id ? [order.shop_id] : []));
  const { data: itemsByOrder = {} } = useQuery({
    queryKey: ["account-order-items", order.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_items")
        .select("id,order_id,product_id,product_name,image_url,unit_price,quantity")
        .eq("order_id", order.id);
      return { [order.id]: (data ?? []) as OrderItemRow[] };
    },
  });
  const items = itemsByOrder[order.id] ?? [];
  const shop: ShopLite | undefined = order.shop_id ? shops[order.shop_id] : undefined;
  const PayIcon = paymentIcon(order.payment_method);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface/60 px-4 py-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold">{order.order_code}</p>
          <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
        </div>
        <span className="ml-auto">
          <StatusBadge status={order.status} />
        </span>
      </header>

      <div className="space-y-3 px-4 py-4">
        {shop && (
          <div className="flex items-center gap-2 text-sm">
            <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Link
              to="/shops/$shopId"
              params={{ shopId: shop.id }}
              className="font-medium hover:text-primary"
            >
              {shop.name}
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <ul className="space-y-2">
            {items.slice(0, 3).map((it) => (
              <li key={it.id} className="flex items-center gap-3">
                <StorageImage
                  path={it.image_url}
                  alt={it.product_name}
                  className="h-11 w-11 shrink-0 rounded-lg object-cover"
                />
                <span className="min-w-0 flex-1 truncate text-sm">{it.product_name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">× {it.quantity}</span>
                <span className="shrink-0 text-sm font-medium">
                  {ETB(Number(it.unit_price) * it.quantity)}
                </span>
              </li>
            ))}
            {items.length > 3 && (
              <li className="text-xs text-muted-foreground">+{items.length - 3} more items</li>
            )}
          </ul>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium">{ETB(order.subtotal)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Delivery fee</dt>
            <dd className="font-medium">{ETB(order.delivery_fee)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-display text-sm font-bold">{ETB(order.total)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <PayIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <dt className="text-muted-foreground">Payment</dt>
              <dd className="font-medium">{paymentLabel(order.payment_method)}</dd>
            </div>
          </div>
          <div>
            <dt className="text-muted-foreground">Payment status</dt>
            <dd className="font-medium">{paymentStatusLabel(order.payment_status)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className="font-medium">
                {order.rider_id ? "Rider assigned" : "Awaiting rider"}
              </dd>
            </div>
          </div>
        </dl>

        {order.delivery_address && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {order.delivery_address}
          </p>
        )}
      </div>

      <footer className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
        <Button asChild size="sm">
          <Link to="/account/orders/$orderId" params={{ orderId: order.id }}>
            View order
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/account/orders/$orderId" params={{ orderId: order.id }}>
            <Truck className="mr-1.5 h-3.5 w-3.5" />
            Track order
          </Link>
        </Button>
        <ReorderButton items={items} shop={shop} />
        <Button asChild size="sm" variant="outline">
          <Link to="/account/help" search={{ order: order.order_code }}>
            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
            Support
          </Link>
        </Button>
        <CancelOrderButton order={order} />
      </footer>
    </article>
  );
}

function ReorderButton({ items, shop }: { items: OrderItemRow[]; shop?: ShopLite | undefined }) {
  const { add, items: cartItems } = useCart();
  const disabled = items.length === 0;
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={disabled}
      onClick={() => {
        const conflict = cartItems.length > 0 && shop?.id && cartItems[0]?.shopId !== shop.id;
        for (const it of items) {
          add({
            productId: it.product_id ?? it.id,
            shopId: shop?.id ?? "",
            shopName: shop?.name ?? "Shop",
            name: it.product_name,
            imagePath: it.image_url,
            unitPrice: Number(it.unit_price),
          });
        }
        toast.success(
          conflict
            ? `Cart replaced with items from ${shop?.name ?? "this shop"}`
            : "Items added to your cart",
        );
      }}
    >
      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
      Reorder
    </Button>
  );
}

function CancelOrderButton({ order }: { order: OrderRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!canCancelOrder(order.status)) return null;

  const cancel = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id);
    setBusy(false);
    setOpen(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Order cancelled");
    void qc.invalidateQueries({ queryKey: ["account-orders"] });
    void qc.invalidateQueries({ queryKey: ["account-order", order.id] });
    void qc.invalidateQueries({ queryKey: ["account-summary"] });
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <X className="mr-1.5 h-3.5 w-3.5" />
        Cancel
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order {order.order_code}?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. If you've already paid, our team will arrange a refund after
              cancellation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep order</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void cancel();
              }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Cancelling…" : "Cancel order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
