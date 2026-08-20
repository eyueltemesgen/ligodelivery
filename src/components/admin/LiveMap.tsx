import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type LiveMapRider = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  state: "idle" | "delivering" | "offline";
};

export type LiveMapShop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  activeOrders: number;
};

export type LiveMapDestination = {
  orderId: string;
  code: string;
  lat: number;
  lng: number;
  riderId: string | null;
};

const BISHOFTU: [number, number] = [8.7522, 38.9969];

const COLORS = {
  idle: "#059669",
  delivering: "#f59e0b",
  offline: "#94a3b8",
  shop: "#0ea5e9",
  dest: "#dc2626",
};

function divIcon(color: string, size = 22): L.DivIcon {
  return L.divIcon({
    className: "ligo-marker",
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function LiveMap({
  riders,
  shops,
  destinations,
  onSelectRider,
}: {
  riders: LiveMapRider[];
  shops: LiveMapShop[];
  destinations: LiveMapDestination[];
  onSelectRider: (riderId: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMarkers = useRef(new Map<string, L.Marker>());
  const shopMarkers = useRef(new Map<string, L.Marker>());
  const destMarkers = useRef(new Map<string, L.Marker>());
  const lines = useRef(new Map<string, L.Polyline>());
  const selectRef = useRef(onSelectRider);
  selectRef.current = onSelectRider;

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current).setView(BISHOFTU, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Riders
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    for (const r of riders) {
      seen.add(r.id);
      const existing = riderMarkers.current.get(r.id);
      if (existing) {
        existing.setLatLng([r.lat, r.lng]);
        existing.setIcon(divIcon(COLORS[r.state]));
      } else {
        const marker = L.marker([r.lat, r.lng], { icon: divIcon(COLORS[r.state]) })
          .addTo(map)
          .bindTooltip(r.name, { direction: "top" });
        marker.on("click", () => selectRef.current(r.id));
        riderMarkers.current.set(r.id, marker);
      }
    }
    for (const [id, m] of riderMarkers.current) {
      if (!seen.has(id)) {
        m.remove();
        riderMarkers.current.delete(id);
      }
    }
  }, [riders]);

  // Shops
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    for (const s of shops) {
      seen.add(s.id);
      if (!shopMarkers.current.has(s.id)) {
        shopMarkers.current.set(
          s.id,
          L.marker([s.lat, s.lng], { icon: divIcon(COLORS.shop, 18) })
            .addTo(map)
            .bindTooltip(`${s.name} (${s.activeOrders} active)`, { direction: "top" }),
        );
      }
    }
    for (const [id, m] of shopMarkers.current) {
      if (!seen.has(id)) {
        m.remove();
        shopMarkers.current.delete(id);
      }
    }
  }, [shops]);

  // Destinations + paths to their assigned rider
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    for (const d of destinations) {
      seen.add(d.orderId);
      if (!destMarkers.current.has(d.orderId)) {
        destMarkers.current.set(
          d.orderId,
          L.marker([d.lat, d.lng], { icon: divIcon(COLORS.dest, 16) })
            .addTo(map)
            .bindTooltip(`Order ${d.code}`, { direction: "top" }),
        );
      }
      const rider = d.riderId ? riders.find((r) => r.id === d.riderId) : null;
      if (rider) {
        const existing = lines.current.get(d.orderId);
        const pts: [number, number][] = [
          [rider.lat, rider.lng],
          [d.lat, d.lng],
        ];
        if (existing) existing.setLatLngs(pts);
        else
          lines.current.set(
            d.orderId,
            L.polyline(pts, { color: "#f59e0b", weight: 2, dashArray: "6 6" }).addTo(map),
          );
      } else {
        lines.current.get(d.orderId)?.remove();
        lines.current.delete(d.orderId);
      }
    }
    for (const [id, m] of destMarkers.current) {
      if (!seen.has(id)) {
        m.remove();
        destMarkers.current.delete(id);
      }
    }
    for (const [id, l] of lines.current) {
      if (!seen.has(id)) {
        l.remove();
        lines.current.delete(id);
      }
    }
  }, [destinations, riders]);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" />
      <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-card">
        <p className="font-semibold">Legend</p>
        <p className="mt-1 flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: COLORS.idle }}
          />{" "}
          Rider online
          <span
            className="ml-2 inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: COLORS.delivering }}
          />{" "}
          On delivery
          <span
            className="ml-2 inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: COLORS.offline }}
          />{" "}
          Offline
        </p>
        <p className="mt-0.5 flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: COLORS.shop }}
          />{" "}
          Merchant
          <span
            className="ml-2 inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: COLORS.dest }}
          />{" "}
          Destination
        </p>
      </div>
    </div>
  );
}
