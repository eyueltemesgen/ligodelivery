import type { TranslationKey } from "@/lib/i18n";
export type ShopHoursRow = {
  id?: string;
  shop_id?: string;
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * Default daily opening window used whenever a shop/merchant has no explicit
 * hours. Bishoftu shops typically start early and stay open through the
 * evening, so 07:00–22:00 keeps delivery available across the full day instead
 * of a narrow 08:00–21:00 window. Keep these in sync with the DB column
 * defaults (see the shop_hours migration).
 */
export const DEFAULT_OPEN_HOUR = "07:00";
export const DEFAULT_CLOSE_HOUR = "22:00";

const toMinutes = (t: string) => {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m ?? 0);
};

const withinWindow = (opensAt: string, closesAt: string, now: Date) => {
  const mins = now.getHours() * 60 + now.getMinutes();
  const open = toMinutes(opensAt);
  const close = toMinutes(closesAt);
  return close > open ? mins >= open && mins <= close : mins >= open || mins <= close;
};

/**
 * A shop is open only when the merchant/admin "online" override is on AND
 * the current time falls inside today's weekly schedule (falling back to the
 * shop-level opens_at/closes_at when no per-day rows exist).
 */
export function isShopOpenNow(
  shop: { is_online?: boolean | null; opens_at?: string | null; closes_at?: string | null },
  hours?: ShopHoursRow[] | null,
  now = new Date(),
) {
  if (shop.is_online === false) return false;
  const today = hours?.find((h) => h.day_of_week === now.getDay());
  if (today) {
    if (today.is_closed) return false;
    return withinWindow(today.opens_at, today.closes_at, now);
  }
  if (!shop.opens_at || !shop.closes_at) return true;
  return withinWindow(shop.opens_at, shop.closes_at, now);
}

/** i18n key for the reason a shop is closed, for checkout/lock messaging. */
export function closedReasonKey(
  shop: { is_online?: boolean | null; opens_at?: string | null; closes_at?: string | null },
  hours?: ShopHoursRow[] | null,
): "shop_offline" | "shop_closed_today" | "shop_outside_hours" {
  if (shop.is_online === false) return "shop_offline";
  const today = hours?.find((h) => h.day_of_week === new Date().getDay());
  if (today?.is_closed) return "shop_closed_today";
  return "shop_outside_hours";
}
