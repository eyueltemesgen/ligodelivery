import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowRight, ListChecks, Package, ReceiptText } from "lucide-react";
import { serviceCategoriesQuery, servicesQuery } from "@/lib/special-moments";
import { categoryCopy, categoryMeta, localizedCity, splitCategories } from "@/lib/service-catalog";
import { ServiceCard } from "@/components/special-moments/ServiceCards";
import { GridSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";

export const Route = createFileRoute("/concierge")({
  head: () => ({
    meta: [
      { title: translations.en.cch_meta_title },
      { name: "description", content: translations.en.cch_meta_desc },
      { property: "og:title", content: translations.en.cch_meta_title },
      { property: "og:description", content: translations.en.cch_meta_desc },
    ],
  }),
  component: ConciergeHub,
});

/**
 * The front door for errands, bill payments and parcels.
 *
 * These were reachable only by browsing Special Moments, which is a gifting
 * section — the wrong shelf for "pay my electricity bill". Tona and Bishoftu
 * Delivery both give errands and bills their own landing page; this is ours.
 *
 * The three categories are the same job shape (describe it, we quote, you accept
 * and pay), so they share one page and one flow rather than three near-identical
 * pages. `/special-moments/category/$slug` already renders any of them, so the
 * cards below drill straight into it.
 */
function ConciergeHub() {
  const { t, language } = useLanguage();
  const { data: categories = [], isLoading: catsLoading } = useQuery(serviceCategoriesQuery);
  const { data: services = [], isLoading: svcLoading } = useQuery(servicesQuery());

  const { concierge } = useMemo(() => splitCategories(categories), [categories]);
  const conciergeIds = useMemo(() => new Set(concierge.map((c) => c.id)), [concierge]);
  const conciergeServices = useMemo(
    () => services.filter((s) => s.service_category_id && conciergeIds.has(s.service_category_id)),
    [services, conciergeIds],
  );

  const loading = catsLoading || svcLoading;

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="container-ligo py-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-accent-foreground">
            <ListChecks className="h-3.5 w-3.5" />
            {t("cch_badge")}
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">
            {t("cch_title")}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {t("cch_subtitle", { city: localizedCity(undefined, language) })}
          </p>
        </div>
      </section>

      {concierge.length > 0 && (
        <section className="container-ligo py-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {concierge.map((c) => {
              const copy = categoryCopy(t, c, language);
              const Icon = categoryMeta(c.slug).icon;
              return (
                <Link
                  key={c.id}
                  to="/special-moments/category/$slug"
                  params={{ slug: c.slug }}
                  className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-3 font-display text-lg font-bold">{copy.name}</h2>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{copy.tagline}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {t("cch_browse")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="container-ligo pb-14">
        <h2 className="font-display text-2xl font-bold">{t("cch_services_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("cch_services_sub")}</p>
        {loading ? (
          <div className="mt-5">
            <GridSkeleton count={6} />
          </div>
        ) : conciergeServices.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <Package className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-3 font-display font-bold">{t("cch_empty_title")}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {t("cch_empty_text")}
            </p>
            <Button asChild className="mt-5" variant="outline">
              <Link to="/special-moments/search">{t("smc_search_all")}</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {conciergeServices.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        )}
      </section>

      <section className="container-ligo pb-16">
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="flex flex-wrap items-center gap-6">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary">
              <ReceiptText className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-bold">{t("cch_how_title")}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("cch_how_text")}</p>
            </div>
            <Button asChild>
              <Link to="/special-moments/search">{t("cch_how_cta")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
