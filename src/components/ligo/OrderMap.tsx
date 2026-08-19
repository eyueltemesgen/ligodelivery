import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bike, MapPin } from "lucide-react";

// Great-circle distance in km between two lat/lng points.
function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.asin(Math.sqrt(h));
}

// Marker rendered from a lucide icon so it matches the app's visual language.
function iconFor(node: string, color: string) {
  return L.divIcon({
    className: "ligo-marker",
    html: `<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:9999px;background:${color};color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.25)">${node}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

const BIKE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`;
const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`;

export default function OrderMap({
  lat,
  lng,
  riderLat,
  riderLng,
  etaMinutesPerKm = 4,
}: {
  lat: number;
  lng: number;
  riderLat?: number | null;
  riderLng?: number | null;
  etaMinutesPerKm?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMarker = useRef<L.Marker | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);

  const hasRider = riderLat != null && riderLng != null;
  const distanceKm = useMemo(
    () => (hasRider ? haversineKm([riderLat as number, riderLng as number], [lat, lng]) : null),
    [hasRider, riderLat, riderLng, lat, lng],
  );
  const etaMin = distanceKm != null ? Math.max(1, Math.round(distanceKm * etaMinutesPerKm)) : null;

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { zoomControl: true }).setView([lat, lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    L.marker([lat, lng], { icon: iconFor(PIN_SVG, "hsl(142 71% 40%)") }).addTo(map).bindPopup("Delivery address");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      riderMarker.current = null;
      routeLine.current = null;
    };
  }, [lat, lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || riderLat == null || riderLng == null) return;

    // Move (or create) the rider marker to the latest position.
    if (!riderMarker.current) {
      riderMarker.current = L.marker([riderLat, riderLng], { icon: iconFor(BIKE_SVG, "hsl(24 95% 48%)") })
        .addTo(map)
        .bindPopup("Your rider");
    } else {
      riderMarker.current.setLatLng([riderLat, riderLng]);
    }

    // Draw the connecting route line.
    const points: [number, number][] = [
      [riderLat, riderLng],
      [lat, lng],
    ];
    if (!routeLine.current) {
      routeLine.current = L.polyline(points, { color: "hsl(24 95% 48%)", weight: 3, opacity: 0.7, dashArray: "6 8" }).addTo(map);
    } else {
      routeLine.current.setLatLngs(points);
    }

    map.fitBounds(L.latLngBounds(points).pad(0.35));
  }, [riderLat, riderLng, lat, lng]);

  return (
    <div className="relative">
      <div ref={ref} className="h-72 w-full rounded-xl border border-border" />
      {hasRider && (
        <div className="pointer-events-none absolute left-3 top-3 z-[400] flex items-center gap-3 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-card backdrop-blur">
          <span className="flex items-center gap-1 font-semibold text-foreground">
            <Bike className="h-3.5 w-3.5 text-primary" />
            {distanceKm?.toFixed(1)} km away
          </span>
          <span className="h-3 w-px bg-border" />
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            ~{etaMin} min
          </span>
        </div>
      )}
    </div>
  );
}
