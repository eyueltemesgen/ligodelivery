import { BannerSlot } from "@/components/ligo/BannerSlot";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { categoriesQuery } from "@/lib/queries";
import { CategoryCardSkeleton } from "@/components/ligo/Skeletons";
import { StorageImage } from "@/lib/media";
import { useI18n, useContentTranslations } from "@/lib/i18n";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Browse categories — የኔ Go · Bishoftu" },
      {
        name: "description",
        content:
          "Restaurants, groceries, pharmacy, bakery and more — browse every የኔ Go delivery category in Bishoftu.",
      },
      { property: "og:title", content: "Browse categories — የኔ Go" },
      { property: "og:description", content: "Every የኔ Go delivery category in Bishoftu." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data = [], isLoading } = useQuery(categoriesQuery);
  const { t } = useI18n();
  const { localize } = useContentTranslations("category");
  return (
    <div className="container-ligo py-10">
      <BannerSlot placement="categories" className="px-0 py-4" />
      <h1 className="font-display text-3xl font-extrabold">{t("categories.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("categories.subtitle")}</p>
      {isLoading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((c) => {
            const view = localize(c);
            return (
              <Link
                key={view.id}
                to="/shops"
                search={{ category: view.id }}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <StorageImage
                  path={view.image_url}
                  alt={view.name}
                  className="h-28 w-full object-cover"
                />
                <div className="p-3 text-sm font-semibold">{view.name}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
