import {
  Cake,
  CalendarHeart,
  Flower2,
  Gift,
  ListChecks,
  Package,
  PartyPopper,
  ReceiptText,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { PricingType } from "@/lib/special-moments";
import type { Language, TranslationKey } from "@/lib/i18n";

/**
 * Presentation metadata for the Special Moments categories. The database owns
 * the taxonomy (names, slugs, ordering, images); this map only supplies a
 * neutral icon and the i18n keys used when the visitor is not reading English.
 *
 * This covers the original five gifting categories plus the three concierge
 * ones (errands, bill payments, parcels) that compete directly with Tona and
 * Bishoftu Delivery.
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
  errands: {
    icon: ListChecks,
    nounKey: "smcat_errands",
    blurbKey: "smcat_errands_blurb",
    taglineKey: "smcat_errands_tagline",
    descKey: "smcat_errands_desc",
  },
  "bill-payments": {
    icon: ReceiptText,
    nounKey: "smcat_bills",
    blurbKey: "smcat_bills_blurb",
    taglineKey: "smcat_bills_tagline",
    descKey: "smcat_bills_desc",
  },
  parcels: {
    icon: Package,
    nounKey: "smcat_parcels",
    blurbKey: "smcat_parcels_blurb",
    taglineKey: "smcat_parcels_tagline",
    descKey: "smcat_parcels_desc",
  },
};

const FALLBACK_META: ServiceCategoryMeta = {
  icon: Cake,
  nounKey: "smcat_special_moments",
  blurbKey: "smcat_special_moments_blurb",
  taglineKey: "smcat_special_moments_blurb",
  descKey: "smcat_special_moments_blurb",
};

/**
 * Concierge services we have withdrawn. A live project that already ran the
 * seed migration still has the row, so filter it out by slug rather than
 * relying on the database alone.
 */
export const RETIRED_SERVICE_SLUGS: readonly string[] = ["errand-queue-standing"];

export const isRetiredService = (slug: string) => RETIRED_SERVICE_SLUGS.includes(slug);

/**
 * Categories that belong to the concierge hub (errands, bills, parcels) rather
 * than to Special Moments gifting.
 *
 * The database holds one flat `service_categories` table and the Special Moments
 * hub rendered every row, so adding bill payments put them under a heading that
 * promises gifts and celebrations. This is the split: `/concierge` shows these,
 * `/special-moments` shows the rest. A new category with a slug nobody has
 * classified yet stays on Special Moments, so nothing silently disappears.
 */
export const CONCIERGE_SLUGS = ["errands", "bill-payments", "parcels"] as const;

export const isConciergeSlug = (slug: string) =>
  (CONCIERGE_SLUGS as readonly string[]).includes(slug);

/** Split a mixed category list into [specialMoments, concierge], preserving order. */
export function splitCategories<T extends { slug: string }>(categories: T[]) {
  return {
    specialMoments: categories.filter((c) => !isConciergeSlug(c.slug)),
    concierge: categories.filter((c) => isConciergeSlug(c.slug)),
  };
}

export const categoryMeta = (slug: string): ServiceCategoryMeta => META[slug] ?? FALLBACK_META;

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

type CategoryRow = {
  slug: string;
  name?: string | null;
  tagline?: string | null;
  description?: string | null;
};

/**
 * Localized spelling for the cities we operate in.
 *
 * `site_content.city` is admin-authored in English ("Bishoftu"), so injecting it
 * raw into Amharic copy produced `በBishoftu ውስጥ` — a Latin word inside an Ethiopic
 * sentence, which reads as broken to an Amharic speaker. Only known cities are
 * translated; anything else (an admin renaming the city, or adding a new one)
 * passes through unchanged, so we never invent a transliteration.
 */
const CITY_NAMES: Record<string, Partial<Record<Language, string>>> = {
  Bishoftu: { am: "ቢሾፍቱ", or: "Bishooftuu" },
};

export function localizedCity(city: string | null | undefined, language: Language): string {
  const value = city || "Bishoftu";
  if (language === "en") return value;
  return CITY_NAMES[value]?.[language] ?? value;
}

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
  vars?: Record<string, string | number>,
): { name: string; tagline: string; description: string } {
  const meta = categoryMeta(category?.slug ?? "");
  const localized = language !== "en";
  // Several localized category strings interpolate `{city}`. Passing no vars
  // renders the placeholder literally ("Waan kamiyyuu {city} keessa ergi"), so
  // every call must supply a value; the DB `site_content.city` wins where the
  // caller has it, with the same Bishoftu default the Special Moments hub uses.
  const placeholders = { city: localizedCity("Bishoftu", language), ...vars };
  return {
    name: localized ? t(meta.nounKey, placeholders) : category?.name || t(meta.nounKey),
    tagline: localized ? t(meta.taglineKey, placeholders) : category?.tagline || t(meta.blurbKey),
    description: localized
      ? t(meta.descKey, placeholders)
      : category?.description || category?.tagline || t(meta.blurbKey),
  };
}

