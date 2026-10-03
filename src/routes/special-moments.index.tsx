import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowRight, Compass, Gift, Sparkles, UtensilsCrossed } from "lucide-react";
import { serviceCategoriesQuery, servicesQuery } from "@/lib/special-moments";
import { ServiceCard, ServiceCategoryCard } from "@/components/special-moments/ServiceCards";
import { Button } from "@/components/ui/button";
import { GridSkeleton } from "@/components/account/States";
import { siteContentQuery } from "@/lib/content";

export const Route = createFileRoute("/special-moments/")({
  head: () => ({
    meta: [
      { title: "Special Moments — የኔ Go" },
      {
        name: "description",
        content:
          "Arrange gifts, surprises, catering and decoration for life's important occasions with የኔ Go.",
      },
      { property: "og:title", content: "Special Moments — የኔ Go" },
      {
        property: "og:description",
        content: "Gifts, surprises, holiday gifts, catering and decoration from one place.",
      },
    ],
  }),
  component: SpecialMomentsHub,
});

const HIGHLIGHTS = [
  { icon: Gift, title: "Curated gifts", text: "Boxes, flowers, cakes and personalised keepsakes." },
  {
    icon: UtensilsCrossed,
    title: "Catering & decoration",
    text: "Fixed packages or a tailored quote for your event.",
  },
  { icon: Sparkles, title: "Surprises handled", text: "We coordinate the reveal, your way." },
];

function SpecialMomentsHub() {
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

  const featured = services.filter((s) => s.is_featured).slice(0, 4);
  const showcase = featured.length > 0 ? featured : services.slice(0, 4);
  const giftsCategory = categories.find((c) => c.slug === "gifts");

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="container-ligo grid gap-8 py-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Special Moments
            </span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight md:text-5xl">
              Make the moment special.
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              From thoughtful gifts and memorable surprises to catering and beautiful event
              decoration, የኔ Go helps you create special moments from one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {giftsCategory ? (
                <Button asChild size="lg">
                  <Link to="/special-moments/category/$slug" params={{ slug: giftsCategory.slug }}>
                    Explore gifts
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg">
                  <Link to="/special-moments/search">Explore services</Link>
                </Button>
              )}
              <Button asChild size="lg" variant="outline">
                <Link to="/special-moments/search">Find a service</Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {HIGHLIGHTS.map((h) => (
                <div key={h.title} className="flex gap-3">
                  <h.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">{h.title}</p>
                    <p className="text-xs text-muted-foreground">{h.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {categories.slice(0, 4).map((c) => (
              <ServiceCategoryCard key={c.id} category={c} className="col-span-1" />
            ))}
          </div>
        </div>
      </section>

      <section className="container-ligo py-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-bold">Browse by category</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Five ways to celebrate, all managed by our team.
            </p>
          </div>
          <Link to="/special-moments/search" className="text-sm font-medium text-primary">
            Search all services
          </Link>
        </div>
        {categories.length === 0 ? (
          <EmptyCategoryState />
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {categories.map((c) => (
              <ServiceCategoryCard key={c.id} category={c} count={counts[c.id] ?? 0} />
            ))}
          </div>
        )}
      </section>

      <section className="container-ligo pb-14">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">Featured services</h2>
          <Link to="/special-moments/search" className="text-sm font-medium text-primary">
            See everything
          </Link>
        </div>
        {isLoading ? (
          <div className="mt-5">
            <GridSkeleton count={4} />
          </div>
        ) : showcase.length === 0 ? (
          <EmptyServiceState />
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {showcase.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        )}
      </section>

      <section className="container-ligo pb-16">
        <div className="rounded-2xl bg-primary p-8 text-primary-foreground">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl font-bold">Need something bespoke?</h2>
              <p className="mt-2 text-sm opacity-90">
                Tell us the occasion and our team will put together a tailored plan and quote,
                delivered anywhere in {content?.city ?? "Bishoftu"}.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary">
              <Link to="/special-moments/search">
                Request a quote
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
  return (
    <div className="mt-5 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <Compass className="mx-auto h-7 w-7 text-muted-foreground" />
      <p className="mt-3 font-display font-bold">Special Moments is being set up</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Our team is preparing services for this area. Please check back shortly.
      </p>
    </div>
  );
}

function EmptyServiceState() {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <Sparkles className="mx-auto h-7 w-7 text-muted-foreground" />
      <p className="mt-3 font-display font-bold">No services published yet</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Services appear here as soon as they are published by our team. Nothing is shown until it is
        real and available.
      </p>
    </div>
  );
}
