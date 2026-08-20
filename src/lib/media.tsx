import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/** Lightweight inline blur placeholder shown instantly while media resolves. */
const BLUR_PLACEHOLDER =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 5"><filter id="b"><feGaussianBlur stdDeviation="1.4"/></filter><rect width="8" height="5" fill="#e2e8f0" filter="url(#b)"/><ellipse cx="5.5" cy="2" rx="3" ry="2" fill="#d1fae5" filter="url(#b)"/></svg>`,
  );

const cache = new Map<string, string>();

export const MEDIA_BUCKET = "ligo-media";
export const PROOF_BUCKET = "ligo-proofs";

export async function resolveMedia(path: string | null | undefined, bucket = MEDIA_BUCKET) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const key = `${bucket}:${path}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
  if (!data?.signedUrl) return null;
  cache.set(key, data.signedUrl);
  return data.signedUrl;
}

export function useMediaUrl(path: string | null | undefined, bucket = MEDIA_BUCKET) {
  const [url, setUrl] = useState<string | null>(() =>
    path?.startsWith("http") ? path : (cache.get(`${bucket}:${path}`) ?? null),
  );
  useEffect(() => {
    let active = true;
    resolveMedia(path, bucket).then((u) => active && setUrl(u));
    return () => {
      active = false;
    };
  }, [path, bucket]);
  return url;
}

export function StorageImage({
  path,
  alt,
  className,
  bucket = MEDIA_BUCKET,
  fallback,
  priority = false,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  bucket?: string;
  fallback?: React.ReactNode;
  /** Load eagerly with high fetch priority (above-the-fold visuals). */
  priority?: boolean;
}) {
  const url = useMediaUrl(path, bucket);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [url]);
  if (!url) {
    return (
      <div
        className={cn("flex items-center justify-center text-muted-foreground", className)}
        style={{
          backgroundImage: `url("${BLUR_PLACEHOLDER}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-label={alt}
      >
        {fallback ?? <span className="text-xs font-medium">{alt.slice(0, 18)}</span>}
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <img
        src={BLUR_PLACEHOLDER}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <img
        src={url}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "relative h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadImage(file: File, folder: string, bucket = MEDIA_BUCKET) {
  if (!ALLOWED.includes(file.type))
    throw new Error("Only JPG, PNG, WEBP or GIF images are allowed.");
  if (file.size > MAX_BYTES) throw new Error("Image must be smaller than 5 MB.");
  const ext =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}
