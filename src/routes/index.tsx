import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bike, Clock, ShieldCheck, Search } from "lucide-react";
import { categoriesQuery, featuredProductsQuery, offersQuery, shopsQuery } from "@/lib/queries";
import { serviceCategoriesQuery, servicesQuery } from "@/lib/special-moments";
import { ServiceCategoryCard } from "@/components/special-moments/ServiceCards";
import {
  FALLBACK_CATEGORIES,
  FALLBACK_PRODUCTS,
  FALLBACK_SHOPS,
  withFallback,
} from "@/lib/fallbacks";
import { DEFAULT_CONTENT, bannersQuery, siteContentQuery, type SiteContent } from "@/lib/content";
import { BannerSlot } from "@/components/ligo/BannerSlot";
import { ShopCard, ProductCard } from "@/components/ligo/Cards";
import {
  CategoryCardSkeleton,
  ProductGridSkeleton,
  ShopGridSkeleton,
} from "@/components/ligo/Skeletons";
import { ActiveOrderBanner } from "@/components/ligo/ActiveOrderBanner";
import { StorageImage } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { useI18n, type TFunction } from "@/lib/i18n";

/**
 * Prefer admin-customized copy from the database, but fall back to the
 * translated default when the stored value is still the shipped English text.
 * This lets the UI translate while preserving intentional admin edits.
 */
