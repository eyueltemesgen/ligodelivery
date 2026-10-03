import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ArrowRight,
  CalendarHeart,
  Quote,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  OCCASIONS,
  SERVICE_CATEGORY_META,
  featuredServicesQuery,
  serviceCategoriesQuery,
  serviceCountsByCategoryQuery,
  servicesQuery,
} from "@/lib/services";
import { ServiceCard } from "@/components/ligo/ServiceCards";
import { GridSkeleton } from "@/components/account/States";
import { StorageImage } from "@/lib/media";
import { ETB } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Search = {
  category?: string | undefined;
  occasion?: string | undefined;
  q?: string | undefined;
  maxPrice?: number | undefined;
};

export const Route = createFileRoute("/special-moments/")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const out: Search = {};
    if (typeof s["category"] === "string") out.category = s["category"];
    if (typeof s["occasion"] === "string") out.occasion = s["occasion"];
    if (typeof s["q"] === "string") out.q = s["q"];
    if (typeof s["maxPrice"] === "number") out.maxPrice = s["maxPrice"];
    return out;
  },
  component: SpecialMomentsHome,
});

const FALLBACK_META = [
  {
    slug: "surprises",
    emoji: "🎉",
    name: "Surprises",
    blurb: "Surprise experiences and deliveries that land perfectly.",
    examples: ["Birthday surprise", "Anniversary surprise", "Proposal surprise"],
  },
  {
    slug: "gifts",
    emoji: "🎁",
    name: "Gifts",
    blurb: "Thoughtful gifts, wrapped and delivered to their door.",
    examples: ["Gift boxes", "Flowers", "Cakes", "Personalised gifts"],
  },
  {
    slug: "catering",
    emoji: "🍽️",
    name: "Catering",
    blurb: "Food and drink for gatherings of every size.",
    examples: ["Birthday catering", "Office catering", "Dessert tables"],
  },
  {
    slug: "decoration",
    emoji: "🎈",
    name: "Decoration",
    blurb: "Event and venue styling that sets the scene.",
    examples: ["Birthday decoration", "Wedding decoration", "Venue styling"],
  },
];

const PRICE_BANDS = [500, 1000, 2000, 5000, 10000];

