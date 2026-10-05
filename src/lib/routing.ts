/**
 * Client helper around the OSRM routing server function.
 *
 * Adds the straight-line fallback and de-duplicates concurrent requests so a
 * burst of location changes results in a single network call. The result is
 * always tagged with its `source` so the UI can label an estimate honestly
 * instead of presenting it as an exact road distance.
 */
import { routeBetweenFn } from "@/lib/routing.functions";

export type RouteSource = "road" | "straight_line";

export type RouteQuote = {
  distanceKm: number;
  /** Estimated driving duration in seconds. */
  durationS: number;
  /** [lng, lat] pairs for Leaflet. Empty for a straight-line fallback. */
  geometry: [number, number][];
  source: RouteSource;
};

/** Great-circle distance in km — the fallback when road routing is unavailable. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

const inFlight = new Map<string, Promise<RouteQuote>>();

function keyFor(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
  return [fromLat, fromLng, toLat, toLng].map((n) => n.toFixed(4)).join(",");
}

function straightLine(fromLat: number, fromLng: number, toLat: number, toLng: number): RouteQuote {
  return {
    distanceKm: Math.round(haversineKm(fromLat, fromLng, toLat, toLng) * 100) / 100,
    durationS: 0,
    geometry: [],
    source: "straight_line",
  };
}

/**
 * Resolve a driving route. Falls back to a straight-line estimate when routing
 * is unavailable, so the caller always gets a usable distance. Never throws.
 */
export async function getRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  shopId?: string | null,
): Promise<RouteQuote> {
  const key = keyFor(fromLat, fromLng, toLat, toLng);
  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = (async (): Promise<RouteQuote> => {
    try {
      const res = await routeBetweenFn({
        data: { shopId: shopId ?? null, fromLat, fromLng, toLat, toLng },
      });
      if (!res.ok || !Number.isFinite(res.route.distanceKm) || res.route.distanceKm <= 0) {
        return straightLine(fromLat, fromLng, toLat, toLng);
      }
      return { ...res.route, source: "road" };
    } catch {
      return straightLine(fromLat, fromLng, toLat, toLng);
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
}

/** Human readable driving time, e.g. 295 → "5 min", 5400 → "1 h 30 min". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}
