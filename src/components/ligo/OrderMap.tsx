import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "@/hooks/useLanguage";
import { getRoute } from "@/lib/routing";
import { makePinIcon, riderIcon } from "@/components/ligo/rider-marker";

export default function OrderMap({
  lat,
  lng,
  riderLat,
  riderLng,
  riderAvatar,
}: {
  lat: number;
  lng: number;
  riderLat?: number | null;
  riderLng?: number | null;
  riderAvatar?: string | null;
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMarker = useRef<L.Marker | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);

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
    let cancelled = false;
    void riderIcon("#2563eb", riderAvatar).then((icon) => {
      if (cancelled) return;
      if (!riderMarker.current) {
        riderMarker.current = L.marker([riderLat, riderLng], { icon })
          .addTo(map)
          .bindPopup(t("map_your_rider"));
      } else {
        riderMarker.current.setLatLng([riderLat, riderLng]);
        riderMarker.current.setIcon(icon);
      }
    });
    map.fitBounds(
      L.latLngBounds([
        [lat, lng],
        [riderLat, riderLng],
      ]).pad(0.3),
    );
    return () => {
      cancelled = true;
    };
  }, [riderLat, riderLng, lat, lng, t, riderAvatar]);

  // Draw the rider's actual driving route to the delivery address. The rider's
  // position updates in real time, so the request is debounced and de-duplicated
  // by `getRoute`; if routing is unavailable we draw nothing rather than
  // pretending a straight line is the road.
  useEffect(() => {
    if (riderLat == null || riderLng == null) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void getRoute(riderLat, riderLng, lat, lng).then((route) => {
        const map = mapRef.current;
        if (cancelled || !map) return;
        routeLine.current?.remove();
        routeLine.current = null;
        if (route.source !== "road" || route.geometry.length < 2) return;
        routeLine.current = L.polyline(
          route.geometry.map(([lngPt, latPt]) => [latPt, lngPt] as [number, number]),
          { color: "#2563eb", weight: 4, opacity: 0.75 },
        ).addTo(map);
      });
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [riderLat, riderLng, lat, lng]);

  return <div ref={ref} className="h-72 w-full rounded-xl border border-border" />;
}
