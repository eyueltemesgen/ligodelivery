import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMarker = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current).setView([lat, lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    L.circleMarker([lat, lng], { radius: 9, color: "#16a34a", fillOpacity: 0.9 })
      .addTo(map)
      .bindPopup("Delivery address");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || riderLat == null || riderLng == null) return;
    if (!riderMarker.current) {
      riderMarker.current = L.marker([riderLat, riderLng]).addTo(map).bindPopup("Your rider");
    } else {
      riderMarker.current.setLatLng([riderLat, riderLng]);
    }
    map.fitBounds(L.latLngBounds([[lat, lng], [riderLat, riderLng]]).pad(0.3));
  }, [riderLat, riderLng, lat, lng]);

  return <div ref={ref} className="h-72 w-full rounded-xl border border-border" />;
}
