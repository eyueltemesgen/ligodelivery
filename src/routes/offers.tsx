import { BannerSlot } from "@/components/ligo/BannerSlot";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { offersQuery } from "@/lib/queries";
import { ShopGridSkeleton } from "@/components/ligo/Skeletons";
import { StorageImage } from "@/lib/media";
import { formatDate } from "@/lib/format";
import { useI18n, useContentTranslations } from "@/lib/i18n";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Offers & discounts — የኔ Go · Bishoftu" },
      {
        name: "description",
        content:
          "Live discounts and promotions from Bishoftu restaurants and shops on የኔ Go.",
      },
      { property: "og:title", content: "Offers & discounts — የኔ Go" },
      { property: "og:description", content: "Live promotions from Bishoftu shops." },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  const { data = [], isLoading } = useQuery(offersQuery);
  const { t } = useI18n();
  const { localize } = useContentTranslations("offer");
  const offers = data.map((o) => localize({ ...o, name: o.title }));
  return (
    <div className="container-ligo py-10">
      <BannerSlot placement="offers" className="px-0 py-4" />
      <h1 className="font-display text-3xl font-extrabold">{t("offers.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("offers.subtitle")}</p>
      {isLoading ? (
        <div className="mt-8">
          <ShopGridSkeleton />
        </div>
      ) : data.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">{t("offers.none")}</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((o) => (
            <article
              key={o.id}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <StorageImage
                path={o.image_url}
                alt={o.name ?? o.title}
                className="h-32 w-full object-cover"
              />
              <div className="space-y-1 p-4">
                <div className="inline-flex rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {o.discount_type === "percent"
                    ? t("offers.percentOff", { value: o.discount_value })
                    : t("offers.amountOff", { value: o.discount_value })}
                </div>
                <h2 className="font-display text-lg font-bold">{o.name ?? o.title}</h2>
                <p className="text-sm text-muted-foreground">{o.description}</p>
                {o.ends_at && (
                  <p className="text-xs text-muted-foreground">
                    {t("offers.ends", { date: formatDate(o.ends_at) })}
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
