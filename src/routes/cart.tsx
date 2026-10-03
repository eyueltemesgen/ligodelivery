import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Heart, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { ETB } from "@/lib/format";
import { StorageImage } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — የኔ Go" },
      {
        name: "description",
        content: "Review the items in your የኔ Go delivery cart before checkout.",
      },
      { property: "og:title", content: "Your cart — የኔ Go" },
      { property: "og:description", content: "Review your የኔ Go order before checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal, count, shopName, clear } = useCart();
  const navigate = useNavigate();
  const { t } = useI18n();

  if (items.length === 0)
    return (
      <div className="container-ligo py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-soft">
          <ShoppingCart className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-extrabold">{t("cart.empty")}</h1>
        <p className="mt-2 text-muted-foreground">{t("cart.emptyHint")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/shops">{t("action.browseShops")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/account/wishlist">
              <Heart className="mr-2 h-4 w-4" />
              {t("nav.savedProducts")}
            </Link>
          </Button>
        </div>
      </div>
    );

  return (
    <div className="container-ligo grid gap-8 py-10 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="font-display text-3xl font-extrabold">{t("cart.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {count === 1
            ? t("cart.itemFromOne", { shop: shopName ?? "" })
            : t("cart.itemsFrom", { count, shop: shopName ?? "" })}
        </p>
        <ul className="mt-6 space-y-3">
          {items.map((i) => (
            <li
              key={i.productId}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <StorageImage
                path={i.imagePath}
                alt={i.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{i.name}</p>
                <p className="text-sm text-muted-foreground">{ETB(i.unitPrice)}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("cart.decreaseQty")}
                  onClick={() => setQty(i.productId, i.quantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("cart.increaseQty")}
                  onClick={() => setQty(i.productId, i.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("cart.removeAria", { name: i.name })}
                  onClick={() => remove(i.productId)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/shops">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("cart.continueShopping")}
            </Link>
          </Button>
          <Button variant="ghost" className="text-destructive" onClick={clear}>
            {t("cart.clear")}
          </Button>
        </div>
      </div>
      <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">{t("cart.summary")}</h2>
        <div className="mt-4 flex justify-between text-sm">
          <span>{t("cart.subtotal")}</span>
          <span className="font-semibold">{ETB(subtotal)}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t("cart.feeNote")}</p>
        <Button className="mt-5 w-full" onClick={() => navigate({ to: "/checkout" })}>
          {t("cart.proceedCheckout")}
        </Button>
        <Button asChild variant="outline" className="mt-2 w-full">
          <Link to="/account/wishlist">
            <Heart className="mr-2 h-4 w-4" />
            {t("nav.savedProducts")}
          </Link>
        </Button>
      </aside>
    </div>
  );
}
