import { BannerSlot } from "@/components/ligo/BannerSlot";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { categoriesQuery } from "@/lib/queries";
import { CategoryCardSkeleton } from "@/components/ligo/Skeletons";
import { StorageImage } from "@/lib/media";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: translations.en.meta_categories_title },
      {
        name: "description",
        content: translations.en.meta_categories_desc,
      },
      { property: "og:title", content: translations.en.meta_categories_title },
      { property: "og:description", content: translations.en.meta_categories_og_desc },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data = [], isLoading } = useQuery(categoriesQuery);
  const { t } = useLanguage();
  return (
    <div className="container-ligo py-10">
      <BannerSlot placement="categories" className="px-0 py-4" />
      <h1 className="font-display text-3xl font-extrabold">{t("categories_heading")}</h1>
      <p className="mt-2 text-muted-foreground">{t("categories_subtitle")}</p>
      {isLoading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((c) => (
            <Link
              key={c.id}
              to="/shops"
              search={{ category: c.id }}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <StorageImage path={c.image_url} alt={c.name} className="h-28 w-full object-cover" />
              <div className="p-3 text-sm font-semibold">{c.name}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
