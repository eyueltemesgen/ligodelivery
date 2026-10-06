import { translations } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Heart, MapPin, Phone, Search, Star } from "lucide-react";
import { categoriesQuery, shopHoursQuery, shopProductsQuery, shopQuery } from "@/lib/queries";
import type { Product } from "@/lib/queries";
import { StorageImage } from "@/lib/media";
import { ETB, discounted } from "@/lib/format";
import { closedReasonKey, isShopOpenNow } from "@/lib/hours";
import { useSaved } from "@/lib/saved";
import { ProductCard } from "@/components/ligo/Cards";
import { ProductGridSkeleton } from "@/components/ligo/Skeletons";
import { ProductModal } from "@/components/ligo/ProductModal";
import { useLanguage } from "@/hooks/useLanguage";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/layout/BackButton";

export const Route = createFileRoute("/shops/$shopId")({
  head: () => ({
    meta: [
      { title: translations.en.shop_meta_title },
      {
        name: "description",
        content: translations.en.shop_meta_desc,
      },
      { property: "og:title", content: translations.en.shop_meta_og_title },
      { property: "og:description", content: translations.en.shop_meta_og_desc },
    ],
  }),
  component: ShopDetail,
});

function ShopDetail() {
  const { t } = useLanguage();
  const { shopId } = Route.useParams();
  const { data: shop, isLoading } = useQuery(shopQuery(shopId));
  const { data: products = [] } = useQuery(shopProductsQuery(shopId));
  const { data: hours = [] } = useQuery(shopHoursQuery(shopId));
  const { data: allCategories = [] } = useQuery(categoriesQuery);
  const { isFavoriteShop, toggleShop } = useSaved();
  const [selected, setSelected] = useState<Product | null>(null);
  const [term, setTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeSection, setActiveSection] = useState("all");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const categoryById = useMemo(() => {
    const map = new Map(allCategories.map((c) => [c.id, c]));
    return map;
  }, [allCategories]);

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q),
    );
  }, [products, term]);

  const sections = useMemo(() => {
    if (term.trim()) return [{ key: "all", label: t("shop_section_results"), items: filtered }];
    if (activeCategory !== "all") {
      const cat = categoryById.get(activeCategory);
      return [
        {
          key: "all",
          label: cat?.name ?? t("shop_section_full"),
          items: products.filter((p) => p.category_id === activeCategory),
        },
      ];
    }
    const popular = products.filter((p) => p.is_popular);
    const groups: { key: string; label: string; items: Product[] }[] = [];
    if (popular.length > 0)
      groups.push({ key: "popular", label: t("shop_section_popular"), items: popular });
    groups.push({ key: "all", label: t("shop_section_full"), items: products });
    return groups.filter((g) => g.items.length > 0);
  }, [products, term, filtered, activeCategory, categoryById, t]);

  // Category chips that actually have products in this shop, from the DB.
  const menuCategories = useMemo(() => {
    const ids = new Set(products.map((p) => p.category_id).filter(Boolean) as string[]);
    return allCategories.filter((c) => ids.has(c.id));
  }, [products, allCategories]);

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
        <div className="container-ligo relative z-10 -mt-10 pb-12">
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
  if (!shop) return <div className="container-ligo py-16">{t("shop_not_found")}</div>;

  const open = isShopOpenNow(shop, hours);
  const favorite = isFavoriteShop(shop.id);

  const scrollTo = (key: string) => {
    const el = sectionRefs.current[key];
    if (el) window.scrollTo({ top: el.offsetTop - 110, behavior: "smooth" });
  };

  return (
    <div className="isolate">
      <div className="container-ligo pt-4">
        <BackButton fallback="/shops" label={t("shop_all_shops")} />
      </div>
      <div className="relative z-0 h-56 w-full overflow-hidden bg-surface">
        <StorageImage
          path={shop.cover_url ?? shop.image_url}
          alt={shop.name}
          className="h-56 w-full object-cover"
          priority
          width={1600}
          height={332}
        />
      </div>
      {/* The cover is a positioned layer (relative z-0). The card is pulled up
          over it with a negative margin, so it must be positioned too, with a
          higher z-index, or the photo paints over the shop name. */}
      <div className="container-ligo relative z-10 -mt-10 pb-12">
        <div className="rounded-xl border border-border bg-card p-5 shadow-pop">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-extrabold">{shop.name}</h1>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${open ? "bg-primary-soft text-accent-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {open ? t("shop_open_now") : t("shop_closed")}
            </span>
            <button
              type="button"
              aria-pressed={favorite}
              aria-label={favorite ? t("shop_remove_aria") : t("shop_save_aria")}
              className={`ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                favorite
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border text-primary"
              }`}
              onClick={() => void toggleShop(shop.id)}
            >
              <Heart className={`h-3.5 w-3.5 ${favorite ? "fill-destructive" : ""}`} />
              {favorite ? t("shop_saved") : t("shop_save")}
            </button>
            <button
              type="button"
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-primary"
              onClick={() => {
                const url = window.location.href;
                if (navigator.share)
                  void navigator.share({ title: shop.name, url }).catch(() => {});
                else void navigator.clipboard.writeText(url);
              }}
            >
              {t("shop_share")}
            </button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{shop.description}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              {shop.rating}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {t("shop_delivery", { min: shop.delivery_time_min, fee: ETB(shop.delivery_fee) })}
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

        {/* In-menu search */}
        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t("shop_search_placeholder")}
            aria-label={t("shop_search_placeholder")}
            className="h-11 pl-9"
          />
        </div>

        {/* Sticky category navigation — dynamic, DB-driven */}
        {(menuCategories.length > 1 || !term) && (
          <div className="sticky top-16 z-30 -mx-4 mt-3 border-y border-border bg-background/95 px-4 backdrop-blur">
            <nav className="flex gap-1 overflow-x-auto py-2">
              <button
                type="button"
                onClick={() => {
                  setTerm("");
                  setActiveCategory("all");
                  scrollTo("all");
                }}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === "all" && !term
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {t("shop_cat_all")}
              </button>
              {menuCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setTerm("");
                    setActiveCategory(c.id);
                  }}
                  className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeCategory === c.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </nav>
          </div>
        )}

        {!open && (
          <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            {t(closedReasonKey(shop, hours))} {t("shop_closed_note")}
          </div>
        )}

        {products.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("shop_no_items")}</p>
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t("shop_no_results", { term })}
          </p>
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
