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

/** Human-readable reason a shop is closed, for checkout/lock messaging. */
export function closedReason(
  shop: { is_online?: boolean | null; opens_at?: string | null; closes_at?: string | null },
  hours?: ShopHoursRow[] | null,
) {
  if (shop.is_online === false) return "This shop is temporarily offline.";
  const today = hours?.find((h) => h.day_of_week === new Date().getDay());
  if (today?.is_closed) return "This shop is closed today.";
  return "This shop is currently outside its opening hours.";
}
