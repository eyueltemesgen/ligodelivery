import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles } from "lucide-react";
import { SERVICE_CATEGORY_META, serviceCategoriesQuery } from "@/lib/services";
import { siteContentQuery } from "@/lib/content";
import { StorageImage } from "@/lib/media";

const FALLBACK = [
  {
    slug: "surprises",
    emoji: "🎉",
    name: "Surprises",
    blurb: "Experiences that land perfectly.",
    image: null,
  },
  { slug: "gifts", emoji: "🎁", name: "Gifts", blurb: "Thoughtful gifts, delivered.", image: null },
  {
    slug: "catering",
    emoji: "🍽️",
    name: "Catering",
    blurb: "Food for every gathering.",
    image: null,
  },
  {
    slug: "decoration",
    emoji: "🎈",
    name: "Decoration",
    blurb: "Styling that sets the scene.",
    image: null,
  },
];

/** Homepage entry point into the Special Moments service area. */
export function SpecialMomentsStrip() {
  const { data: categories = [] } = useQuery(serviceCategoriesQuery);
  const { data: content } = useQuery(siteContentQuery);

  const tiles = categories.length
    ? categories.map((c) => ({
        slug: c.slug,
        emoji: c.emoji ?? SERVICE_CATEGORY_META[c.slug]?.emoji ?? "✨",
        name: c.name,
        blurb: c.tagline ?? SERVICE_CATEGORY_META[c.slug]?.blurb ?? "",
        image: c.image_url,
      }))
    : FALLBACK;

  return (
    <section className="container-ligo py-10">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Special Moments
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
              {content?.special_moments_title ?? "Make every moment count."}
            </h2>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              {content?.special_moments_subtitle ??
                "Surprises, gifts, catering and decor for birthdays, weddings, graduations and every celebration in between."}
            </p>
          </div>
          <Link
            to="/special-moments"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
          >
            Explore Special Moments
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map((t) => (
            <Link
              key={t.slug}
              to="/special-moments"
              search={{ category: t.slug }}
              className="group overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <StorageImage
                path={t.image}
                alt={t.name}
                className="h-24 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-28"
              />
              <div className="p-3.5">
                <p className="flex items-center gap-1.5 font-display text-sm font-bold">
                  <span aria-hidden>{t.emoji}</span>
                  {t.name}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
