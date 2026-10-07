import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowRight, Compass, Gift, Sparkles, UtensilsCrossed } from "lucide-react";
import { serviceCategoriesQuery, servicesQuery } from "@/lib/special-moments";
import { ServiceCard, ServiceCategoryCard } from "@/components/special-moments/ServiceCards";
import { RotatingRow, RotatingSlides } from "@/components/ligo/RotatingCarousel";
import { Button } from "@/components/ui/button";
import { GridSkeleton } from "@/components/account/States";
import { siteContentQuery } from "@/lib/content";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, type TranslationKey } from "@/lib/i18n";

export const Route = createFileRoute("/special-moments/")({
  head: () => ({
    meta: [
      { title: translations.en.smh_meta_title },
      {
        name: "description",
        content: translations.en.smh_meta_desc,
      },
      { property: "og:title", content: translations.en.smh_meta_og_title },
      {
        property: "og:description",
        content: translations.en.smh_meta_og_desc,
      },
    ],
  }),
  component: SpecialMomentsHub,
});

const HIGHLIGHTS: { icon: typeof Gift; titleKey: TranslationKey; textKey: TranslationKey }[] = [
  { icon: Gift, titleKey: "smi_hl_gifts", textKey: "smi_hl_gifts_text" },
  { icon: UtensilsCrossed, titleKey: "smi_hl_catering", textKey: "smi_hl_catering_text" },
  { icon: Sparkles, titleKey: "smi_hl_surprises", textKey: "smi_hl_surprises_text" },
];

function SpecialMomentsHub() {
  const { t } = useLanguage();
  const { data: categories = [] } = useQuery(serviceCategoriesQuery);
  const { data: services = [], isLoading } = useQuery(servicesQuery());
  const { data: content } = useQuery(siteContentQuery);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of services) {
      if (s.service_category_id) map[s.service_category_id] = (map[s.service_category_id] ?? 0) + 1;
    }
    return map;
  }, [services]);

  const featured = services.filter((s) => s.is_featured).slice(0, 8);
  const showcase = featured.length > 0 ? featured : services.slice(0, 8);
  const giftsCategory = categories.find((c) => c.slug === "gifts");
  // Two categories per hero slide, rotating through the set.
  const categoryPairs = useMemo(() => {
    const pairs: (typeof categories)[] = [];
    for (let i = 0; i < categories.length; i += 2) pairs.push(categories.slice(i, i + 2));
    return pairs.slice(0, 4);
  }, [categories]);

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="container-ligo grid gap-8 py-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {t("smi_badge")}
            </span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight md:text-5xl">
              {t("smi_headline")}
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">{t("smi_intro")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {giftsCategory ? (
                <Button asChild size="lg">
                  <Link to="/special-moments/category/$slug" params={{ slug: giftsCategory.slug }}>
                    {t("smi_explore_gifts")}
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg">
                  <Link to="/special-moments/search">{t("smi_explore_services")}</Link>
                </Button>
              )}
              <Button asChild size="lg" variant="outline">
                <Link to="/special-moments/search">{t("smi_find_service")}</Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {HIGHLIGHTS.map((h) => (
                <div key={h.titleKey} className="flex gap-3">
                  <h.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">{t(h.titleKey)}</p>
                    <p className="text-xs text-muted-foreground">{t(h.textKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <RotatingSlides
            ariaLabel={t("smi_show_categories")}
            controls={categoryPairs.length > 1}
            className="rounded-2xl"
          >
            {categoryPairs.map((pair, i) => (
              <div key={i} className="grid grid-cols-2 gap-3 pb-8 sm:gap-4">
                {pair.map((c) => (
                  <ServiceCategoryCard key={c.id} category={c} />
                ))}
              </div>
            ))}
          </RotatingSlides>
        </div>
      </section>

      <section className="container-ligo py-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-bold">{t("smi_browse_category")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("smi_browse_category_sub")}</p>
          </div>
          <Link to="/special-moments/search" className="text-sm font-medium text-primary">
            {t("smi_search_all")}
          </Link>
        </div>
        {categories.length === 0 ? (
          <EmptyCategoryState />
        ) : (
          <RotatingRow
            ariaLabel={t("smi_categories")}
            items={categories}
            keyOf={(c) => c.id}
            className="mt-5"
            itemClassName="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[23%]"
            renderItem={(c) => (
              <ServiceCategoryCard category={c} count={counts[c.id] ?? 0} className="h-full" />
            )}
          />
        )}
      </section>

      <section className="container-ligo pb-14">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">{t("smi_featured")}</h2>
          <Link to="/special-moments/search" className="text-sm font-medium text-primary">
            {t("smi_see_everything")}
          </Link>
        </div>
        {isLoading ? (
          <div className="mt-5">
            <GridSkeleton count={4} />
          </div>
        ) : showcase.length === 0 ? (
          <EmptyServiceState />
        ) : (
          <RotatingRow
            ariaLabel={t("smi_show_services")}
            items={showcase}
            keyOf={(s) => s.id}
            className="mt-5"
            renderItem={(s) => <ServiceCard service={s} />}
          />
        )}
      </section>

      <section className="container-ligo pb-16">
        <div className="rounded-2xl bg-primary p-8 text-primary-foreground">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl font-bold">{t("smi_bespoke")}</h2>
              <p className="mt-2 text-sm opacity-90">
                {t("smi_bespoke_text", { city: content?.city ?? "Bishoftu" })}
              </p>
            </div>
            <Button asChild size="lg" variant="secondary">
              <Link to="/special-moments/search">
                {t("smi_request_quote")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyCategoryState() {
  const { t } = useLanguage();
  return (
    <div className="mt-5 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <Compass className="mx-auto h-7 w-7 text-muted-foreground" />
      <p className="mt-3 font-display font-bold">{t("smi_setup_title")}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t("smi_setup_text")}</p>
    </div>
  );
}

function EmptyServiceState() {
  const { t } = useLanguage();
  return (
    <div className="mt-5 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <Sparkles className="mx-auto h-7 w-7 text-muted-foreground" />
      <p className="mt-3 font-display font-bold">{t("smi_empty_title")}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t("smi_empty_text")}</p>
    </div>
  );
}
