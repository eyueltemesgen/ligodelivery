import { Link } from "@tanstack/react-router";
import { Clock, Heart, Plus, Star, Truck } from "lucide-react";
import { StorageImage } from "@/lib/media";
import { ETB, discounted, isShopOpen } from "@/lib/format";
import type { Product, Shop } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useSaved } from "@/lib/saved";
import { useI18n, useContentTranslations } from "@/lib/i18n";
import { toast } from "sonner";

/** Delivery window shown as a range, e.g. "15–25 min", with safe fallbacks. */
const deliveryWindow = (mins: number | null | undefined, unit: string) => {
  const base = Math.max(Number(mins) || 25, 5);
  return `${base}–${base + 10} ${unit}`;
};

export function ShopCard({ shop }: { shop: Shop }) {
  const { localize } = useContentTranslations("shop");
  const view = localize(shop);
  const open = view.is_online !== false && isShopOpen(view.opens_at, view.closes_at);
  const { isFavoriteShop, toggleShop } = useSaved();
  const { t } = useI18n();
  const favorite = isFavoriteShop(view.id);
  return (
    <Link
      to="/shops/$shopId"
      params={{ shopId: view.id }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <StorageImage
          path={view.cover_url ?? view.image_url}
          alt={view.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-2 py-1 text-[11px] font-semibold ${open ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          {open ? t("common.openNow") : t("common.closed")}
        </span>
        <button
          type="button"
          aria-label={
            favorite
              ? t("shops.favoriteAriaRemove", { name: view.name })
              : t("shops.favoriteAriaSave", { name: view.name })
          }
          aria-pressed={favorite}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void toggleShop(view.id);
          }}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-background/90 shadow-sm transition-transform active:scale-90"
        >
          <Heart
            className={`h-4 w-4 ${favorite ? "fill-destructive text-destructive" : "text-muted-foreground"}`}
          />
        </button>
        <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[11px] font-semibold text-foreground shadow-sm">
          <Clock className="h-3 w-3 text-primary" />
          {deliveryWindow(view.delivery_time_min, t("common.minutesShort"))}
        </span>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-display text-base font-bold">{view.name}</h3>
        <p className="line-clamp-1 text-sm text-muted-foreground">
          {view.description ?? view.address}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground">
            <Star className="h-3 w-3 fill-warning text-warning" />
            {Number(view.rating) > 0 ? Number(view.rating).toFixed(1) : t("common.new")}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
            <Truck className="h-3 w-3" />
            {Number(view.delivery_fee) > 0
              ? t("common.deliveryFee", { amount: ETB(view.delivery_fee) })
              : t("common.freeDelivery")}
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
  const { isSavedProduct, toggleProduct } = useSaved();
  const { t } = useI18n();
  const { localize } = useContentTranslations("product");
  const view = localize(product);
  const saved = isSavedProduct(view.id);
  const price = discounted(Number(view.price), view.discount_percent);
  return (
    <div
      className="flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
      onClick={() => !orderingDisabled && onSelect?.(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && !orderingDisabled && onSelect?.(product)}
    >
      <div className="relative">
        <StorageImage
          path={view.image_url}
          alt={view.name}
          className="h-32 w-full object-cover"
        />
        <button
          type="button"
          aria-label={
            saved
              ? t("product.unsaveAria", { name: view.name })
              : t("product.saveAria", { name: view.name })
          }
          aria-pressed={saved}
          onClick={(e) => {
            e.stopPropagation();
            void toggleProduct(view.id);
          }}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 shadow-sm transition-transform active:scale-90"
        >
          <Heart
            className={`h-4 w-4 ${saved ? "fill-destructive text-destructive" : "text-muted-foreground"}`}
          />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h4 className="line-clamp-1 text-sm font-semibold">{view.name}</h4>
        <p className="line-clamp-2 text-xs text-muted-foreground">{view.description}</p>
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-sm font-bold text-foreground">{ETB(price)}</span>
            {view.discount_percent > 0 && (
              <span className="ml-1 text-xs text-muted-foreground line-through">
                {ETB(view.price)}
              </span>
            )}
          </div>
          <Button
            size="sm"
            className="shrink-0"
            disabled={!view.in_stock || orderingDisabled}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelect) {
                onSelect(product);
                return;
              }
              add({
                productId: view.id,
                shopId: view.shop_id,
                shopName: shopName ?? "Shop",
                name: view.name,
                imagePath: view.image_url,
                unitPrice: price,
              });
              toast.success(t("product.addedToCart", { name: view.name }));
            }}
          >
            {orderingDisabled ? (
              t("common.closed")
            ) : view.in_stock ? (
              <>
                <Plus className="h-4 w-4" /> {t("action.add")}
              </>
            ) : (
              t("common.outOfStock")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
