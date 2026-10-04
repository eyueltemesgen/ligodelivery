import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

/** Bishoftu city centre — the marketplace's home market. */
export const BISHOFTU_CENTER: [number, number] = [8.7522, 38.9784];

/**
 * Leaflet/OpenStreetMap delivery location picker. The customer taps the map (or
 * uses device GPS) and the component reports the latitude/longitude to the
 * parent. Reuses the Leaflet setup already used by OrderMap.
 */
export function LocationPicker({
  lat,
  lng,
  onChange,
  height = 260,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const start: [number, number] = lat != null && lng != null ? [lat, lng] : BISHOFTU_CENTER;
    const map = L.map(ref.current).setView(start, lat != null ? 15 : 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    if (lat != null && lng != null) {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current!.getLatLng();
        onChangeRef.current(p.lat, p.lng);
      });
    }
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: la, lng: lo } = e.latlng;
      if (markerRef.current) markerRef.current.setLatLng([la, lo]);
      else {
        markerRef.current = L.marker([la, lo], { draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const p = markerRef.current!.getLatLng();
          onChangeRef.current(p.lat, p.lng);
        });
      }
      onChangeRef.current(la, lo);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        const map = mapRef.current;
        if (map) {
          map.setView([la, lo], 16);
          if (markerRef.current) markerRef.current.setLatLng([la, lo]);
          else markerRef.current = L.marker([la, lo], { draggable: true }).addTo(map);
        }
        onChangeRef.current(la, lo);
      },
      () => {
        /* permission denied / unavailable — the customer taps the map instead */
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="space-y-2">
      <div ref={ref} className="w-full rounded-xl border border-border" style={{ height }} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {lat != null && lng != null ? t("loc_picked") : t("loc_tap_hint")}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={useMyLocation}>
          <Crosshair className="mr-1.5 h-3.5 w-3.5" />
          {t("loc_use_my_location")}
        </Button>
      </div>
    </div>
  );
}
