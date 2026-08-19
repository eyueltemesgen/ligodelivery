import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type RiderTrackingProps = {
  shopLat?: number | null;
  shopLng?: number | null;
  riderLat?: number | null;
  riderLng?: number | null;
  destLat: number;
  destLng: number;
  status?: string;
};

const BISHOFTU: [number, number] = [8.7522, 38.9969];

function makeIcon(color: string) {
  return L.divIcon({
    className: "ligo-marker",
    html: `<div style="background:${color};width:22px;height:22px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function RiderTrackingMap({
  shopLat,
  shopLng,
  riderLat,
  riderLng,
  destLat,
  destLng,
}: RiderTrackingProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMarker = useRef<L.Marker | null>(null);
  const shopMarker = useRef<L.Marker | null>(null);
  const destMarker = useRef<L.Marker | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current).setView([destLat, destLng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [destLat, destLng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!destMarker.current) {
      destMarker.current = L.marker([destLat, destLng], { icon: makeIcon("#16a34a") })
        .addTo(map)
        .bindPopup("Delivery address");
    } else {
      destMarker.current.setLatLng([destLat, destLng]);
    }
  }, [destLat, destLng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || shopLat == null || shopLng == null) return;
    if (!shopMarker.current) {
      shopMarker.current = L.marker([shopLat, shopLng], { icon: makeIcon("#f59e0b") })
        .addTo(map)
        .bindPopup("Pickup (shop)");
    } else {
      shopMarker.current.setLatLng([shopLat, shopLng]);
    }
  }, [shopLat, shopLng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || riderLat == null || riderLng == null) return;
    if (!riderMarker.current) {
      riderMarker.current = L.marker([riderLat, riderLng], { icon: makeIcon("#2563eb") })
        .addTo(map)
        .bindPopup("Your rider");
    } else {
      riderMarker.current.setLatLng([riderLat, riderLng]);
    }
  }, [riderLat, riderLng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routeLine.current) {
      routeLine.current.remove();
      routeLine.current = null;
    }
    const points: [number, number][] = [];
    if (riderLat != null && riderLng != null) points.push([riderLat, riderLng]);
    if (shopLat != null && shopLng != null) points.push([shopLat, shopLng]);
    points.push([destLat, destLng]);
    if (points.length >= 2) {
      routeLine.current = L.polyline(points, {
        color: "#2563eb",
        weight: 3,
        opacity: 0.6,
        dashArray: "8 8",
      }).addTo(map);
    }
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points).pad(0.3));
    } else {
      map.setView(points[0] ?? BISHOFTU, 14);
    }
  }, [shopLat, shopLng, riderLat, riderLng, destLat, destLng]);

  return <div ref={ref} className="h-80 w-full rounded-xl border border-border" />;
}
