/**
 * Renders tool output as actionable cards.
 *
 * This is the structural half of the "no invented numbers" guarantee: every
 * price, fee, distance and status a customer sees is formatted here from the
 * tool's JSON via `ETB`, `formatDistance`, `STATUS_LABEL_KEY` and
 * `pricingLabel`. Assistant prose is commentary only. Nothing in this file
 * places, confirms or pays for an order — the deepest it goes is a link into the
 * existing shop / cart / checkout / order pages.
 */
import { Link } from "@tanstack/react-router";
import { Clock, MapPin, Package, Star, Store } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCart } from "@/lib/cart";
import { formatDistance } from "@/lib/delivery";
import { ETB, discounted } from "@/lib/format";
import { StorageImage } from "@/lib/media";
import { STATUS_LABEL_KEY, type OrderStatus } from "@/lib/orders";
import { pricingLabel } from "@/lib/service-catalog";
import {
  ASSISTANT_DAY_KEYS,
  type AssistantDeliveryFee,
  type AssistantHours,
  type AssistantOrder,
  type AssistantProduct,
  type AssistantService,
  type AssistantShop,
  type AssistantToolResult,
} from "@/lib/assistant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MAX_CARDS = 6;

function ShopRow({ shop }: { shop: AssistantShop }) {
  const { t } = useLanguage();
  return (
    <Link
      to="/shops/$shopId"
      params={{ shopId: shop.id }}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-2 transition-colors hover:bg-secondary"
    >
      <StorageImage
        path={shop.imageUrl}
        alt={shop.name}
        width={160}
        height={64}
        className="h-12 w-12 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{shop.name}</p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {shop.ratingCount > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-current" />
              {shop.rating.toFixed(1)}
            </span>
          )}
          <span className="inline-flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {shop.deliveryTimeMin} min
          </span>
        </p>
      </div>
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        {t("ai_delivery_from", { fee: ETB(shop.deliveryFee) })}
      </span>
    </Link>
  );
}

