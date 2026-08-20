import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bike, Clock, ShieldCheck, Search } from "lucide-react";
import heroImage from "@/assets/hero-rider.jpg";
import { categoriesQuery, featuredProductsQuery, offersQuery, shopsQuery } from "@/lib/queries";
import { bannersQuery, siteContentQuery } from "@/lib/content";
import { BannerSlot } from "@/components/ligo/BannerSlot";
import { ShopCard, ProductCard } from "@/components/ligo/Cards";
import { StorageImage } from "@/lib/media";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ligo Delivery — Food & grocery delivery in Bishoftu" },
      {
        name: "description",
        content:
          "Order food, groceries, pharmacy items and more from Bishoftu shops. Fast local delivery, live tracking and Telebirr, CBE or cash payment.",
      },
      { property: "og:title", content: "Ligo Delivery — Bishoftu food & grocery delivery" },
      {
        property: "og:description",
        content: "Fast local delivery across Bishoftu with live order tracking.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: shops = [] } = useQuery(shopsQuery());
  const { data: popular = [] } = useQuery(featuredProductsQuery);
  const { data: offers = [] } = useQuery(offersQuery);
  const { data: c } = useQuery(siteContentQuery);
  const { data: heroBanners = [] } = useQuery(bannersQuery("home_hero"));
  const heroBanner = heroBanners[0];

  return (
    <div>
      <BannerSlot placement="home_top" />
      <section className="border-b border-border bg-surface">
        <div className="container-ligo grid items-center gap-8 py-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-accent-foreground">
              {c?.hero_badge}
            </span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight md:text-5xl">
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
                { icon: Clock, t: "30 min average" },
                { icon: Bike, t: "Local riders" },
                { icon: ShieldCheck, t: "Verified payments" },
              ].map((f) => (
                <div key={f.t} className="flex items-center gap-2 text-sm font-medium">
                  <f.icon className="h-4 w-4 text-primary" />
                  {f.t}
                </div>
              ))}
            </div>
          </div>
          {heroBanner?.image_url ? (
            <StorageImage
              path={heroBanner.image_url}
              alt={heroBanner.title || "Ligo hero banner"}
              className="h-72 w-full rounded-2xl object-cover shadow-pop lg:h-96"
            />
          ) : (
            <img
              src={heroImage}
              alt="Ligo rider delivering an order in Bishoftu"
              className="h-72 w-full rounded-2xl object-cover shadow-pop lg:h-96"
            />
          )}
        </div>
      </section>

      <section className="container-ligo py-10">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">{c?.categories_title}</h2>
          <Link to="/categories" className="text-sm font-medium text-primary">
            See all
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {categories.slice(0, 12).map((c) => (
            <Link
              key={c.id}
              to="/shops"
              search={{ category: c.id }}
              className="overflow-hidden rounded-xl border border-border bg-card text-center shadow-card hover:shadow-pop"
            >
              <StorageImage path={c.image_url} alt={c.name} className="h-20 w-full object-cover" />
              <p className="p-2 text-xs font-semibold">{c.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <BannerSlot placement="home_middle" />

      {offers.length > 0 && (
        <section className="container-ligo py-4">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold">{c?.offers_title}</h2>
            <Link to="/offers" className="text-sm font-medium text-primary">
              See all
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.slice(0, 3).map((o) => (
              <div
                key={o.id}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
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
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">{c?.shops_title}</h2>
          <Link to="/shops" className="text-sm font-medium text-primary">
            See all
          </Link>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shops.slice(0, 6).map((s) => (
            <ShopCard key={s.id} shop={s} />
          ))}
        </div>
      </section>

      {popular.length > 0 && (
        <section className="container-ligo pb-12">
          <h2 className="font-display text-2xl font-bold">{c?.trending_title}</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {popular.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
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
