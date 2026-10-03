import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { serviceCategoriesQuery } from "@/lib/services";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/special-moments")({
  head: () => ({
    meta: [
      { title: "Special Moments — Surprises, gifts, catering & decor | Yene Go" },
      {
        name: "description",
        content:
          "Surprises, gifts, catering and decoration for birthdays, weddings, graduations and more — all in one place on Yene Go.",
      },
      { property: "og:title", content: "Special Moments — Yene Go" },
      {
        property: "og:description",
        content: "Surprises, gifts, catering and decor for every occasion.",
      },
    ],
  }),
  component: SpecialMomentsLayout,
});

function SpecialMomentsLayout() {
  const { data: categories = [] } = useQuery(serviceCategoriesQuery);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div>
      <nav
        aria-label="Special Moments categories"
        className="sticky top-16 z-30 border-b border-border bg-background/90 backdrop-blur-md"
      >
        <div className="container-ligo flex items-center gap-2 overflow-x-auto py-2.5">
          <Link
            to="/special-moments"
            className={cn(
              "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              pathname === "/special-moments"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            All
          </Link>
          {categories.map((c) => {
            const active = pathname.includes(c.slug);
            return (
              <Link
                key={c.id}
                to="/special-moments"
                search={{ category: c.slug }}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary-soft text-accent-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40",
                )}
              >
                <span aria-hidden>{c.emoji}</span>
                {c.name}
              </Link>
            );
          })}
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
