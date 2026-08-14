import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { searchQuery } from "@/lib/queries";
import { ProductCard, ShopCard } from "@/components/ligo/Cards";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : "" }),
  head: () => ({
    meta: [
      { title: "Search — Ligo Delivery Bishoftu" },
      { name: "description", content: "Search shops and products available for delivery in Bishoftu." },
      { property: "og:title", content: "Search — Ligo Delivery" },
      { property: "og:description", content: "Find shops and products in Bishoftu." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data, isLoading } = useQuery(searchQuery(q));

  return (
    <div className="container-ligo py-10">
      <h1 className="font-display text-3xl font-extrabold">Search results</h1>
      <p className="mt-2 text-muted-foreground">{q ? `Showing matches for “${q}”` : "Type something in the search bar above."}</p>
      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Searching…</p>}
      {data && (
        <>
          {data.shops.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold">Shops</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.shops.map((s) => <ShopCard key={s.id} shop={s} />)}
              </div>
            </section>
          )}
          {data.products.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold">Products</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          )}
          {q && data.shops.length === 0 && data.products.length === 0 && (
            <p className="mt-8 text-sm text-muted-foreground">Nothing matched your search.</p>
          )}
        </>
      )}
    </div>
  );
}