function ProductRow({ product }: { product: AssistantProduct }) {
  const { t } = useLanguage();
  const price = discounted(product.price, product.discountPercent);
  return (
    <Link
      to="/shops/$shopId"
      params={{ shopId: product.shopId }}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-2 transition-colors hover:bg-secondary"
    >
      <StorageImage
        path={product.imageUrl}
        alt={product.name}
        width={160}
        height={64}
        className="h-12 w-12 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{product.name}</p>
        {product.shopName && (
          <p className="truncate text-xs text-muted-foreground">{product.shopName}</p>
        )}
        {!product.inStock && (
          <Badge variant="secondary" className="mt-0.5 text-[10px]">
            {t("ai_out_of_stock")}
          </Badge>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold">{ETB(price)}</p>
        {product.discountPercent > 0 && (
          <p className="text-[11px] text-muted-foreground line-through">{ETB(product.price)}</p>
        )}
      </div>
    </Link>
  );
}

function HoursCard({ hours }: { hours: AssistantHours }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
          <Store className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{hours.shopName}</span>
        </p>
        <Badge variant={hours.isOpen ? "default" : "secondary"} className="shrink-0">
          {hours.isOpen ? t("ai_open_now") : t("ai_closed_now")}
        </Badge>
      </div>
      {!hours.isOpen && hours.reasonKey && (
        <p className="mt-1 text-xs text-muted-foreground">{t(hours.reasonKey)}</p>
      )}
      {hours.today && !hours.today.isClosed && (
        <p className="mt-1 text-xs text-muted-foreground">
          {t("ai_today_hours", { opens: hours.today.opensAt, closes: hours.today.closesAt })}
        </p>
      )}
      {hours.schedule.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t border-border pt-2">
          {hours.schedule.map((day) => (
            <li
              key={day.dayOfWeek}
              className="flex justify-between text-[11px] text-muted-foreground"
            >
              <span>{t(ASSISTANT_DAY_KEYS[day.dayOfWeek] ?? "ai_day_sun")}</span>
              <span>
                {day.isClosed
                  ? t("ai_closed_now")
                  : t("ai_hours_range", { opens: day.opensAt, closes: day.closesAt })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DeliveryFeeCard({ fee }: { fee: AssistantDeliveryFee }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{fee.shopName}</span>
      </p>
      {fee.ok && fee.deliveryFee != null ? (
        <>
          <p className="mt-1 text-lg font-bold">{ETB(fee.deliveryFee)}</p>
          <p className="text-xs text-muted-foreground">
            {fee.distanceKm != null && <span>{formatDistance(fee.distanceKm)}</span>}
            {fee.pricingRule && <span> · {fee.pricingRule}</span>}
          </p>
        </>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          {fee.failureKey ? t(fee.failureKey) : t("delivery_err_generic")}
        </p>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: AssistantOrder }) {
  const { t } = useLanguage();
  const statusKey = STATUS_LABEL_KEY[order.status as OrderStatus];
  return (
    <Link
      to="/account/orders/$orderId"
      params={{ orderId: order.id }}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-2 transition-colors hover:bg-secondary"
    >
      <Package className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{order.orderCode}</p>
        <p className="text-xs text-muted-foreground">{statusKey ? t(statusKey) : order.status}</p>
      </div>
      <span className="shrink-0 text-sm font-bold">{ETB(order.total)}</span>
    </Link>
  );
}

function ServiceCard({ service }: { service: AssistantService }) {
  const { t } = useLanguage();
  return (
    <Link
      to="/special-moments/service/$serviceId"
      params={{ serviceId: service.id }}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-2 transition-colors hover:bg-secondary"
    >
      <StorageImage
        path={service.imageUrl}
        alt={service.name}
        width={160}
        height={64}
        className="h-12 w-12 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{service.name}</p>
        <p className="text-xs text-muted-foreground">
          {pricingLabel(t, service.pricingType, service.price, service.startingPrice)}
        </p>
      </div>
    </Link>
  );
}

function ResultBlock({ result }: { result: AssistantToolResult }) {
  const { t } = useLanguage();
  switch (result.kind) {
    case "catalogue": {
      const shops = result.shops.slice(0, MAX_CARDS);
      const products = result.products.slice(0, MAX_CARDS);
      return (
        <div className="space-y-1.5">
          {shops.map((s) => (
            <ShopRow key={s.id} shop={s} />
          ))}
          {products.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </div>
      );
    }
    case "shops":
      return (
        <div className="space-y-1.5">
          {result.shops.slice(0, MAX_CARDS).map((s) => (
            <ShopRow key={s.id} shop={s} />
          ))}
        </div>
      );
    case "products":
      return (
        <div className="space-y-1.5">
          {result.products.slice(0, MAX_CARDS).map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </div>
      );
    case "hours":
      return <HoursCard hours={result.hours} />;
    case "delivery_fee":
      return <DeliveryFeeCard fee={result.fee} />;
    case "orders":
      return (
        <div className="space-y-1.5">
          {result.orders.slice(0, MAX_CARDS).map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      );
    case "services":
      return (
        <div className="space-y-1.5">
          {result.services.slice(0, MAX_CARDS).map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      );
    case "none":
      return result.noteKey ? (
        <p className="text-xs text-muted-foreground">{t(result.noteKey)}</p>
      ) : null;
  }
}

/**
 * Renders every card for a turn, then a handoff CTA. The CTA never completes a
 * purchase — it opens the cart (when it has items) or the shop list.
 */
export function AssistantResults({ results }: { results: AssistantToolResult[] }) {
  const { t } = useLanguage();
  const { count } = useCart();
  if (results.length === 0) return null;
  return (
    <div className="space-y-2">
      {results.map((result, i) => (
        <ResultBlock key={i} result={result} />
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
        {count > 0 ? (
          <Button asChild size="sm" variant="default">
            <Link to="/cart">{t("ai_go_to_cart")}</Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link to="/shops">{t("cart_browse")}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