/**
 * Curated, translatable copy for the concierge catalogue.
 *
 * Services are platform-authored content (the migration seeds them), unlike shop
 * and product names which are merchant data we must leave as written. So these
 * get real translations; a slug with no entry falls back to the stored row, so
 * an admin adding a service still sees it in English rather than a blank card.
 */
const SERVICE_COPY: Record<string, { nameKey: TranslationKey; descKey: TranslationKey }> = {
  "errand-grocery-run": {
    nameKey: "csvc_errand_grocery_run_name",
    descKey: "csvc_errand_grocery_run_desc",
  },
  "errand-document-pickup": {
    nameKey: "csvc_errand_document_pickup_name",
    descKey: "csvc_errand_document_pickup_desc",
  },
  "errand-pharmacy-run": {
    nameKey: "csvc_errand_pharmacy_run_name",
    descKey: "csvc_errand_pharmacy_run_desc",
  },
  "errand-custom": { nameKey: "csvc_errand_custom_name", descKey: "csvc_errand_custom_desc" },
  "bill-electric": { nameKey: "csvc_bill_electric_name", descKey: "csvc_bill_electric_desc" },
  "bill-water": { nameKey: "csvc_bill_water_name", descKey: "csvc_bill_water_desc" },
  "bill-telephone": { nameKey: "csvc_bill_telephone_name", descKey: "csvc_bill_telephone_desc" },
  "bill-school-fees": {
    nameKey: "csvc_bill_school_fees_name",
    descKey: "csvc_bill_school_fees_desc",
  },
  "bill-other": { nameKey: "csvc_bill_other_name", descKey: "csvc_bill_other_desc" },
  "parcel-document": { nameKey: "csvc_parcel_document_name", descKey: "csvc_parcel_document_desc" },
  "parcel-small-package": {
    nameKey: "csvc_parcel_small_package_name",
    descKey: "csvc_parcel_small_package_desc",
  },
  "parcel-fragile": { nameKey: "csvc_parcel_fragile_name", descKey: "csvc_parcel_fragile_desc" },
  "parcel-food": { nameKey: "csvc_parcel_food_name", descKey: "csvc_parcel_food_desc" },
  "parcel-bulk": { nameKey: "csvc_parcel_bulk_name", descKey: "csvc_parcel_bulk_desc" },
};

/**
 * Localized name/description for a service. In English (or for an unknown slug)
 * the stored row wins, so admin edits and new services are never hidden.
 */
export function serviceCopy(
  t: Translate,
  service: { slug?: string | null; name: string; description?: string | null },
  language: Language,
): { name: string; description: string } {
  const entry = service.slug ? SERVICE_COPY[service.slug] : undefined;
  if (language === "en" || !entry) {
    return { name: service.name, description: service.description ?? "" };
  }
  return { name: t(entry.nameKey), description: t(entry.descKey) };
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
