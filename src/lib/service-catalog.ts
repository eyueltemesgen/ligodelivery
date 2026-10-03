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

/**
 * Presentation metadata for the five Special Moments categories. The database
 * owns the taxonomy (names, slugs, ordering, images); this map only supplies a
 * neutral icon and a short label used in navigation and cards.
 */
export type ServiceCategoryMeta = {
  icon: LucideIcon;
  noun: string;
  blurb: string;
};

const META: Record<string, ServiceCategoryMeta> = {
  surprises: {
    icon: PartyPopper,
    noun: "Surprises",
    blurb: "Birthday, anniversary, proposal and celebration surprises, arranged end to end.",
  },
  gifts: {
    icon: Gift,
    noun: "Gifts",
    blurb: "Gift boxes, flowers, cakes, chocolates, perfume and personalised gifts.",
  },
  "holiday-gifts": {
    icon: CalendarHeart,
    noun: "Holiday Gifts",
    blurb: "Seasonal and holiday gift campaigns, managed and scheduled by our team.",
  },
  catering: {
    icon: UtensilsCrossed,
    noun: "Catering",
    blurb: "Food for birthdays, family gatherings, offices, weddings and parties.",
  },
  decoration: {
    icon: Flower2,
    noun: "Decoration",
    blurb: "Balloons, flowers, tables and full venue styling for your event.",
  },
};

const FALLBACK_META: ServiceCategoryMeta = {
  icon: Cake,
  noun: "Special Moments",
  blurb: "Gifts, surprises, catering and decoration for life's important occasions.",
};

export const categoryMeta = (slug: string): ServiceCategoryMeta => META[slug] ?? FALLBACK_META;

export const pricingLabel = (
  type: PricingType,
  price: number | null,
  startingPrice: number | null,
  currency = "ETB",
) => {
  const fmt = (n: number) =>
    `${n.toLocaleString("en-ET", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })} ${currency}`;
  if (type === "fixed" && price != null) return fmt(price);
  if (startingPrice != null) return `From ${fmt(startingPrice)}`;
  return "Request a quote";
};
