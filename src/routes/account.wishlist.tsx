import { translations } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { Heart, ShoppingCart, Store, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { favoritesQuery, wishlistQuery, type FavoriteRow, type WishlistRow } from "@/lib/account";
import { useCart } from "@/lib/cart";
import { useSaved } from "@/lib/saved";
import { ETB, discounted } from "@/lib/format";
import { StorageImage } from "@/lib/media";
import { AccountHeader } from "@/components/account/AccountShell";
import { ShopCard } from "@/components/ligo/Cards";
import { AccountState, ErrorState, GridSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/wishlist")({
  head: () => ({
    meta: [
      { title: translations.en.saved_meta_title },
      { name: "description", content: translations.en.saved_meta_desc },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab] = useState<"products" | "shops">("products");

  const {
    data: saved = [],
    isLoading: loadingProducts,
    isError: errorProducts,
    refetch: refetchProducts,
  } = useQuery(wishlistQuery(user?.id));
  const {
    data: favorites = [],
    isLoading: loadingShops,
    isError: errorShops,
    refetch: refetchShops,
  } = useQuery(favoritesQuery(user?.id));

  return (
    <>
      <AccountHeader title={t("acct_saved_title")} description={t("acct_saved_desc")} />

      <div className="flex gap-2">
        {(
          [
            { id: "products", labelKey: "acct_tab_products", count: saved.length, icon: Heart },
            { id: "shops", labelKey: "acct_tab_shops", count: favorites.length, icon: Store },
          ] as const
        ).map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              tab === tabItem.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            <tabItem.icon className="h-4 w-4" />
            {t(tabItem.labelKey, { count: tabItem.count })}
          </button>
        ))}
      </div>

      {tab === "products" ? (
        loadingProducts ? (
          <GridSkeleton count={6} />
        ) : errorProducts ? (
          <ErrorState onRetry={() => void refetchProducts()} />
        ) : saved.length === 0 ? (
          <AccountState
            icon={Heart}
            title={t("acct_no_saved_products")}
            description={t("acct_no_saved_products_desc")}
            action={
              <Button asChild>
                <Link to="/shops">{t("acct_browse_products")}</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {saved.map((row) => (
              <SavedProductCard key={row.id} row={row} />
            ))}
          </div>
        )
      ) : loadingShops ? (
        <GridSkeleton count={4} />
      ) : errorShops ? (
        <ErrorState onRetry={() => void refetchShops()} />
      ) : favorites.length === 0 ? (
        <AccountState
          icon={Store}
          title={t("acct_no_favorite_shops")}
          description={t("acct_no_favorite_shops_desc")}
          action={
            <Button asChild>
              <Link to="/shops">{t("acct_discover_shops")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((f) => (
            <FavoriteShopCard key={f.id} row={f} />
          ))}
        </div>
      )}
    </>
  );
}

function SavedProductCard({ row }: { row: WishlistRow }) {
  const { t } = useLanguage();
  const { add } = useCart();
  const { toggleProduct } = useSaved();
  const product = row.products;
  const [busy, setBusy] = useState(false);

  if (!product || !product.is_active) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-card">
        <p className="text-sm font-semibold">{product?.name ?? t("acct_product_unavailable")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("acct_product_unavailable_desc")}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => void toggleProduct(row.product_id)}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {t("acct_remove")}
        </Button>
      </div>
    );
  }

  const price = discounted(Number(product.price), product.discount_percent);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <Link
        to="/shops/$shopId"
        params={{ shopId: product.shop_id }}
        className="relative block"
        aria-label={product.name}
      >
        <StorageImage
          path={product.image_url}
          alt={product.name}
          width={480}
          height={168}
          className="h-28 w-full object-cover"
        />
        <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
          {product.shops?.name ?? t("oc_shop_fallback")}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-1 text-sm font-semibold">{product.name}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
        <div className="mt-auto flex items-center justify-between gap-1">
          <span className="text-sm font-bold">{ETB(price)}</span>
          {product.discount_percent > 0 && (
            <span className="text-xs text-muted-foreground line-through">{ETB(product.price)}</span>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="flex-1"
            disabled={!product.in_stock || busy}
            onClick={() => {
              add({
                productId: product.id,
                shopId: product.shop_id,
                shopName: product.shops?.name ?? t("oc_shop_fallback"),
                name: product.name,
                imagePath: product.image_url,
                unitPrice: price,
              });
              toast.success(t("acct_added_to_cart", { name: product.name }));
            }}
          >
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
            {product.in_stock ? t("common_add") : t("common_out")}
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label={t("acct_remove_from_saved")}
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void toggleProduct(row.product_id).finally(() => setBusy(false));
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function FavoriteShopCard({ row }: { row: FavoriteRow }) {
  const { t } = useLanguage();
  const { toggleShop } = useSaved();
  const [busy, setBusy] = useState(false);
  if (!row.shops)
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <p className="text-sm font-semibold">{t("acct_shop_unavailable")}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => void toggleShop(row.shop_id)}
        >
          {t("acct_remove")}
        </Button>
      </div>
    );
  return (
    <div className="space-y-2">
      <ShopCard
        shop={{
          ...row.shops,
          description: null,
          category_id: null,
          phone: null,
          address: null,
          opens_at: "00:00",
          closes_at: "23:59",
          rating: 0,
          is_featured: false,
          is_active: true,
          owner_id: null,
          lat: null,
          lng: null,
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className="w-full text-destructive hover:text-destructive"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void toggleShop(row.shop_id).finally(() => setBusy(false));
        }}
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        {t("acct_remove_from_favorites")}
      </Button>
    </div>
  );
}
