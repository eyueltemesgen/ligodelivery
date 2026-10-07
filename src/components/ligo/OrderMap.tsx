import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "@/hooks/useLanguage";

// Leaflet's default icon resolves to marker-icon.png, which Vite does not emit,
// so `L.marker` with no icon renders a broken 404 image. A divIcon is inline
// HTML and needs no asset.
function makeIcon(color: string) {
  return L.divIcon({
    className: "ligo-marker",
    html: `<div style="background:${color};width:22px;height:22px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function OrderMap({
  lat,
  lng,
  riderLat,
  riderLng,
}: {
  lat: number;
  lng: number;
  riderLat?: number | null;
  riderLng?: number | null;
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMarker = useRef<L.Marker | null>(null);
  // Fit the view once, when the rider first appears. Re-fitting on every GPS
  // tick would yank the map around and make it impossible to follow.
  const fitted = useRef(false);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current).setView([lat, lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    L.circleMarker([lat, lng], { radius: 9, color: "#16a34a", fillOpacity: 0.9 })
      .addTo(map)
      .bindPopup(t("map_delivery_address"));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, t]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || riderLat == null || riderLng == null) return;
    if (!riderMarker.current) {
      riderMarker.current = L.marker([riderLat, riderLng], { icon: makeIcon("#2563eb") })
        .addTo(map)
        .bindPopup(t("map_your_rider"));
    } else {
      riderMarker.current.setLatLng([riderLat, riderLng]);
    }
    if (!fitted.current) {
      fitted.current = true;
      map.fitBounds(
        L.latLngBounds([
          [lat, lng],
          [riderLat, riderLng],
        ]).pad(0.3),
      );
    }
  }, [riderLat, riderLng, lat, lng, t]);

  return <div ref={ref} className="h-72 w-full rounded-xl border border-border" />;
}
