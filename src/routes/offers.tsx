import { BannerSlot } from "@/components/ligo/BannerSlot";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { offersQuery } from "@/lib/queries";
import { StorageImage } from "@/lib/media";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Offers & discounts — Ligo Delivery Bishoftu" },
      { name: "description", content: "Live discounts and promotions from Bishoftu restaurants and shops on Ligo Delivery." },
      { property: "og:title", content: "Offers & discounts — Ligo Delivery" },
      { property: "og:description", content: "Live promotions from Bishoftu shops." },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  const { data = [], isLoading } = useQuery(offersQuery);
  return (
      <BannerSlot placement="offers" />
    <div className="container-ligo py-10">
      <h1 className="font-display text-3xl font-extrabold">Offers</h1>
      <p className="mt-2 text-muted-foreground">Deals running right now in Bishoftu.</p>
      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading offers…</p>
      ) : data.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No active offers right now — check back soon.</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((o) => (
            <article key={o.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              <StorageImage path={o.image_url} alt={o.title} className="h-32 w-full object-cover" />
              <div className="space-y-1 p-4">
                <div className="inline-flex rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {o.discount_type === "percent" ? `${o.discount_value}% off` : `${o.discount_value} ETB off`}
                </div>
                <h2 className="font-display text-lg font-bold">{o.title}</h2>
                <p className="text-sm text-muted-foreground">{o.description}</p>
                {o.ends_at && <p className="text-xs text-muted-foreground">Ends {formatDate(o.ends_at)}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
