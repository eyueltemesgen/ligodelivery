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
import type { TFunction } from "@/lib/i18n";

/**
 * Presentation metadata for the five Special Moments categories. The database
 * owns the taxonomy (names, slugs, ordering, images); this map only supplies a
 * neutral icon and the translation keys used in navigation and cards.
 */
export type ServiceCategoryMeta = {
  icon: LucideIcon;
  nameKey: string;
  blurbKey: string;
};

const META: Record<string, ServiceCategoryMeta> = {
  surprises: {
    icon: PartyPopper,
    nameKey: "moments.categorySurprises",
    blurbKey: "moments.categoryBlurbSurprises",
  },
  gifts: {
    icon: Gift,
    nameKey: "moments.categoryGifts",
    blurbKey: "moments.categoryBlurbGifts",
  },
  "holiday-gifts": {
    icon: CalendarHeart,
    nameKey: "moments.categoryHolidayGifts",
    blurbKey: "moments.categoryBlurbHoliday",
  },
  catering: {
    icon: UtensilsCrossed,
    nameKey: "moments.categoryCatering",
    blurbKey: "moments.categoryBlurbCatering",
  },
  decoration: {
    icon: Flower2,
    nameKey: "moments.categoryDecoration",
    blurbKey: "moments.categoryBlurbDecoration",
  },
};

const FALLBACK_META: ServiceCategoryMeta = {
  icon: Cake,
  nameKey: "moments.title",
  blurbKey: "moments.heroBody",
};

export const categoryMeta = (slug: string): ServiceCategoryMeta => META[slug] ?? FALLBACK_META;

/**
 * Occasion values are stored in the database as stable English strings and used
 * as filter values, so only their display labels are translated. Unknown values
 * fall back to the raw stored string.
 */
const OCCASION_KEYS: Record<string, string> = {
  Birthday: "occasion.birthday",
  Anniversary: "occasion.anniversary",
  Graduation: "occasion.graduation",
  Proposal: "occasion.proposal",
  Welcome: "occasion.welcome",
  Celebration: "occasion.celebration",
  Wedding: "occasion.wedding",
  Engagement: "occasion.engagement",
  "Baby Shower": "occasion.babyShower",
  Corporate: "occasion.corporate",
  Holiday: "occasion.holiday",
  Other: "occasion.other",
  Christmas: "occasion.christmas",
  Eid: "occasion.eid",
  Easter: "occasion.easter",
  "New Year": "occasion.newYear",
  Timket: "occasion.timket",
  Meskel: "occasion.meskel",
  "Graduation season": "occasion.graduationSeason",
  "Mother's Day": "occasion.mothersDay",
  "Father's Day": "occasion.fathersDay",
  "Valentine's Day": "occasion.valentinesDay",
  "Other holiday": "occasion.otherHoliday",
};

export const occasionLabel = (t: TFunction, value: string): string => {
  const key = OCCASION_KEYS[value];
  return key ? t(key) : value;
};

/**
 * Service type pick-list values are also stored as stable English strings, so
 * only their display labels are translated. Unknown values fall back to the raw
 * stored string.
 */
const TYPE_KEYS: Record<string, string> = {
  "Birthday surprise": "type.birthdaySurprise",
  "Anniversary surprise": "type.anniversarySurprise",
  "Graduation surprise": "type.graduationSurprise",
  "Proposal surprise": "type.proposalSurprise",
  "Welcome surprise": "type.welcomeSurprise",
  "Celebration surprise": "type.celebrationSurprise",
  "Custom surprise": "type.customSurprise",
  "Gift box": "type.giftBox",
  Flowers: "type.flowers",
  Cake: "type.cake",
  Chocolates: "type.chocolates",
  Perfume: "type.perfume",
  "Personalized gift": "type.personalizedGift",
  "Greeting card": "type.greetingCard",
  "Gift bundle": "type.giftBundle",
  "Gift basket": "type.giftBasket",
  "Custom gift": "type.customGift",
  "Birthday catering": "type.birthdayCatering",
  "Family gathering": "type.familyGathering",
  "Office / corporate catering": "type.officeCatering",
  "Wedding catering": "type.weddingCatering",
  "Graduation catering": "type.graduationCatering",
  "Party food": "type.partyFood",
  "Dessert package": "type.dessertPackage",
  "Drink package": "type.drinkPackage",
  "Custom catering": "type.customCatering",
  "Birthday decoration": "type.birthdayDecoration",
  "Wedding decoration": "type.weddingDecoration",
  "Engagement decoration": "type.engagementDecoration",
  "Graduation decoration": "type.graduationDecoration",
  "Baby shower decoration": "type.babyShowerDecoration",
  "Balloon decoration": "type.balloonDecoration",
  "Flower decoration": "type.flowerDecoration",
  "Table decoration": "type.tableDecoration",
  "Venue decoration": "type.venueDecoration",
  "Custom decoration": "type.customDecoration",
};

export const serviceTypeLabel = (t: TFunction, value: string): string => {
  const key = TYPE_KEYS[value];
  return key ? t(key) : value;
};

export const pricingLabel = (
  t: TFunction,
  type: PricingType,
  price: number | null,
  startingPrice: number | null,
  currency = "ETB",
) => {
  const fmt = (n: number) =>
    `${n.toLocaleString("en-ET", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })} ${currency}`;
  if (type === "fixed" && price != null) return fmt(price);
  if (startingPrice != null) return t("moments.fromPrice", { amount: fmt(startingPrice) });
  return t("moments.requestQuotePrice");
};
