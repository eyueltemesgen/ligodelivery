/**
 * Road routing (OSRM) behind an authenticated server function.
 *
 * OSRM (OpenStreetMap's routing engine, running the OSM road network) turns the
 * shop → customer coordinates into a real driving distance, duration and route
 * geometry. The browser never talks to the routing host directly, so the
 * endpoint stays configurable and the request cannot be tampered with from the
 * client.
 *
 * When a shop id is supplied the origin coordinates are looked up server-side,
 * so a customer cannot send a fake "nearby" shop position to shrink their
 * delivery fee. The returned road distance is still re-validated against the
 * straight-line distance inside `calculate_delivery_fee`.
 *
 * Resilience: any failure (timeout, non-200, malformed body, no route) resolves
 * to `{ ok: false }` rather than throwing. Callers then fall back to the
 * existing straight-line distance, and the UI labels it as an estimate — a
 * routing outage must never make checkout unusable, and a straight-line
 * distance is never presented as an exact road distance.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

/** Public OSRM demo server; override with OSRM_URL for a self-hosted instance. */
const DEFAULT_OSRM_URL = "https://router.project-osrm.org";
const REQUEST_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

/** Coordinates rounded to ~11 m so nearby taps reuse one cached route. */
const COORD_PRECISION = 4;

export type RouteResult = {
  /** Road distance in kilometres. */
  distanceKm: number;
  /** Estimated driving duration in seconds. */
  durationS: number;
  /** GeoJSON LineString [lng, lat] pairs, for drawing on Leaflet. */
  geometry: [number, number][];
};

export type RouteResponse = { ok: true; route: RouteResult } | { ok: false; reason: string };

type CacheEntry = { value: RouteResult; expires: number };
const cache = new Map<string, CacheEntry>();

function isFiniteCoord(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function cacheKey(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
  return [fromLat, fromLng, toLat, toLng].map((n) => n.toFixed(COORD_PRECISION)).join(",");
}

function readCache(key: string): RouteResult | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key: string, value: RouteResult): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // Drop the oldest entry; Map preserves insertion order.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

/**
 * Fetch a driving route between two points. Returns null on any failure so the
 * caller can fall back to a straight-line estimate.
 */
async function fetchRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<RouteResult | null> {
  if (!isFiniteCoord(fromLat, fromLng) || !isFiniteCoord(toLat, toLng)) return null;

  const key = cacheKey(fromLat, fromLng, toLat, toLng);
  const cached = readCache(key);
  if (cached) return cached;

  const base = (process.env["OSRM_URL"] ?? DEFAULT_OSRM_URL).replace(/\/+$/, "");
  const coords = `${fromLng},${fromLat};${toLng},${toLat}`;
  const url = `${base}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      code?: string;
      routes?: {
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: [number, number][] };
      }[];
    };
    const route = body.routes?.[0];
    if (body.code !== "Ok" || !route || typeof route.distance !== "number") return null;

    const geometry = route.geometry?.coordinates;
    const result: RouteResult = {
      distanceKm: Math.round((route.distance / 1000) * 100) / 100,
      durationS: Math.round(route.duration ?? 0),
      geometry: Array.isArray(geometry) ? geometry : [],
    };
    writeCache(key, result);
    return result;
  } catch {
    // Timeout, DNS/network error, or invalid JSON — fall back to straight-line.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type RouteInput = {
  /** When present, the origin is the shop's stored coordinates. */
  shopId?: string | null;
  fromLat?: number | null;
  fromLng?: number | null;
  toLat: number;
  toLng: number;
};

/**
 * Driving route to a delivery point. When `shopId` is given the origin is the
 * shop's stored coordinates (never a client-supplied shop position). Returns
 * `{ ok: false }` when routing is unavailable; never throws.
 */
export const routeBetweenFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: RouteInput) => input)
  .handler(async ({ data, context }): Promise<RouteResponse> => {
    const ctx = context as { supabase: SupabaseClient<Database> };
    if (!isFiniteCoord(data.toLat, data.toLng)) return { ok: false, reason: "invalid_destination" };

    let fromLat = data.fromLat ?? null;
    let fromLng = data.fromLng ?? null;

    if (data.shopId) {
      const { data: shop, error } = await ctx.supabase
        .from("shops")
        .select("lat,lng")
        .eq("id", data.shopId)
        .maybeSingle();
      if (error || !shop || shop.lat == null || shop.lng == null) {
        return { ok: false, reason: "shop_location_unavailable" };
      }
      fromLat = shop.lat;
      fromLng = shop.lng;
    }

    if (!isFiniteCoord(fromLat, fromLng)) return { ok: false, reason: "invalid_origin" };

    const route = await fetchRoute(fromLat as number, fromLng as number, data.toLat, data.toLng);
    return route ? { ok: true, route } : { ok: false, reason: "routing_unavailable" };
  });
