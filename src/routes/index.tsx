import { translations } from "@/lib/i18n";
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
import { bannersQuery, siteContentQuery } from "@/lib/content";
import { AdCarousel } from "@/components/ligo/AdCarousel";
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
import { useLanguage } from "@/hooks/useLanguage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: translations.en.root_meta_title },
      {
        name: "description",
        content: translations.en.index_meta_desc,
      },
      { property: "og:title", content: translations.en.root_meta_title },
      {
        property: "og:description",
        content: translations.en.index_meta_og_desc,
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
            <h1 className="font-display text-4xl font-extrabold leading-tight md:text-5xl">
              {c?.hero_title}
            </h1>
            <p className="mt-4 max-w-lg text-muted-foreground">{c?.hero_subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/shops">{c?.hero_primary_cta}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/rider/join">{c?.hero_secondary_cta}</Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Clock, t: t("home_feature_avg") },
                { icon: Bike, t: t("home_feature_riders") },
                { icon: ShieldCheck, t: t("home_feature_payments") },
              ].map((f) => (
                <div key={f.t} className="flex items-center gap-2 text-sm font-medium">
                  <f.icon className="h-4 w-4 text-primary" />
                  {f.t}
                </div>
              ))}
            </div>
          </div>
          {heroBanners.length > 0 ? (
            <AdCarousel
              placement="home_hero"
              className=""
              chrome={false}
              priority
              width={1080}
              aspect="aspect-[16/9] lg:aspect-auto lg:h-96"
              wrapperClassName="rounded-2xl shadow-pop"
            />
          ) : (
            <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 lg:h-96">
              <span className="font-display text-2xl font-bold text-primary/60">የኔ Go</span>
            </div>
          )}
        </div>
      </section>

      <section className="container-ligo py-10">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">{c?.categories_title}</h2>
          <Link to="/categories" className="text-sm font-medium text-primary">
            {t("home_see_all")}
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
            {categories.slice(0, 12).map((c) => (
              <Link
                key={c.id}
                to="/shops"
                search={{ category: c.id }}
                className="overflow-hidden rounded-xl border border-border bg-card text-center shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <StorageImage
                  path={c.image_url}
                  alt={c.name}
                  width={320}
                  height={160}
                  className="h-20 w-full object-cover"
                />
                <p className="p-2 text-xs font-semibold">{c.name}</p>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={t("home_quick_filter")}>
          <button
            type="button"
            onClick={() => setQuickCategory(null)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              !quickCategory
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            {t("home_all")}
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
              {t("home_view_all_in")}{" "}
              {categories.find((x) => x.id === quickCategory)?.name ?? t("home_category")} →
            </button>
          )}
        </div>
      </section>

      <BannerSlot placement="home_middle" />

      {serviceCategories.length > 0 && (
        <section className="container-ligo py-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl font-bold">{t("home_moments_title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("home_moments_subtitle")}</p>
            </div>
            <Link
              to="/special-moments"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              {t("home_explore_moments")}
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
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold">{c?.offers_title}</h2>
            <Link to="/offers" className="text-sm font-medium text-primary">
              {t("home_see_all")}
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
                  width={720}
                  height={168}
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
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">{c?.shops_title}</h2>
          <Link to="/shops" className="text-sm font-medium text-primary">
            {t("home_see_all")}
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
          <p className="mt-5 text-sm text-muted-foreground">{t("home_no_shops")}</p>
        )}
      </section>

      {popularLoading ? (
        <section className="container-ligo pb-12">
          <h2 className="font-display text-2xl font-bold">{c?.trending_title}</h2>
          <div className="mt-5">
            <ProductGridSkeleton count={4} />
          </div>
        </section>
      ) : (
        popular.length > 0 && (
          <section className="container-ligo pb-12">
            <h2 className="font-display text-2xl font-bold">{c?.trending_title}</h2>
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
          <h2 className="font-display text-2xl font-bold">{c?.how_title}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {[
              { icon: Search, t: c?.how_step1_title, d: c?.how_step1_text },
              { icon: ShieldCheck, t: c?.how_step2_title, d: c?.how_step2_text },
              { icon: Bike, t: c?.how_step3_title, d: c?.how_step3_text },
            ].map((s) => (
              <div key={s.t}>
                <s.icon className="h-6 w-6" />
                <p className="mt-2 font-display font-bold">{s.t}</p>
                <p className="text-sm opacity-90">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
