import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, MapPin, Phone, Star } from "lucide-react";
import { shopHoursQuery, shopProductsQuery, shopQuery } from "@/lib/queries";
import type { Product } from "@/lib/queries";
import { StorageImage } from "@/lib/media";
import { ETB } from "@/lib/format";
import { closedReason, isShopOpenNow } from "@/lib/hours";
import { ProductCard } from "@/components/ligo/Cards";
import { ProductGridSkeleton } from "@/components/ligo/Skeletons";
import { ProductModal } from "@/components/ligo/ProductModal";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [selected, setSelected] = useState<Product | null>(null);
  const [activeSection, setActiveSection] = useState("all");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const sections = useMemo(() => {
    const inStock = products.filter((p) => p.in_stock);
    const popular = products.filter((p) => p.is_popular);
    const groups: { key: string; label: string; items: Product[] }[] = [];
    if (popular.length > 0) groups.push({ key: "popular", label: "⭐ Popular", items: popular });
    groups.push({ key: "all", label: "Full menu", items: products });
    const rest = products.filter((p) => !p.is_popular);
    if (rest.length > 0 && popular.length > 0)
      groups.push({ key: "more", label: "More", items: rest });
    // collapse duplicate "all" when we have popular/more
    if (popular.length > 0) groups.splice(1, 1);
    return groups.filter((g) => g.items.length > 0 && (g.key !== "all" || inStock.length >= 0));
  }, [products]);

  useEffect(() => {
    if (!shop) return;
    const onScroll = () => {
      const offset = window.scrollY + 140;
      let current = sections[0]?.key ?? "all";
      for (const s of sections) {
        const el = sectionRefs.current[s.key];
        if (el && el.offsetTop <= offset) current = s.key;
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [shop, sections]);

  if (isLoading)
    return (
      <div>
        <Skeleton className="h-56 w-full rounded-none" />
        <div className="container-ligo -mt-10 pb-12">
          <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-pop">
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="mt-8">
            <ProductGridSkeleton count={6} />
          </div>
        </div>
      </div>
    );
  if (!shop) return <div className="container-ligo py-16">Shop not found.</div>;

  const open = isShopOpenNow(shop, hours);

  const scrollTo = (key: string) => {
    const el = sectionRefs.current[key];
    if (el) window.scrollTo({ top: el.offsetTop - 110, behavior: "smooth" });
  };

  return (
    <div>
      <div className="relative h-56 w-full overflow-hidden bg-surface">
        <StorageImage
          path={shop.cover_url ?? shop.image_url}
          alt={shop.name}
          className="h-56 w-full object-cover"
          priority
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

        {/* Sticky category navigation */}
        {sections.length > 1 && (
          <div className="sticky top-16 z-30 -mx-4 mt-6 border-y border-border bg-background/95 px-4 backdrop-blur">
            <nav className="flex gap-1 overflow-x-auto py-2">
              {sections.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => scrollTo(s.key)}
                  className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeSection === s.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        )}

        {!open && (
          <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            {closedReason(shop, hours)} You can browse the menu, but ordering is disabled until the
            shop reopens.
          </div>
        )}

        {products.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No items listed yet.</p>
        ) : (
          sections.map((s) => (
            <section
              key={s.key}
              ref={(el) => {
                sectionRefs.current[s.key] = el;
              }}
              className="scroll-mt-28 pt-8"
            >
              <h2 className="font-display text-xl font-bold">{s.label}</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {s.items.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    shopName={shop.name}
                    orderingDisabled={!open}
                    onSelect={(prod) => setSelected(prod)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <ProductModal
        product={selected}
        shopName={shop.name}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}
