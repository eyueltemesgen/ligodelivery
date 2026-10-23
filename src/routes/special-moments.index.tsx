import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowRight, Compass, Gift, ListChecks, Sparkles, UtensilsCrossed } from "lucide-react";
import { serviceCategoriesQuery, servicesQuery } from "@/lib/special-moments";
import { ServiceCard, ServiceCategoryBanner } from "@/components/special-moments/ServiceCards";
import { RotatingRow, RotatingSlides } from "@/components/ligo/RotatingCarousel";
import { Button } from "@/components/ui/button";
import { GridSkeleton } from "@/components/account/States";
import { StorageImage } from "@/lib/media";
import { siteContentQuery, bannersQuery } from "@/lib/content";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, type TranslationKey } from "@/lib/i18n";
import { localizedCity, splitCategories } from "@/lib/service-catalog";

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
  const { t, language } = useLanguage();
  const { data: categories = [] } = useQuery(serviceCategoriesQuery);
  const { data: services = [], isLoading } = useQuery(servicesQuery());
  const { data: content } = useQuery(siteContentQuery);
  const { data: smBanners = [] } = useQuery(bannersQuery("special_moments"));
  const heroImages = smBanners.filter((b) => b.image_url);

  // Errands, bills and parcels live on /concierge. They share the same
  // `service_categories` table, so without this split the gifting hub would
  // advertise "Bill Payments" under a heading about celebrations.
  const { specialMoments: smCategories, concierge: conciergeCategories } = useMemo(
    () => splitCategories(categories),
    [categories],
  );
  const conciergeIds = useMemo(
    () => new Set(conciergeCategories.map((c) => c.id)),
    [conciergeCategories],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of services) {
      if (s.service_category_id) map[s.service_category_id] = (map[s.service_category_id] ?? 0) + 1;
    }
    return map;
  }, [services]);

  // Featured/showcase must not surface a bill payment on the gifting hub either.
  const smServices = useMemo(
    () =>
      services.filter((s) => !s.service_category_id || !conciergeIds.has(s.service_category_id)),
    [services, conciergeIds],
  );

  const featured = smServices.filter((s) => s.is_featured).slice(0, 8);
  const showcase = featured.length > 0 ? featured : smServices.slice(0, 8);
  const giftsCategory = categories.find((c) => c.slug === "gifts");

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
          {heroImages.length > 0 ? (
            <RotatingSlides
              ariaLabel={t("banner_carousel_aria")}
              controls={heroImages.length > 1}
              className="h-72 w-full rounded-2xl shadow-pop lg:h-96"
            >
              {heroImages.map((b) => (
                <StorageImage
                  key={b.id}
                  path={b.image_url}
                  alt={b.title || "የኔ Go Special Moments"}
                  priority
                  width={1080}
                  height={540}
                  className="h-72 w-full rounded-2xl object-cover lg:h-96"
                />
              ))}
            </RotatingSlides>
          ) : categories.length > 0 ? (
            <ServiceCategoryBanner
              ariaLabel={t("smi_show_categories")}
              categories={smCategories.slice(0, 4)}
            />
          ) : (
            <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 lg:h-96">
              <Sparkles className="h-12 w-12 text-primary/60" />
            </div>
          )}
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
        {conciergeCategories.length > 0 && (
          <Link
            to="/concierge"
            className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/40"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <ListChecks className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-display font-bold">{t("cch_title")}</span>
                <span className="block text-sm text-muted-foreground">{t("cch_cross_link")}</span>
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              {t("cch_browse")}
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        )}
        {smCategories.length === 0 ? (
          <EmptyCategoryState />
        ) : (
          <ServiceCategoryBanner
            ariaLabel={t("smi_categories")}
            categories={smCategories}
            counts={counts}
            className="mt-5"
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
                {t("smi_bespoke_text", { city: localizedCity(content?.city, language) })}
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