function SpecialMomentsHome() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: categories = [] } = useQuery(serviceCategoriesQuery);
  const { data: counts = {} } = useQuery(serviceCountsByCategoryQuery);

  const activeCategory = categories.find((c) => c.slug === search.category);
  const hasFilters = !!(search.category || search.occasion || search.q || search.maxPrice);

  const { data: services = [], isLoading } = useQuery(
    servicesQuery({
      categoryId: activeCategory?.id ?? null,
      categorySlug: search.category ?? null,
      occasion: search.occasion ?? null,
      search: search.q ?? null,
    }),
  );

  const { data: featured = [] } = useQuery({
    ...featuredServicesQuery(6),
    enabled: !hasFilters,
  });

  const filtered = useMemo(() => {
    if (!search.maxPrice) return services;
    return services.filter((s) => {
      const value = Number(s.price) > 0 ? Number(s.price) : (s.starting_price ?? 0);
      return value > 0 && value <= search.maxPrice!;
    });
  }, [services, search.maxPrice]);

  const tiles = categories.length
    ? categories.map((c) => ({
        slug: c.slug,
        emoji: c.emoji ?? SERVICE_CATEGORY_META[c.slug]?.emoji ?? "✨",
        name: c.name,
        blurb: c.tagline ?? SERVICE_CATEGORY_META[c.slug]?.blurb ?? "",
        image: c.image_url,
        examples: SERVICE_CATEGORY_META[c.slug]?.examples ?? [],
        count: counts[c.id] ?? 0,
      }))
    : FALLBACK_META.map((m) => ({ ...m, image: null, count: 0 }));

  const clearFilters = () => void navigate({ to: "/special-moments", search: {} });

  const heading = activeCategory
    ? `${activeCategory.emoji ?? ""} ${activeCategory.name}`.trim()
    : search.occasion
      ? `${search.occasion} services`
      : "All special moments";

  return (
    <div className="pb-16">
      {/* Hero — landing only */}
      {!hasFilters && (
        <section className="relative overflow-hidden border-b border-border bg-surface">
          <div className="container-ligo grid items-center gap-8 py-12 lg:grid-cols-[1.1fr_1fr] lg:py-16">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-accent-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Special Moments
              </span>
              <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
                Make someone's day unforgettable.
              </h1>
              <p className="mt-4 max-w-xl text-muted-foreground">
                From surprise deliveries and thoughtful gifts to catering and beautiful decorations,
                Yene Go helps you create special moments from one place.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href="#services">Explore services</a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/account/requests">My requests</Link>
                </Button>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: CalendarHeart, t: "Plan ahead" },
                  { icon: ShieldCheck, t: "Verified providers" },
                  { icon: Quote, t: "Free quotes" },
                ].map((f) => (
                  <div key={f.t} className="flex items-center gap-2 text-sm font-medium">
                    <f.icon className="h-4 w-4 text-primary" />
                    {f.t}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {tiles.slice(0, 4).map((t) => (
                <Link
                  key={t.slug}
                  to="/special-moments"
                  search={{ category: t.slug }}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card"
                >
                  <StorageImage
                    path={t.image}
                    alt={t.name}
                    className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-40"
                  />
                  <span className="absolute bottom-2 left-3 font-display text-sm font-bold text-white drop-shadow sm:text-base">
                    <span aria-hidden className="mr-1">
                      {t.emoji}
                    </span>
                    {t.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Four service categories */}
      <section id="services" className="container-ligo scroll-mt-32 py-12">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Four ways to celebrate</h2>
        <p className="mt-1 text-muted-foreground">
          Choose a category to browse real services from Yene Go providers.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t) => (
            <Link
              key={t.slug}
              to="/special-moments"
              search={{ category: t.slug }}
              className={cn(
                "group flex flex-col rounded-xl border bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
                search.category === t.slug ? "border-primary" : "border-border",
              )}
            >
              <span className="text-3xl" aria-hidden>
                {t.emoji}
              </span>
              <h3 className="mt-3 font-display text-lg font-bold">{t.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.blurb}</p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {t.examples.slice(0, 3).map((ex) => (
                  <li key={ex} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    {ex}
                  </li>
                ))}
              </ul>
              <span className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">
                {t.count > 0 ? `${t.count} available` : "Browse"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Filters + results */}
      <section className="container-ligo">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-bold">Find the right service</h2>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                const value = (new FormData(e.currentTarget).get("q") as string) ?? "";
                void navigate({
                  to: "/special-moments",
                  search: { ...search, q: value.trim() || undefined },
                });
              }}
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={search.q ?? ""}
                placeholder="Search services…"
                className="pl-9"
                aria-label="Search services"
              />
            </form>
            <Select
              value={search.occasion ?? "any"}
              onValueChange={(v) =>
                void navigate({
                  to: "/special-moments",
                  search: { ...search, occasion: v === "any" ? undefined : v },
                })
              }
            >
              <SelectTrigger aria-label="Filter by occasion">
                <SelectValue placeholder="Occasion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any occasion</SelectItem>
                {OCCASIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={search.maxPrice ? String(search.maxPrice) : "any"}
              onValueChange={(v) =>
                void navigate({
                  to: "/special-moments",
                  search: { ...search, maxPrice: v === "any" ? undefined : Number(v) },
                })
              }
            >
              <SelectTrigger aria-label="Filter by maximum price">
                <SelectValue placeholder="Max price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any price</SelectItem>
                {PRICE_BANDS.map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    Up to {ETB(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button type="button" variant="outline" onClick={clearFilters} className="w-full">
                <X className="mr-2 h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-end justify-between">
          <h2 className="font-display text-xl font-bold sm:text-2xl">{heading}</h2>
          {!isLoading && (
            <span className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "service" : "services"}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="mt-5">
            <GridSkeleton count={6} />
          </div>
        ) : filtered.length > 0 ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <span className="text-3xl" aria-hidden>
              ✨
            </span>
            <h3 className="mt-3 font-display text-lg font-bold">
              {hasFilters ? "Nothing matches those filters" : "Services are on the way"}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {hasFilters
                ? "Try a different occasion or price range, or clear your filters to see everything."
                : "Surprises, gifts, catering and decoration from Yene Go providers will appear here as soon as they're published. Check back soon — or explore the marketplace today."}
            </p>
            {hasFilters ? (
              <Button variant="outline" className="mt-5" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button asChild className="mt-5">
                <Link to="/shops">Browse shops</Link>
              </Button>
            )}
          </div>
        )}
      </section>

      {/* Featured — landing only */}
      {!hasFilters && featured.length > 0 && (
        <section className="container-ligo pt-12">
          <h2 className="font-display text-2xl font-bold">Featured for you</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </section>
      )}

      {/* Occasions */}
      <section className="container-ligo py-12">
        <h2 className="font-display text-2xl font-bold">Every occasion</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {OCCASIONS.map((o) => (
            <Link
              key={o}
              to="/special-moments"
              search={{ ...search, occasion: o }}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                search.occasion === o
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {o}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
