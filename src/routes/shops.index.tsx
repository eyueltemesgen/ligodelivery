import { BannerSlot } from "@/components/ligo/BannerSlot";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { categoriesQuery, shopsQuery } from "@/lib/queries";
import { ShopCard } from "@/components/ligo/Cards";
import { ShopGridSkeleton } from "@/components/ligo/Skeletons";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";

export const Route = createFileRoute("/shops/")({
  validateSearch: (s: Record<string, unknown>) =>
    typeof s["category"] === "string" ? { category: s["category"] } : {},
  head: () => ({
    meta: [
      { title: translations.en.meta_shops_title },
      {
        name: "description",
        content: translations.en.meta_shops_desc,
      },
      { property: "og:title", content: translations.en.meta_shops_title },
      { property: "og:description", content: translations.en.meta_shops_og_desc },
    ],
  }),
  component: ShopsPage,
});

function ShopsPage() {
  const { category } = Route.useSearch();
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: shops = [], isLoading } = useQuery(shopsQuery(category));
  const { t } = useLanguage();

  return (
    <div className="container-ligo py-10">
      <BannerSlot placement="shops" className="px-0 py-4" />
      <h1 className="font-display text-3xl font-extrabold">{t("shops_heading")}</h1>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to="/shops"
          search={{}}
          className={`rounded-full border px-3 py-1.5 text-sm ${!category ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
        >
          {t("common_all")}
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            to="/shops"
            search={{ category: c.id }}
            className={`rounded-full border px-3 py-1.5 text-sm ${category === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
          >
            {c.name}
          </Link>
        ))}
      </div>
      {isLoading ? (
        <div className="mt-8">
          <ShopGridSkeleton />
        </div>
      ) : shops.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">{t("shops_empty")}</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((s) => (
            <ShopCard key={s.id} shop={s} />
          ))}
        </div>
      )}
    </div>
  );
}
