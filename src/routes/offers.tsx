import { BannerSlot } from "@/components/ligo/BannerSlot";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { offersQuery } from "@/lib/queries";
import { ShopGridSkeleton } from "@/components/ligo/Skeletons";
import { StorageImage } from "@/lib/media";
import { formatDate } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/i18n";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: translations.en.meta_offers_title },
      {
        name: "description",
        content: translations.en.meta_offers_desc,
      },
      { property: "og:title", content: translations.en.meta_offers_title },
      { property: "og:description", content: translations.en.meta_offers_og_desc },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  const { data = [], isLoading } = useQuery(offersQuery);
  const { t } = useLanguage();
  return (
    <div className="container-ligo py-10">
      <BannerSlot placement="offers" className="px-0 py-4" />
      <h1 className="font-display text-3xl font-extrabold">{t("offers_heading")}</h1>
      <p className="mt-2 text-muted-foreground">{t("offers_subtitle")}</p>
      {isLoading ? (
        <div className="mt-8">
          <ShopGridSkeleton />
        </div>
      ) : data.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">{t("offers_empty")}</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((o) => (
            <article
              key={o.id}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <StorageImage path={o.image_url} alt={o.title} className="h-32 w-full object-cover" />
              <div className="space-y-1 p-4">
                <div className="inline-flex rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {o.discount_type === "percent"
                    ? t("offers_percent_off", { value: o.discount_value })
                    : t("offers_etb_off", { value: o.discount_value })}
                </div>
                <h2 className="font-display text-lg font-bold">{o.title}</h2>
                <p className="text-sm text-muted-foreground">{o.description}</p>
                {o.ends_at && (
                  <p className="text-xs text-muted-foreground">
                    {t("offers_ends", { date: formatDate(o.ends_at) })}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
