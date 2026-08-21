import { Link } from "@tanstack/react-router";
import { Clock, Star, Bike } from "lucide-react";
import { StorageImage } from "@/lib/media";
import { ETB, discounted, isShopOpen } from "@/lib/format";
import type { Product, Shop } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

/** Delivery window shown as a range, e.g. "15–25 min", with safe fallbacks. */
const deliveryWindow = (mins: number | null | undefined) => {
  const base = Math.max(Number(mins) || 25, 5);
  return `${base}–${base + 10} min`;
};

export function ShopCard({ shop }: { shop: Shop }) {
  const open = shop.is_online !== false && isShopOpen(shop.opens_at, shop.closes_at);
  return (
    <Link
      to="/shops/$shopId"
      params={{ shopId: shop.id }}
      className="group overflow-hidden rounded-xl border border-border bg-card shadow-card transition-shadow hover:shadow-pop"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <StorageImage
          path={shop.cover_url ?? shop.image_url}
          alt={shop.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-2 py-1 text-[11px] font-semibold ${open ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          {open ? "Open now" : "Closed"}
        </span>
        <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[11px] font-semibold text-foreground shadow-sm">
          <Clock className="h-3 w-3 text-primary" />
          {deliveryWindow(shop.delivery_time_min)}
        </span>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-display text-base font-bold">{shop.name}</h3>
        <p className="line-clamp-1 text-sm text-muted-foreground">
          {shop.description ?? shop.address}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground">
            <Star className="h-3 w-3 fill-warning text-warning" />
            {Number(shop.rating) > 0 ? Number(shop.rating).toFixed(1) : "New"}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
            <Bike className="h-3 w-3" />
            {Number(shop.delivery_fee) > 0 ? `${ETB(shop.delivery_fee)} fee` : "Free delivery"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ProductCard({
  product,
  shopName,
  orderingDisabled,
  onSelect,
}: {
  product: Product;
  shopName?: string;
  orderingDisabled?: boolean;
  onSelect?: (product: Product) => void;
}) {
  const { add } = useCart();
  const price = discounted(Number(product.price), product.discount_percent);
  return (
    <div
      className="flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-shadow hover:shadow-pop"
      onClick={() => !orderingDisabled && onSelect?.(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && !orderingDisabled && onSelect?.(product)}
    >
      <StorageImage
        path={product.image_url}
        alt={product.name}
        className="h-32 w-full object-cover"
      />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h4 className="line-clamp-1 text-sm font-semibold">{product.name}</h4>
        <p className="line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
        <div className="mt-auto flex items-center justify-between gap-2">
          <div>
            <span className="text-sm font-bold text-foreground">{ETB(price)}</span>
            {product.discount_percent > 0 && (
              <span className="ml-1 text-xs text-muted-foreground line-through">
                {ETB(product.price)}
              </span>
            )}
          </div>
          <Button
            size="sm"
            disabled={!product.in_stock || orderingDisabled}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelect) {
                onSelect(product);
                return;
              }
              add({
                productId: product.id,
                shopId: product.shop_id,
                shopName: shopName ?? "Shop",
                name: product.name,
                imagePath: product.image_url,
                unitPrice: price,
              });
              toast.success(`${product.name} added to cart`);
            }}
          >
            {orderingDisabled ? "Closed" : product.in_stock ? "Add" : "Out"}
          </Button>
        </div>
      </div>
    </div>
  );
}
