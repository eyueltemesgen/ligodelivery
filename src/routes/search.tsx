import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { searchQuery } from "@/lib/queries";
import { ProductCard, ShopCard } from "@/components/ligo/Cards";
import { StorageImage } from "@/lib/media";
import { ProductGridSkeleton, ShopGridSkeleton } from "@/components/ligo/Skeletons";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? s["q"] : "" }),
  head: () => ({
    meta: [
      { title: translations.en.meta_search_title },
      {
        name: "description",
        content: translations.en.meta_search_desc,
      },
      { property: "og:title", content: translations.en.meta_search_title },
      { property: "og:description", content: translations.en.meta_search_og_desc },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data, isLoading } = useQuery(searchQuery(q));
  const { t } = useLanguage();

  const shops = data?.shops ?? [];
  const products = data?.products ?? [];
  const categories = data?.categories ?? [];
  const hasResults = shops.length + products.length + categories.length > 0;

  return (
    <div className="container-ligo py-10">
      <h1 className="font-display text-3xl font-extrabold">{t("search_heading")}</h1>
      <p className="mt-2 text-muted-foreground">
        {q ? t("search_showing", { q }) : t("search_hint")}
      </p>
      {isLoading && q && (
        <div className="mt-8 space-y-10">
          <ShopGridSkeleton count={3} />
          <ProductGridSkeleton count={4} />
        </div>
      )}
      {data && (
        <>
          {categories.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold">{t("search_categories")}</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    to="/shops"
                    search={{ category: c.id }}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-2 pr-4 shadow-card transition-transform hover:-translate-y-0.5"
                  >
                    <StorageImage
                      path={c.image_url}
                      alt={c.name}
                      width={96}
                      height={96}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    <span className="text-sm font-semibold">{c.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {shops.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold">{t("common_shops")}</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {shops.map((s) => (
                  <ShopCard key={s.id} shop={s} />
                ))}
              </div>
            </section>
          )}
          {products.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold">{t("common_products")}</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} shopName={p.shops?.name} />
                ))}
              </div>
            </section>
          )}
          {q && !hasResults && (
            <p className="mt-8 text-sm text-muted-foreground">{t("search_none")}</p>
          )}
        </>
      )}
    </div>
  );
}