const copy = (t: TFunction, content: SiteContent | undefined, key: keyof SiteContent, key2: string) => {
  const db = content?.[key];
  return db && db !== DEFAULT_CONTENT[key] ? String(db) : t(key2);
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "የኔ Go — Fast. Local. Delivered." },
      {
        name: "description",
        content:
          "Order food, groceries, pharmacy items and more from Bishoftu shops. Fast local delivery, live tracking and Telebirr, CBE or cash payment.",
      },
      { property: "og:title", content: "የኔ Go — Fast. Local. Delivered." },
      {
        property: "og:description",
        content: "Fast local delivery across Bishoftu with live order tracking.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [quickCategory, setQuickCategory] = useState<string | null>(null);
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    ...categoriesQuery,
    queryFn: () => withFallback(() => categoriesQuery.queryFn(), FALLBACK_CATEGORIES),
  });
  const { data: shops = [], isLoading: shopsLoading } = useQuery({
    ...shopsQuery(),
    queryFn: () => withFallback(() => shopsQuery().queryFn(), FALLBACK_SHOPS),
  });
  const { data: popular = [], isLoading: popularLoading } = useQuery({
    ...featuredProductsQuery,
    queryFn: () => withFallback(() => featuredProductsQuery.queryFn(), FALLBACK_PRODUCTS),
  });
  const { data: offers = [] } = useQuery(offersQuery);
  const { data: c } = useQuery(siteContentQuery);
  const { data: heroBanners = [] } = useQuery(bannersQuery("home_hero"));
  const heroBanner = heroBanners[0];
  const { data: serviceCategories = [] } = useQuery(serviceCategoriesQuery);
  const { data: momentServices = [] } = useQuery({
    ...servicesQuery(),
    enabled: serviceCategories.length > 0,
  });

  const featuredShops = (
    quickCategory ? shops.filter((s) => s.category_id === quickCategory) : shops
  ).slice(0, 6);

  return (
    <div>
      <div className="container-ligo pt-4">
        <ActiveOrderBanner />
      </div>
      <BannerSlot placement="home_top" />
      <section className="border-b border-border bg-surface">
        <div className="container-ligo grid items-center gap-8 py-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-accent-foreground">
              {copy(t, c, "hero_badge", "home.heroBadge")}
            </span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight md:text-5xl">
              {copy(t, c, "hero_title", "home.heroTitle")}
            </h1>
            <p className="mt-4 max-w-lg text-muted-foreground">
              {copy(t, c, "hero_subtitle", "home.heroSubtitle")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/shops">{copy(t, c, "hero_primary_cta", "home.heroPrimaryCta")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/rider/join">
                  {copy(t, c, "hero_secondary_cta", "home.heroSecondaryCta")}
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Clock, key: "home.featureAvgTime" },
                { icon: Bike, key: "home.featureLocalRiders" },
                { icon: ShieldCheck, key: "home.featureVerifiedPayments" },
              ].map((f) => (
                <div key={f.key} className="flex items-center gap-2 text-sm font-medium">
                  <f.icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0">{t(f.key)}</span>
                </div>
              ))}
            </div>
          </div>
          {heroBanner?.image_url ? (
            <StorageImage
              path={heroBanner.image_url}
              alt={heroBanner.title || t("home.heroBannerAlt")}
              priority
              className="h-72 w-full rounded-2xl object-cover shadow-pop lg:h-96"
            />
          ) : (
            <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 lg:h-96">
              <span className="font-display text-2xl font-bold text-primary/60">የኔ Go</span>
            </div>
          )}
        </div>
      </section>

      <section className="container-ligo py-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">
            {copy(t, c, "categories_title", "home.categoriesTitle")}
          </h2>
          <Link to="/categories" className="shrink-0 text-sm font-medium text-primary">
            {t("action.seeAll")}
          </Link>
        </div>
        {categoriesLoading ? (
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {categories.slice(0, 12).map((cat) => (
              <Link
                key={cat.id}
                to="/shops"
                search={{ category: cat.id }}
                className="overflow-hidden rounded-xl border border-border bg-card text-center shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <StorageImage
                  path={cat.image_url}
                  alt={cat.name}
                  className="h-20 w-full object-cover"
                />
                <p className="line-clamp-2 p-2 text-xs font-semibold">{cat.name}</p>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={t("home.quickFilter")}>
          <button
            type="button"
            onClick={() => setQuickCategory(null)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              !quickCategory
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            {t("home.all")}
          </button>
          {categories.slice(0, 8).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setQuickCategory((cur) => (cur === cat.id ? null : cat.id))}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                quickCategory === cat.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              {cat.name}
            </button>
          ))}
          {quickCategory && (
            <button
              type="button"
              onClick={() => void navigate({ to: "/shops", search: { category: quickCategory } })}
              className="rounded-full border border-primary/40 bg-primary-soft px-3.5 py-1.5 text-sm font-semibold text-accent-foreground"
            >
              {t("home.viewAllIn", {
                category: categories.find((x) => x.id === quickCategory)?.name ?? "",
              })}
            </button>
          )}
        </div>
      </section>

      <BannerSlot placement="home_middle" />

      {serviceCategories.length > 0 && (
        <section className="container-ligo py-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl font-bold">{t("home.specialMomentsTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("home.specialMomentsSubtitle")}
              </p>
            </div>
            <Link
              to="/special-moments"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              {t("home.exploreSpecialMoments")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {serviceCategories.slice(0, 5).map((cat) => {
              const count = momentServices.filter((s) => s.service_category_id === cat.id).length;
              return <ServiceCategoryCard key={cat.id} category={cat} count={count} />;
            })}
          </div>
        </section>
      )}

      {offers.length > 0 && (
        <section className="container-ligo py-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-bold">
              {copy(t, c, "offers_title", "home.offersTitle")}
            </h2>
            <Link to="/offers" className="shrink-0 text-sm font-medium text-primary">
              {t("action.seeAll")}
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.slice(0, 3).map((o) => (
              <div
                key={o.id}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <StorageImage
                  path={o.image_url}
                  alt={o.title}
                  className="h-28 w-full object-cover"
                />
                <div className="p-4">
                  <p className="font-display font-bold">{o.title}</p>
                  <p className="text-sm text-muted-foreground">{o.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="container-ligo py-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">
            {copy(t, c, "shops_title", "home.shopsTitle")}
          </h2>
          <Link to="/shops" className="shrink-0 text-sm font-medium text-primary">
            {t("action.seeAll")}
          </Link>
        </div>
        {shopsLoading ? (
          <div className="mt-5">
            <ShopGridSkeleton />
          </div>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredShops.map((s) => (
              <ShopCard key={s.id} shop={s} />
            ))}
          </div>
        )}
        {!shopsLoading && featuredShops.length === 0 && (
          <p className="mt-5 text-sm text-muted-foreground">{t("home.noShopsInCategory")}</p>
        )}
      </section>

      {popularLoading ? (
        <section className="container-ligo pb-12">
          <h2 className="font-display text-2xl font-bold">
            {copy(t, c, "trending_title", "home.trendingTitle")}
          </h2>
          <div className="mt-5">
            <ProductGridSkeleton count={4} />
          </div>
        </section>
      ) : (
        popular.length > 0 && (
          <section className="container-ligo pb-12">
            <h2 className="font-display text-2xl font-bold">
              {copy(t, c, "trending_title", "home.trendingTitle")}
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {popular.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )
      )}

      <BannerSlot placement="home_bottom" />

      <section className="container-ligo pb-16">
        <div className="rounded-2xl bg-primary p-8 text-primary-foreground">
          <h2 className="font-display text-2xl font-bold">{copy(t, c, "how_title", "home.howTitle")}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Search,
                title: copy(t, c, "how_step1_title", "home.howStep1Title"),
                text: copy(t, c, "how_step1_text", "home.howStep1Text"),
              },
              {
                icon: ShieldCheck,
                title: copy(t, c, "how_step2_title", "home.howStep2Title"),
                text: copy(t, c, "how_step2_text", "home.howStep2Text"),
              },
              {
                icon: Bike,
                title: copy(t, c, "how_step3_title", "home.howStep3Title"),
                text: copy(t, c, "how_step3_text", "home.howStep3Text"),
              },
            ].map((s) => (
              <div key={s.title}>
                <s.icon className="h-6 w-6" />
                <p className="mt-2 font-display font-bold">{s.title}</p>
                <p className="text-sm opacity-90">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
