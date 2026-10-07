import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";
import { serviceCategoriesQuery, servicesQuery, type ServiceFilters } from "@/lib/special-moments";
import { ServiceCard } from "@/components/special-moments/ServiceCards";
import { categoryMeta, categoryCopy } from "@/lib/service-catalog";
import { StorageImage } from "@/lib/media";
import { GridSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { BackButton } from "@/components/layout/BackButton";

export const Route = createFileRoute("/special-moments/category/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Special Moments · የኔ Go` },
      {
        name: "description",
        content:
          "Browse Special Moments services, packages and gifts available for delivery and events.",
      },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { t, language } = useLanguage();
  const { slug } = Route.useParams();
  const { data: categories = [] } = useQuery(serviceCategoriesQuery);
  const category = categories.find((c) => c.slug === slug);
  const meta = categoryMeta(slug);
  const copy = categoryCopy(t, category, language);

  const filters: ServiceFilters = { categoryId: category?.id ?? "__none__" };
  const { data: services = [], isLoading } = useQuery({
    ...servicesQuery(filters),
    enabled: !!category,
  });

  if (!isLoading && categories.length > 0 && !category) throw notFound();

  const Icon = meta.icon;

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="container-ligo py-8">
          <BackButton fallback="/special-moments" label={t("smi_badge")} />
          <div className="mt-4 flex flex-wrap items-start gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary">
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl font-extrabold">{copy.name}</h1>
              <p className="mt-1 max-w-2xl text-muted-foreground">{copy.description}</p>
            </div>
            <Button asChild variant="outline">
              <Link to="/special-moments/search">{t("smc_search_all")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-ligo py-8">
        {isLoading ? (
          <GridSkeleton count={6} />
        ) : services.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <ImageOff className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-3 font-display font-bold">
              {t("smc_empty_title", { category: copy.name })}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {t("smc_empty_text")}
            </p>
            <Button asChild className="mt-5" variant="outline">
              <Link to="/special-moments">{t("smc_back")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        )}
      </section>

      {category?.image_url && (
        <section className="container-ligo pb-14">
          <StorageImage
            path={category.image_url}
            alt={copy.name}
            className="h-56 w-full rounded-2xl object-cover shadow-card"
          />
        </section>
      )}
    </div>
  );
}
