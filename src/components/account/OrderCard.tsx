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
import {
  STATUS_LABEL,
  STATUS_LABEL_KEY,
  canCancelOrder,
  statusTone,
  type OrderStatus,
} from "@/lib/orders";
import { useLanguage } from "@/hooks/useLanguage";
import type { TranslationKey } from "@/lib/i18n";
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
  const { t } = useLanguage();
  const key = STATUS_LABEL_KEY[status as OrderStatus];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(status)} ${className}`}
    >
      {key ? t(key) : (STATUS_LABEL[status as OrderStatus] ?? status)}
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

const PAYMENT_LABEL_KEY: Record<string, TranslationKey> = {
  cash: "pay_cash",
  mobile_money: "pay_mobile_money",
  telebirr: "pay_telebirr",
  cbe: "pay_cbe",
  boa: "pay_boa",
  chapa: "pay_chapa",
};

/** i18n key for a payment method, or undefined for an unknown method. */
export const paymentLabelKey = (method: string): TranslationKey | undefined =>
  PAYMENT_LABEL_KEY[method];

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

const PAYMENT_STATUS_LABEL_KEY: Record<string, TranslationKey> = {
  unpaid: "payment_status_unpaid",
  pending: "payment_status_pending_verification",
  pending_verification: "payment_status_pending_verification",
  paid: "payment_status_paid",
  verified: "payment_status_verified",
  rejected: "payment_status_rejected",
  refunded: "payment_status_refunded",
};

/** i18n key for a payment status, or undefined for an unknown status. */
export const paymentStatusLabelKey = (status: string): TranslationKey | undefined =>
  PAYMENT_STATUS_LABEL_KEY[status];

function paymentIcon(method: string) {
  if (method === "cash") return Banknote;
  return CreditCard;
}

export function OrderCard({ order }: { order: OrderRow }) {
  const { t } = useLanguage();
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
              <li className="text-xs text-muted-foreground">
                {t("oc_more_items", { count: items.length - 3 })}
              </li>
            )}
          </ul>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">{t("cart_subtotal")}</dt>
            <dd className="font-medium">{ETB(order.subtotal)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("checkout_delivery")}</dt>
            <dd className="font-medium">{ETB(order.delivery_fee)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("checkout_total")}</dt>
            <dd className="font-display text-sm font-bold">{ETB(order.total)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <PayIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <dt className="text-muted-foreground">{t("checkout_payment_method")}</dt>
              <dd className="font-medium">
                {(() => {
                  const key = PAYMENT_LABEL_KEY[order.payment_method];
                  return key ? t(key) : paymentLabel(order.payment_method);
                })()}
              </dd>
            </div>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("oc_payment_status")}</dt>
            <dd className="font-medium">
              {(() => {
                const key = PAYMENT_STATUS_LABEL_KEY[order.payment_status];
                return key ? t(key) : paymentStatusLabel(order.payment_status);
              })()}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <dt className="text-muted-foreground">{t("checkout_delivery")}</dt>
              <dd className="font-medium">
                {order.rider_id ? t("oc_rider_assigned") : t("oc_awaiting_rider")}
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
            {t("oc_view_order")}
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/account/orders/$orderId" params={{ orderId: order.id }}>
            <Truck className="mr-1.5 h-3.5 w-3.5" />
            {t("oc_track_order")}
          </Link>
        </Button>
        <ReorderButton items={items} shop={shop} />
        <Button asChild size="sm" variant="outline">
          <Link to="/account/help" search={{ order: order.order_code }}>
            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
            {t("oc_support")}
          </Link>
        </Button>
        <CancelOrderButton order={order} />
      </footer>
    </article>
  );
}

function ReorderButton({ items, shop }: { items: OrderItemRow[]; shop?: ShopLite | undefined }) {
  const { t } = useLanguage();
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
            shopName: shop?.name ?? t("oc_shop_fallback"),
            name: it.product_name,
            imagePath: it.image_url,
            unitPrice: Number(it.unit_price),
          });
        }
        toast.success(
          conflict
            ? t("oc_cart_replaced", { shop: shop?.name ?? t("oc_shop_fallback") })
            : t("oc_items_added"),
        );
      }}
    >
      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
      {t("oc_reorder")}
    </Button>
  );
}

function CancelOrderButton({ order }: { order: OrderRow }) {
  const { t } = useLanguage();
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
    toast.success(t("oc_cancelled_toast"));
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
        {t("oc_cancel")}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("oc_cancel_title", { code: order.order_code })}</AlertDialogTitle>
            <AlertDialogDescription>{t("oc_cancel_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("oc_keep_order")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void cancel();
              }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? t("oc_cancelling") : t("oc_cancel_order")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
