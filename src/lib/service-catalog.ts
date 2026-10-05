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
import { en } from "@/lib/locales/en";
import { useLanguage } from "@/hooks/useLanguage";

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

/**
 * The migration seeds these English values. They differ from the `smcat_*`
 * English copy, so both are treated as "untouched" and replaced with the
 * visitor's language. Anything else is an admin edit and always wins.
 */
const SEEDED: Record<string, { name: string; tagline: string; description: string }> = {
  surprises: {
    name: "Surprises",
    tagline: "Unforgettable moments, delivered",
    description:
      "Birthday, anniversary, graduation, proposal, welcome and celebration surprises arranged end to end.",
  },
  gifts: {
    name: "Gifts",
    tagline: "Thoughtful gifts for every occasion",
    description:
      "Gift boxes, flowers, cakes, chocolates, perfume, personalised gifts, cards and curated bundles.",
  },
  "holiday-gifts": {
    name: "Holiday Gifts",
    tagline: "Seasonal and holiday gifting",
    description:
      "Admin-managed holiday gift campaigns for Christmas, Eid, Easter, New Year, Timket, Meskel and more.",
  },
  catering: {
    name: "Catering",
    tagline: "Food for gatherings of every size",
    description:
      "Birthday, family, corporate, wedding, graduation and party catering with fixed packages or custom quotes.",
  },
  decoration: {
    name: "Decoration",
    tagline: "Beautiful spaces for special events",
    description:
      "Birthday, wedding, engagement, graduation, baby shower, balloon, flower, table and venue decoration.",
  },
};

function prefersTranslation(
  slug: string,
  field: "name" | "tagline" | "description",
  value: string | null | undefined,
  key: TranslationKey,
) {
  const trimmed = value?.trim();
  if (!trimmed) return true;
  if (trimmed === (en[key] as string | undefined)) return true;
  return trimmed === SEEDED[slug]?.[field];
}

type Translate = (key: TranslationKey) => string;

/** Localized category name, falling back to the DB value for custom categories. */
export function categoryDisplayName(
  t: Translate,
  category: { slug: string; name: string },
): string {
  const { nounKey } = categoryMeta(category.slug);
  return prefersTranslation(category.slug, "name", category.name, nounKey)
    ? t(nounKey)
    : category.name;
}

/** Localized category tagline/description, falling back to the DB value. */
export function categoryDisplayTagline(
  t: Translate,
  category: { slug: string; tagline?: string | null; description?: string | null },
): string {
  const { blurbKey } = categoryMeta(category.slug);
  const tagline = category.tagline?.trim();
  if (tagline && !prefersTranslation(category.slug, "tagline", tagline, blurbKey)) {
    return tagline;
  }
  const description = category.description?.trim();
  if (description && !prefersTranslation(category.slug, "description", description, blurbKey)) {
    return description;
  }
  return t(blurbKey);
}

export function useCategoryName(category: { slug: string; name: string }): string {
  const { t } = useLanguage();
  return categoryDisplayName(t, category);
}

export function useCategoryTagline(category: {
  slug: string;
  tagline?: string | null;
  description?: string | null;
}): string {
  const { t } = useLanguage();
  return categoryDisplayTagline(t, category);
}
