import { BannerSlot } from "@/components/ligo/BannerSlot";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { categoriesQuery, shopsQuery } from "@/lib/queries";
import { ShopCard } from "@/components/ligo/Cards";

export const Route = createFileRoute("/shops/")({
  validateSearch: (s: Record<string, unknown>) =>
    typeof s['category'] === "string" ? { category: s['category'] } : {},
  head: () => ({
    meta: [
      { title: "Shops in Bishoftu — Ligo Delivery" },
      { name: "description", content: "Order from restaurants, supermarkets, bakeries and pharmacies across Bishoftu with Ligo delivery." },
      { property: "og:title", content: "Shops in Bishoftu — Ligo Delivery" },
      { property: "og:description", content: "Browse local shops delivering across Bishoftu." },
    ],
  }),
  component: ShopsPage,
});

function ShopsPage() {
  const { category } = Route.useSearch();
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: shops = [], isLoading } = useQuery(shopsQuery(category));

  return (
      <BannerSlot placement="shops" />
    <div className="container-ligo py-10">
      <h1 className="font-display text-3xl font-extrabold">Shops</h1>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/shops" search={{}} className={`rounded-full border px-3 py-1.5 text-sm ${!category ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            to="/shops"
            search={{ category: c.id }}
            className={`rounded-full border px-3 py-1.5 text-sm ${category === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
          >
            {c.name}
          </Link>
        ))}
      </div>
      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading shops…</p>
      ) : shops.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No shops in this category yet.</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((s) => <ShopCard key={s.id} shop={s} />)}
        </div>
      )}
    </div>
  );
}
