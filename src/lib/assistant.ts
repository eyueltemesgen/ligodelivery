/**
 * Client-safe vocabulary for the customer shopping assistant.
 *
 * This module must stay free of Supabase and of any server-only import: the
 * lazy assistant island in the browser bundle and the server-side agent loop
 * both import these types. Keeping one definition means a tool result can never
 * be shaped differently on the two sides of the wire.
 */
import type { Language, TranslationKey } from "@/lib/i18n";
import type { PricingType } from "@/lib/special-moments";

export type AssistantRole = "user" | "assistant";

export type AssistantShop = {
  id: string;
  name: string;
  imageUrl: string | null;
  deliveryFee: number;
  deliveryTimeMin: number;
  rating: number;
  /**
   * Visible review count. `shops.rating` is seeded at 4.5 for shops with no
   * reviews, so consumers must gate the displayed score on this to avoid
   * advertising a rating no customer has given.
   */
  ratingCount: number;
  categoryName: string | null;
};

export type AssistantProduct = {
  id: string;
  shopId: string;
  shopName: string | null;
  name: string;
  imageUrl: string | null;
  price: number;
  discountPercent: number;
  inStock: boolean;
};

export type AssistantHours = {
  shopId: string;
  shopName: string;
  isOpen: boolean;
  /** Why the shop is closed, or null when it is open. */
  reasonKey: TranslationKey | null;
  today: AssistantHoursDay | null;
  schedule: AssistantHoursDay[];
};

export type AssistantHoursDay = {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
};

export type AssistantDeliveryFee = {
  shopId: string;
  shopName: string;
  /** True only when the fee engine returned a price; numbers are the RPC's. */
  ok: boolean;
  distanceKm: number | null;
  deliveryFee: number | null;
  pricingRule: string | null;
  failureKey: TranslationKey | null;
};

export type AssistantOrder = {
  id: string;
  orderCode: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
};

export type AssistantService = {
  id: string;
  slug: string;
  name: string;
  categorySlug: string | null;
  pricingType: PricingType;
  price: number | null;
  startingPrice: number | null;
  imageUrl: string | null;
};

/**
 * The discriminated union the UI renders. Every money/status/distance figure a
 * customer sees is read from one of these payloads — never from assistant prose.
 */
export type AssistantToolResult =
  | { kind: "catalogue"; shops: AssistantShop[]; products: AssistantProduct[] }
  | { kind: "shops"; shops: AssistantShop[] }
  | { kind: "products"; products: AssistantProduct[] }
  | { kind: "hours"; hours: AssistantHours }
  | { kind: "delivery_fee"; fee: AssistantDeliveryFee }
  | { kind: "orders"; orders: AssistantOrder[] }
  | { kind: "services"; services: AssistantService[] }
  | { kind: "none"; noteKey: TranslationKey | null };

export type AssistantMessage = {
  id: string;
  role: AssistantRole;
  text: string;
  results: AssistantToolResult[];
  /** True when the turn failed, so the panel can offer a retry. */
  failed?: boolean;
};

/** A single transcript entry sent to the server (no ids, no result cards). */
export type AssistantTurn = { role: AssistantRole; text: string };

export type AssistantRequest = {
  messages: AssistantTurn[];
  language: Language;
  /** Optional visitor coordinates, used only for delivery-fee estimates. */
  lat?: number | null;
  lng?: number | null;
};

export type AssistantResponse = {
  reply: string;
  results: AssistantToolResult[];
};

/**
 * Caps shared by the client and the server so an oversized request is rejected
 * before it reaches the model. The server re-validates every one of these.
 */
export const ASSISTANT_MAX_TURNS = 12;
export const ASSISTANT_MAX_CHARS = 600;
export const ASSISTANT_MAX_TOOL_ITERATIONS = 4;

/** Starter prompts offered in an empty panel. Keys resolve through i18n. */
export const ASSISTANT_STARTERS: TranslationKey[] = [
  "ai_starter_search",
  "ai_starter_hours",
  "ai_starter_delivery",
  "ai_starter_order",
  "ai_starter_gift",
];

/** Localized day names, indexed by `Date.getDay()` (0 = Sunday). */
export const ASSISTANT_DAY_KEYS: TranslationKey[] = [
  "ai_day_sun",
  "ai_day_mon",
  "ai_day_tue",
  "ai_day_wed",
  "ai_day_thu",
  "ai_day_fri",
  "ai_day_sat",
];
