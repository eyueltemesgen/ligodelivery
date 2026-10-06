import { supabase } from "@/integrations/supabase/client";
import type { TranslationKey } from "@/lib/i18n";

/**
 * Client wrapper around the single server-side delivery fee calculation
 * (`public.calculate_delivery_fee`). The server is authoritative: the UI only
 * displays the number it returns and never computes a fee locally.
 */

export type DeliveryQuote =
  | { ok: true; distance: number; deliveryFee: number; pricingRule: string }
  | {
      ok: false;
      reason: DeliveryFailureReason;
      distance?: number | undefined;
      flatFee?: number | undefined;
    };

export type DeliveryFailureReason =
  | "customer_location_unavailable"
  | "shop_location_unavailable"
  | "outside_service_area"
  | "no_rule"
  | "shop_not_found"
  | "error";

type RawQuote = {
  ok?: boolean;
  reason?: string;
  distance?: number;
  delivery_fee?: number;
  pricing_rule?: string;
};

/** Calls the fee engine for a shop + customer coordinates. Never throws. */
export async function quoteDeliveryFee(
  shopId: string,
  lat: number | null | undefined,
  lng: number | null | undefined,
): Promise<DeliveryQuote> {
  if (!shopId) return { ok: false, reason: "error" };
  try {
    const { data, error } = await supabase.rpc("calculate_delivery_fee", {
      p_shop_id: shopId,
      p_lat: (lat ?? null) as number,
      p_lng: (lng ?? null) as number,
    });
    if (error) {
      // Migration not applied yet → fall back to the shop's flat fee.
      return { ok: false, reason: "error" };
    }
    const raw = (data ?? {}) as RawQuote;
    if (raw.ok) {
      return {
        ok: true,
        distance: Number(raw.distance ?? 0),
        deliveryFee: Number(raw.delivery_fee ?? 0),
        pricingRule: raw.pricing_rule ?? "",
      };
    }
    return {
      ok: false,
      reason: normalizeReason(raw.reason),
      distance: raw.distance != null ? Number(raw.distance) : undefined,
      flatFee: raw.delivery_fee != null ? Number(raw.delivery_fee) : undefined,
    };
  } catch {
    return { ok: false, reason: "error" };
  }
}

function normalizeReason(reason: string | undefined): DeliveryFailureReason {
  switch (reason) {
    case "customer_location_unavailable":
    case "shop_location_unavailable":
    case "outside_service_area":
    case "no_rule":
    case "shop_not_found":
      return reason;
    default:
      return "error";
  }
}

/** i18n keys for each failure, so callers can render a clear message. */
export const DELIVERY_FAILURE_KEY: Record<DeliveryFailureReason, TranslationKey> = {
  customer_location_unavailable: "delivery_err_location",
  shop_location_unavailable: "delivery_err_shop_location",
  outside_service_area: "delivery_err_outside",
  no_rule: "delivery_err_no_rule",
  shop_not_found: "delivery_err_shop_location",
  error: "delivery_err_generic",
};

/** Human readable distance, e.g. 3.4 → "3.4 km". */
export const formatDistance = (km: number) => `${Number(km).toFixed(1)} km`;
