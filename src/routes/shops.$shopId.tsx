import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin, Phone, Star } from "lucide-react";
import { shopHoursQuery, shopProductsQuery, shopQuery } from "@/lib/queries";
import { StorageImage } from "@/lib/media";
import { ETB } from "@/lib/format";
import { closedReason, isShopOpenNow } from "@/lib/hours";
import { ProductCard } from "@/components/ligo/Cards";

export const Route = createFileRoute("/shops/$shopId")({
  head: () => ({
    meta: [
      { title: "Shop menu — Ligo Delivery Bishoftu" },
      {
        name: "description",
        content: "Browse the menu and order delivery from this Bishoftu shop on Ligo.",
      },
      { property: "og:title", content: "Shop menu — Ligo Delivery" },
      { property: "og:description", content: "Order delivery from this Bishoftu shop." },
    ],
  }),
  component: ShopDetail,
});

function ShopDetail() {
  const { shopId } = Route.useParams();
  const { data: shop, isLoading } = useQuery(shopQuery(shopId));
  const { data: products = [] } = useQuery(shopProductsQuery(shopId));
  const { data: hours = [] } = useQuery(shopHoursQuery(shopId));

  if (isLoading)
    return <div className="container-ligo py-16 text-muted-foreground">Loading shop…</div>;
  if (!shop) return <div className="container-ligo py-16">Shop not found.</div>;

  const open = isShopOpenNow(shop, hours);

  return (
    <div>
      <div className="relative h-56 w-full overflow-hidden bg-surface">
        <StorageImage
          path={shop.cover_url ?? shop.image_url}
          alt={shop.name}
          className="h-56 w-full object-cover"
        />
      </div>
      <div className="container-ligo -mt-10 pb-12">
        <div className="rounded-xl border border-border bg-card p-5 shadow-pop">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-extrabold">{shop.name}</h1>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${open ? "bg-primary-soft text-accent-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {open ? "Open now" : "Closed"}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{shop.description}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              {shop.rating}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {shop.delivery_time_min} min · {ETB(shop.delivery_fee)} delivery
            </span>
            {shop.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {shop.address}
              </span>
            )}
            {shop.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {shop.phone}
              </span>
            )}
          </div>
        </div>

        <h2 className="mt-8 font-display text-xl font-bold">Menu</h2>
        {!open && (
          <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            {closedReason(shop, hours)} You can browse the menu, but ordering is disabled until the
            shop reopens.
          </div>
        )}
        {products.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No items listed yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} shopName={shop.name} orderingDisabled={!open} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
