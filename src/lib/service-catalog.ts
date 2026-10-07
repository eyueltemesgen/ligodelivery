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
import type { Language, TranslationKey } from "@/lib/i18n";

/**
 * Presentation metadata for the five Special Moments categories. The database
 * owns the taxonomy (names, slugs, ordering, images); this map only supplies a
 * neutral icon and the i18n keys used when the visitor is not reading English.
 */
export type ServiceCategoryMeta = {
  icon: LucideIcon;
  nounKey: TranslationKey;
  blurbKey: TranslationKey;
  taglineKey: TranslationKey;
  descKey: TranslationKey;
};

const META: Record<string, ServiceCategoryMeta> = {
  surprises: {
    icon: PartyPopper,
    nounKey: "smcat_surprises",
    blurbKey: "smcat_surprises_blurb",
    taglineKey: "smcat_surprises_tagline",
    descKey: "smcat_surprises_desc",
  },
  gifts: {
    icon: Gift,
    nounKey: "smcat_gifts",
    blurbKey: "smcat_gifts_blurb",
    taglineKey: "smcat_gifts_tagline",
    descKey: "smcat_gifts_desc",
  },
  "holiday-gifts": {
    icon: CalendarHeart,
    nounKey: "smcat_holiday_gifts",
    blurbKey: "smcat_holiday_gifts_blurb",
    taglineKey: "smcat_holiday_gifts_tagline",
    descKey: "smcat_holiday_gifts_desc",
  },
  catering: {
    icon: UtensilsCrossed,
    nounKey: "smcat_catering",
    blurbKey: "smcat_catering_blurb",
    taglineKey: "smcat_catering_tagline",
    descKey: "smcat_catering_desc",
  },
  decoration: {
    icon: Flower2,
    nounKey: "smcat_decoration",
    blurbKey: "smcat_decoration_blurb",
    taglineKey: "smcat_decoration_tagline",
    descKey: "smcat_decoration_desc",
  },
};

const FALLBACK_META: ServiceCategoryMeta = {
  icon: Cake,
  nounKey: "smcat_special_moments",
  blurbKey: "smcat_special_moments_blurb",
  taglineKey: "smcat_special_moments_blurb",
  descKey: "smcat_special_moments_blurb",
};

export const categoryMeta = (slug: string): ServiceCategoryMeta => META[slug] ?? FALLBACK_META;

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

type CategoryRow = {
  slug: string;
  name?: string | null;
  tagline?: string | null;
  description?: string | null;
};

/**
 * The database holds a single copy of each category, authored in English. For
 * Amharic and Oromo we prefer the curated i18n copy so the taxonomy is not left
 * half-translated; in English the stored value wins so admins can rename a
 * category without a code change.
 */
export function categoryCopy(
  t: Translate,
  category: CategoryRow | undefined,
  language: Language,
): { name: string; tagline: string; description: string } {
  const meta = categoryMeta(category?.slug ?? "");
  const localized = language !== "en";
  return {
    name: localized ? t(meta.nounKey) : category?.name || t(meta.nounKey),
    tagline: localized ? t(meta.taglineKey) : category?.tagline || t(meta.blurbKey),
    description: localized
      ? t(meta.descKey)
      : category?.description || category?.tagline || t(meta.blurbKey),
  };
}

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
