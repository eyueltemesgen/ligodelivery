import { Link } from "@tanstack/react-router";
import { Check, CircleDot, Clock, MapPin, Sparkles, Star, XCircle } from "lucide-react";
import { StorageImage } from "@/lib/media";
import { ETB } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  SERVICE_STATUS_LABEL,
  SERVICE_STATUS_TONE,
  SERVICE_TIMELINE,
  serviceTimelineIndex,
  type ServiceWithShop,
} from "@/lib/services";

const priceText = (service: ServiceWithShop) => {
  if (service.pricing_type === "quote") return "Request a quote";
  const value = Number(service.price) > 0 ? Number(service.price) : service.starting_price;
  if (!value) return "Request a quote";
  const prefix = Number(service.price) > 0 ? "" : "From ";
  return `${prefix}${ETB(value)}${service.price_unit ? ` ${service.price_unit}` : ""}`;
};

export function ServiceCard({ service }: { service: ServiceWithShop }) {
  const cover = service.cover_url ?? service.images?.[0] ?? null;
  const emoji = service.service_categories?.emoji ?? "✨";
  return (
    <Link
      to="/special-moments/$serviceId"
      params={{ serviceId: service.id }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <StorageImage
          path={cover}
          alt={service.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2 py-1 text-[11px] font-semibold shadow-sm">
          {emoji} {service.service_categories?.name ?? "Special Moments"}
        </span>
        {service.is_featured && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-bold uppercase text-primary-foreground shadow-sm">
            <Sparkles className="h-3 w-3" />
            Featured
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-base font-bold leading-snug">{service.name}</h3>
        {service.shops?.name && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-primary" />
            <span className="truncate">{service.shops.name}</span>
          </p>
        )}
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {service.summary ?? service.description}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <span className="font-display text-sm font-bold text-primary">{priceText(service)}</span>
          {service.rating > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {Number(service.rating).toFixed(1)}
            </span>
          )}
          {service.duration_minutes ? (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {service.duration_minutes} min
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function ServiceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        SERVICE_STATUS_TONE[status] ?? "bg-secondary text-secondary-foreground",
      )}
    >
      {SERVICE_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/**
 * Vertical lifecycle for a service request. Quotes are an extra branch, so the
 * timeline is request-focused rather than the delivery timeline used by orders.
 */
export function ServiceRequestTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <ol className="space-y-0">
        <li className="flex gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
            <XCircle className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-destructive">Request cancelled</p>
            <p className="text-xs text-muted-foreground">
              This request was cancelled and is no longer being fulfilled.
            </p>
          </div>
        </li>
      </ol>
    );
  }

  const currentIndex = serviceTimelineIndex(status);

  return (
    <ol className="space-y-0">
      {SERVICE_TIMELINE.map((step, idx) => {
        const done = currentIndex > idx;
        const current = currentIndex === idx;
        const last = idx === SERVICE_TIMELINE.length - 1;
        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                  done && "bg-primary text-primary-foreground",
                  current && "bg-primary text-primary-foreground ring-4 ring-primary-soft",
                  !done && !current && "bg-secondary text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : current ? (
                  <CircleDot className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </span>
              {!last && (
                <span
                  className={cn(
                    "my-0.5 w-0.5 flex-1 rounded-full",
                    done ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
            <div className={cn("min-w-0", last ? "pb-0" : "pb-5")}>
              <p
                className={cn(
                  "text-sm",
                  current
                    ? "font-bold text-foreground"
                    : done
                      ? "font-semibold"
                      : "text-muted-foreground",
                )}
              >
                {SERVICE_STATUS_LABEL[step] ?? step}
              </p>
              {current && <p className="mt-0.5 text-xs text-primary">Current status</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
