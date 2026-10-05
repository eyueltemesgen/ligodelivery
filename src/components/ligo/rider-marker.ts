import L from "leaflet";
import { MEDIA_BUCKET, type MediaWidth } from "@/lib/media";

// Leaflet's default icon points at marker-icon.png, which Vite does not emit,
// so every marker is drawn as an inline divIcon. The rider marker optionally
// shows the rider's profile photo, falling back to a coloured pin when there is
// no avatar or it cannot be resolved.
export function makePinIcon(color: string, size = 22): L.DivIcon {
  return L.divIcon({
    className: "ligo-marker",
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makeAvatarIcon(url: string, size = 34): L.DivIcon {
  return L.divIcon({
    className: "ligo-marker ligo-marker-avatar",
    html: `<img src="${url}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45);background:#fff;" />`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const signedCache = new Map<string, Promise<string | null>>();

/**
 * Resolve a storage path to a signed URL for a Leaflet marker. Leaflet builds
 * the marker outside React, so this cannot use the `useMediaUrl` hook. Cached
 * per path and resolves to null when the image is unavailable, in which case
 * callers fall back to the coloured pin.
 */
export function resolveMarkerImage(
  path: string | null | undefined,
  width: MediaWidth = 96,
): Promise<string | null> {
  if (!path) return Promise.resolve(null);
  if (path.startsWith("http")) return Promise.resolve(path);
  const key = `${MEDIA_BUCKET}/${path}/${width}`;
  const cached = signedCache.get(key);
  if (cached) return cached;
  const promise = (async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.storage
        .from(MEDIA_BUCKET)
        .createSignedUrl(path, 60 * 60, { transform: { width: Math.round(width) } });
      return data?.signedUrl ?? null;
    } catch {
      return null;
    }
  })();
  signedCache.set(key, promise);
  return promise;
}

export function riderIcon(
  color: string,
  avatarUrl: string | null | undefined,
): Promise<L.DivIcon> {
  if (!avatarUrl) return Promise.resolve(makePinIcon(color));
  return resolveMarkerImage(avatarUrl).then((url) =>
    url ? makeAvatarIcon(url) : makePinIcon(color),
  );
}
