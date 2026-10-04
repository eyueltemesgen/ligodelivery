import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  Palette,
  Store,
  Users,
} from "lucide-react";
import {
  serviceAddonsQuery,
  serviceCategoriesQuery,
  serviceQuery,
  servicesQuery,
  type Service,
} from "@/lib/special-moments";
import { categoryMeta, pricingLabel } from "@/lib/service-catalog";
import { StorageImage } from "@/lib/media";
import { shopQuery } from "@/lib/queries";
import { isShopOpenNow } from "@/lib/hours";
import { ServiceRequestDialog } from "@/components/special-moments/ServiceRequestDialog";
import { ServiceCard } from "@/components/special-moments/ServiceCards";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/account/States";
import { ETB } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { OPTION_LABEL_KEY } from "@/lib/special-moments";

export const Route = createFileRoute("/special-moments/service/$serviceId")({
  head: () => ({
    meta: [
      { title: "Service — Special Moments · የኔ Go" },
      {
        name: "description",
        content:
          "Service details, what's included, add-ons and availability for የኔ Go Special Moments.",
      },
    ],
  }),
  component: ServiceDetailPage,
});

function ServiceDetailPage() {
  const { t } = useLanguage();
  const { serviceId } = Route.useParams();
  const { data: service, isLoading } = useQuery(serviceQuery(serviceId));
  const { data: categories = [] } = useQuery(serviceCategoriesQuery);
  const { data: addons = [] } = useQuery(serviceAddonsQuery(serviceId));
  const { data: shop } = useQuery({
    ...shopQuery(service?.shop_id ?? ""),
    enabled: !!service?.shop_id,
  });
  const { data: related = [] } = useQuery({
    ...servicesQuery({ categoryId: service?.service_category_id ?? "__none__" }),
    enabled: !!service?.service_category_id,
  });
  const [bookingOpen, setBookingOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="container-ligo py-10">
        <CardSkeleton />
      </div>
    );
  }
  if (!service) throw notFound();

  const category = categories.find((c) => c.id === service.service_category_id);
  const slug = category?.slug ?? "";
  const meta = categoryMeta(slug);
  const isQuote = service.pricing_type === "quote";
  const gallery = [service.image_url, ...(service.gallery ?? [])].filter(Boolean) as string[];
  const others = related.filter((s) => s.id !== service.id).slice(0, 4);

  return (
    <div>
      <div className="container-ligo pt-6">
        <Link
          to={slug ? "/special-moments/category/$slug" : "/special-moments"}
          params={slug ? { slug } : {}}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {category?.name ?? t("smi_badge")}
        </Link>
      </div>

      <section className="container-ligo grid gap-8 py-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-3">
          <StorageImage
            path={service.image_url}
            alt={service.name}
            priority
            className="h-64 w-full rounded-2xl object-cover shadow-card sm:h-80"
            fallback={<meta.icon className="h-10 w-10 text-muted-foreground" />}
          />
          {gallery.length > 1 && (
            <div className="grid grid-cols-3 gap-3">
              {gallery.slice(1, 4).map((g, i) => (
                <StorageImage
                  key={`${g}-${i}`}
                  path={g}
                  alt={`${service.name} image ${i + 2}`}
                  className="h-24 w-full rounded-xl object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-accent-foreground">
              <meta.icon className="h-3.5 w-3.5" />
              {category?.name ?? meta.noun}
            </span>
            {service.occasion && (
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                {t(OPTION_LABEL_KEY[service.occasion] ?? "sms_any_occasion")}
              </span>
            )}
            {isQuote && (
              <span className="rounded-full border border-primary/40 bg-primary-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
                {t("smd_quote_based")}
              </span>
            )}
          </div>

          <h1 className="mt-3 font-display text-3xl font-extrabold">{service.name}</h1>

          {shop && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Store className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">{shop.name}</span>
              {shop.address && <span>· {shop.address}</span>}
              {isShopOpenNow(shop) ? (
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                  {t("shop_open_now")}
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {t("smd_outside_hours")}
                </span>
              )}
            </p>
          )}

          <p className="mt-4 font-display text-2xl font-extrabold text-primary">
            {pricingLabel(service.pricing_type, service.price, service.starting_price)}
          </p>
          {isQuote && <p className="mt-1 text-sm text-muted-foreground">{t("smd_quote_note")}</p>}

          <div className="mt-5 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => setBookingOpen(true)}>
              {isQuote ? t("smd_request_quote") : t("smd_book_now")}
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/special-moments/search">{t("smd_browse_similar")}</Link>
            </Button>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            {service.service_area && (
              <InfoCell icon={MapPin} label={t("smd_service_area")} value={service.service_area} />
            )}
            {service.lead_time_hours > 0 && (
              <InfoCell
                icon={Clock}
                label={t("smd_notice_required")}
                value={t("smd_hours_value", { hours: service.lead_time_hours })}
              />
            )}
            {service.available_from && (
              <InfoCell
                icon={CalendarDays}
                label={t("smd_available_from")}
                value={new Date(service.available_from).toLocaleDateString("en-GB")}
              />
            )}
            {service.available_to && (
              <InfoCell
                icon={CalendarDays}
                label={t("smd_available_until")}
                value={new Date(service.available_to).toLocaleDateString("en-GB")}
              />
            )}
          </dl>
        </div>
      </section>

      <section className="container-ligo grid gap-8 pb-14 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          {service.description && (
            <div>
              <h2 className="font-display text-xl font-bold">{t("smd_about")}</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                {service.description}
              </p>
            </div>
          )}

          {service.included_items.length > 0 && (
            <div>
              <h2 className="font-display text-xl font-bold">{t("smd_included")}</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {service.included_items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {addons.length > 0 && (
            <div>
              <h2 className="font-display text-xl font-bold">{t("smd_addons")}</h2>
              <ul className="mt-3 space-y-2">
                {addons.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm"
                  >
                    <span>
                      <span className="font-medium">{a.name}</span>
                      {a.description && (
                        <span className="block text-xs text-muted-foreground">{a.description}</span>
                      )}
                    </span>
                    <span className="font-semibold">{ETB(a.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">{t("smd_how_it_works")}</h2>
            <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("smd_step_1")}
              </li>
              <li className="flex gap-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {isQuote ? t("smd_step_2_quote") : t("smd_step_2_fixed")}
              </li>
              <li className="flex gap-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {isQuote ? t("smd_step_3_quote") : t("smd_step_3_fixed")}
              </li>
            </ol>
          </div>
        </div>

        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
                <meta.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display font-bold">
                  {isQuote ? t("smd_request_quote") : t("smd_book_now")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isQuote ? t("smd_free_request") : t("smd_pay_after")}
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {t("smd_tell_occasion")}
              </li>
              <li className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                {t("smd_add_custom")}
              </li>
              <li className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                {t("smd_pick_date")}
              </li>
            </ul>
            <Button className="mt-4 w-full" size="lg" onClick={() => setBookingOpen(true)}>
              {isQuote ? t("smd_request_quote") : t("smd_book_now")}
            </Button>
          </div>
        </aside>
      </section>

      {others.length > 0 && (
        <section className="container-ligo pb-16">
          <h2 className="font-display text-xl font-bold">
            {t("smd_more_in", { category: category?.name ?? meta.noun })}
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </section>
      )}

      <ServiceRequestDialog
        service={service}
        categorySlug={slug}
        open={bookingOpen}
        onOpenChange={setBookingOpen}
      />
    </div>
  );
}

function InfoCell({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
