import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bike, Clock, ShieldCheck, Search } from "lucide-react";
import heroImage from "@/assets/hero-rider.jpg";
import { categoriesQuery, featuredProductsQuery, offersQuery, shopsQuery } from "@/lib/queries";
import { ShopCard, ProductCard } from "@/components/ligo/Cards";
import { StorageImage } from "@/lib/media";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ligo Delivery — Food & grocery delivery in Bishoftu" },
      { name: "description", content: "Order food, groceries, pharmacy items and more from Bishoftu shops. Fast local delivery, live tracking and Telebirr, CBE or cash payment." },
      { property: "og:title", content: "Ligo Delivery — Bishoftu food & grocery delivery" },
      { property: "og:description", content: "Fast local delivery across Bishoftu with live order tracking." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: shops = [] } = useQuery(shopsQuery());
  const { data: popular = [] } = useQuery(featuredProductsQuery);
  const { data: offers = [] } = useQuery(offersQuery);

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="container-ligo grid items-center gap-8 py-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-accent-foreground">
              Delivering across Bishoftu
            </span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight md:text-5xl">
              Everything you need, delivered in minutes
            </h1>
            <p className="mt-4 max-w-lg text-muted-foreground">
              Food, groceries, pharmacy and daily essentials from your favourite Bishoftu shops — with live tracking and Telebirr, CBE, BOA or cash payment.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/shops">Order now</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/rider/join">Become a rider</Link></Button>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Clock, t: "30 min average" },
                { icon: Bike, t: "Local riders" },
                { icon: ShieldCheck, t: "Verified payments" },
              ].map((f) => (
                <div key={f.t} className="flex items-center gap-2 text-sm font-medium">
                  <f.icon className="h-4 w-4 text-primary" />{f.t}
                </div>
              ))}
            </div>
          </div>
          <img src={heroImage} alt="Ligo rider delivering an order in Bishoftu" className="h-72 w-full rounded-2xl object-cover shadow-pop lg:h-96" />
        </div>
      </section>

      <section className="container-ligo py-10">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">Categories</h2>
          <Link to="/categories" className="text-sm font-medium text-primary">See all</Link>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {categories.slice(0, 12).map((c) => (
            <Link key={c.id} to="/shops" search={{ category: c.id }} className="overflow-hidden rounded-xl border border-border bg-card text-center shadow-card hover:shadow-pop">
              <StorageImage path={c.image_url} alt={c.name} className="h-20 w-full object-cover" />
              <p className="p-2 text-xs font-semibold">{c.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {offers.length > 0 && (
        <section className="container-ligo py-4">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold">Today's offers</h2>
            <Link to="/offers" className="text-sm font-medium text-primary">See all</Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.slice(0, 3).map((o) => (
              <div key={o.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
                <StorageImage path={o.image_url} alt={o.title} className="h-28 w-full object-cover" />
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
          <h2 className="font-display text-2xl font-bold">Popular shops</h2>
          <Link to="/shops" className="text-sm font-medium text-primary">See all</Link>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shops.slice(0, 6).map((s) => <ShopCard key={s.id} shop={s} />)}
        </div>
      </section>

      {popular.length > 0 && (
        <section className="container-ligo pb-12">
          <h2 className="font-display text-2xl font-bold">Trending items</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {popular.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <section className="container-ligo pb-16">
        <div className="rounded-2xl bg-primary p-8 text-primary-foreground">
          <h2 className="font-display text-2xl font-bold">How Ligo works</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {[
              { icon: Search, t: "1. Choose", d: "Browse Bishoftu shops and add items to your cart." },
              { icon: ShieldCheck, t: "2. Pay", d: "Cash on delivery or upload your Telebirr/bank receipt." },
              { icon: Bike, t: "3. Track", d: "Follow your rider live until the order arrives." },
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
