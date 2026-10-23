import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { addressesQuery } from "@/lib/account";

/**
 * The customer's location, used to show distance and delivery fee on shop cards
 * before they open a shop.
 *
 * Resolution order, cheapest first:
 *   1. their saved default address (already fetched for the account area),
 *   2. browser geolocation, but only when they have no saved address.
 *
 * Geolocation is deliberately *not* requested on page load. A permission prompt
 * on first visit is hostile and, on a phone, it is a full-screen interruption
 * before the customer has seen a single shop. With no saved address the cards
 * simply show no distance, which is honest, and the customer opts in by adding
 * an address or sharing location where we ask for it (checkout).
 */
export type CustomerLocation = {
  lat: number | null;
  lng: number | null;
  /** True once we have coordinates to measure from. */
  known: boolean;
  source: "address" | "geolocation" | "none";
};

export function useCustomerLocation(): CustomerLocation {
  const { user } = useAuth();
  const { data: addresses = [] } = useQuery(addressesQuery(user?.id));
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];
  // Memoised so the effect below does not re-run on every render: `addresses`
  // is a fresh array reference each fetch and this object is derived from it.
  const addressCoords = useMemo(
    () =>
      defaultAddress?.lat != null && defaultAddress?.lng != null
        ? { lat: Number(defaultAddress.lat), lng: Number(defaultAddress.lng) }
        : null,
    [defaultAddress?.lat, defaultAddress?.lng],
  );

  useEffect(() => {
    // Only reach for the browser API when there is no saved address to use.
    if (addressCoords || typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        /* denied or unavailable — cards just omit distance */
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
    return () => {
      cancelled = true;
    };
  }, [addressCoords]);

  const coords = addressCoords ?? geo;
  return {
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    known: coords != null,
    source: addressCoords ? "address" : geo ? "geolocation" : "none",
  };
}

export type ShopDistance = {
  ok: boolean;
  distance?: number;
  deliveryFee?: number;
  pricingRule?: string;
  reason?: string;
};

/**
 * Distance + fee for a list of shops, in one request.
 *
 * Backed by `shop_distances`, which in turn calls `calculate_delivery_fee` — the
 * same function checkout uses — so a card can never advertise a fee the
 * checkout will not honour. If the RPC is missing (migration not applied yet)
 * or the customer's location is unknown, this returns an empty map and the cards
 * fall back to the shop's flat fee exactly as before.
 */
export function useShopDistances(shopIds: string[]) {
  const { lat, lng, known } = useCustomerLocation();
  // Sorting makes the key stable regardless of the order the list rendered in,
  // so scrolling or filtering does not trigger a refetch of identical data.
  const key = [...shopIds].sort().join(",");

  const { data } = useQuery({
    queryKey: ["shop-distances", lat, lng, key],
    enabled: known && shopIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Record<string, ShopDistance>> => {
      const { data: res, error } = await supabase.rpc("shop_distances", {
        p_lat: lat as number,
        p_lng: lng as number,
        p_shop_ids: shopIds,
      });
      if (error) return {};
      return (res ?? {}) as Record<string, ShopDistance>;
    },
  });

  return { distances: data ?? {}, locationKnown: known };
}
