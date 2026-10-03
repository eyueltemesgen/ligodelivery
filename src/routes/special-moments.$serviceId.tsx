import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  Check,
  Clock,
  MapPin,
  Package,
  Star,
  Store,
  Users,
} from "lucide-react";
import { serviceQuery, serviceOptionsQuery, shopServicesQuery } from "@/lib/services";
import { ServiceCard } from "@/components/ligo/ServiceCards";
import { ServiceRequestForm } from "@/components/ligo/ServiceRequestForm";
import { StorageImage } from "@/lib/media";
import { ETB } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/special-moments/$serviceId")({
  head: () => ({
    meta: [
      { title: "Service — Special Moments | Yene Go" },
      { name: "description", content: "Book a special moment on Yene Go." },
    ],
  }),
  component: ServiceDetail,
});

function ServiceDetail() {
  const { serviceId } = Route.useParams();
  const { data: service, isLoading } = useQuery(serviceQuery(serviceId));
  const { data: options = [] } = useQuery(serviceOptionsQuery(serviceId));
  const { data: moreFromShop = [] } = useQuery(shopServicesQuery(service?.shop_id));

  const gallery = service
    ? [service.cover_url, ...(service.images ?? [])].filter((x): x is string => !!x)
    : [];
  const [activeImage, setActiveImage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="container-ligo py-10">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="h-72 animate-pulse rounded-xl bg-secondary" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-full animate-pulse rounded bg-secondary" />
            <div className="h-40 animate-pulse rounded-xl bg-secondary" />
          </div>
        </div>
      </div>
    );
  }

  if (!service) throw notFound();

  const mainImage = activeImage ?? gallery[0] ?? null;
  const emoji = service.service_categories?.emoji ?? "✨";
  const isQuote = service.pricing_type === "quote";
  const priceValue = Number(service.price) > 0 ? Number(service.price) : service.starting_price;
  const others = moreFromShop.filter((s) => s.id !== service.id).slice(0, 3);

  return (
    <div className="container-ligo py-8 pb-16">
      <nav className="mb-4 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link to="/special-moments" className="hover:text-foreground">
          Special Moments
        </Link>
        <span className="mx-1.5">/</span>
        <Link
          to="/special-moments"
          search={{ category: service.service_categories?.slug ?? undefined }}
          className="hover:text-foreground"
        >
          {service.service_categories?.name}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{service.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: media + details */}
        <div className="min-w-0 space-y-8">
          <div className="space-y-3">
            <StorageImage
              path={mainImage}
              alt={service.name}
              priority
              className="aspect-[16/10] w-full rounded-xl border border-border object-cover"
            />
            {gallery.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {gallery.map((img) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    aria-label="View image"
                    className={cn(
                      "h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                      (activeImage ?? gallery[0]) === img
                        ? "border-primary"
                        : "border-transparent opacity-80 hover:opacity-100",
                    )}
                  >
                    <StorageImage path={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-accent-foreground">
                {emoji} {service.service_categories?.name}
              </span>
              {service.is_featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning-foreground">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Featured
                </span>
              )}
              {service.rating > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {Number(service.rating).toFixed(1)}
                  {service.review_count > 0 && ` (${service.review_count})`}
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
              {service.name}
            </h1>
            {service.summary && <p className="mt-2 text-muted-foreground">{service.summary}</p>}

            {service.shops?.name && (
              <Link
                to="/shops/$shopId"
                params={{ shopId: service.shop_id }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-card hover:border-primary/40"
              >
                <Store className="h-4 w-4 text-primary" />
                <span className="font-semibold">{service.shops.name}</span>
                <span className="text-muted-foreground">· View shop</span>
              </Link>
            )}
          </div>

          {service.description && (
            <section>
              <h2 className="font-display text-lg font-bold">About this service</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            </section>
          )}

          {service.includes.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold">What's included</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {service.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {options.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold">Optional add-ons</h2>
              <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
                {options.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 p-3.5 text-sm">
                    <span>
                      <span className="block font-medium">{o.name}</span>
                      {o.description && (
                        <span className="block text-xs text-muted-foreground">{o.description}</span>
                      )}
                    </span>
                    <span className="shrink-0 font-semibold text-primary">
                      {Number(o.price_delta) === 0
                        ? "Free"
                        : `${Number(o.price_delta) > 0 ? "+" : ""}${ETB(o.price_delta)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2">
            <InfoRow
              icon={CalendarClock}
              label="Preparation time"
              value={
                service.preparation_hours
                  ? `~${service.preparation_hours} hours`
                  : service.duration_minutes
                    ? `${service.duration_minutes} minutes`
                    : "Confirmed with provider"
              }
            />
            <InfoRow
              icon={MapPin}
              label="Service area"
              value={service.service_area ?? "Bishoftu and surroundings"}
            />
            {(service.min_guests != null || service.max_guests != null) && (
              <InfoRow
                icon={Users}
                label="Guest capacity"
                value={
                  service.min_guests && service.max_guests
                    ? `${service.min_guests}–${service.max_guests} guests`
                    : service.min_guests
                      ? `${service.min_guests}+ guests`
                      : `Up to ${service.max_guests} guests`
                }
              />
            )}
            <InfoRow
              icon={Clock}
              label="Booking lead time"
              value={
                service.lead_time_hours >= 24
                  ? `${Math.ceil(service.lead_time_hours / 24)} days notice`
                  : `${service.lead_time_hours} hours notice`
              }
            />
          </section>
        </div>

        {/* Right: booking */}
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-32 lg:h-fit">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isQuote ? "Pricing" : "Price"}
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold">
              {isQuote
                ? "Request a quote"
                : priceValue
                  ? `${Number(service.price) > 0 ? "" : "From "}${ETB(priceValue)}${
                      service.price_unit ? ` ${service.price_unit}` : ""
                    }`
                  : "Request a quote"}
            </p>
            {service.occasions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {service.occasions.slice(0, 5).map((o) => (
                  <span
                    key={o}
                    className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
                  >
                    {o}
                  </span>
                ))}
              </div>
            )}
          </div>
          <ServiceRequestForm service={service} />
        </aside>
      </div>

      {others.length > 0 && (
        <section className="mt-14">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold">More from {service.shops?.name}</h2>
            <Link
              to="/shops/$shopId"
              params={{ shopId: service.shop_id }}
              className="text-sm font-medium text-primary"
            >
              View shop
            </Link>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((s) => (
              <ServiceCard
                key={s.id}
                service={{
                  ...s,
                  shops: service.shops,
                  service_categories: service.service_categories,
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 shadow-card">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
