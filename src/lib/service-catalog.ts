import {
  Cake,
  CalendarHeart,
  Flower2,
  Gift,
  PartyPopper,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { PricingType } from "@/lib/special-moments";
import type { TranslationKey } from "@/lib/i18n";

/**
 * Presentation metadata for the five Special Moments categories. The database
 * owns the taxonomy (names, slugs, ordering, images); this map only supplies a
 * neutral icon and a short label used in navigation and cards.
 */
export type ServiceCategoryMeta = {
  icon: LucideIcon;
  nounKey: TranslationKey;
  blurbKey: TranslationKey;
};

const META: Record<string, ServiceCategoryMeta> = {
  surprises: {
    icon: PartyPopper,
    nounKey: "smcat_surprises",
    blurbKey: "smcat_surprises_blurb",
  },
  gifts: {
    icon: Gift,
    nounKey: "smcat_gifts",
    blurbKey: "smcat_gifts_blurb",
  },
  "holiday-gifts": {
    icon: CalendarHeart,
    nounKey: "smcat_holiday_gifts",
    blurbKey: "smcat_holiday_gifts_blurb",
  },
  catering: {
    icon: UtensilsCrossed,
    nounKey: "smcat_catering",
    blurbKey: "smcat_catering_blurb",
  },
  decoration: {
    icon: Flower2,
    nounKey: "smcat_decoration",
    blurbKey: "smcat_decoration_blurb",
  },
};

const FALLBACK_META: ServiceCategoryMeta = {
  icon: Cake,
  nounKey: "smcat_special_moments",
  blurbKey: "smcat_special_moments_blurb",
};

export const categoryMeta = (slug: string): ServiceCategoryMeta => META[slug] ?? FALLBACK_META;

export const pricingLabel = (
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  type: PricingType,
  price: number | null,
  startingPrice: number | null,
  currency = "ETB",
) => {
  const fmt = (n: number) =>
    `${n.toLocaleString("en-ET", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })} ${currency}`;
  if (type === "fixed" && price != null) return fmt(price);
  if (startingPrice != null) return t("sc_from_price", { price: fmt(startingPrice) });
  return t("sc_request_quote");
};
