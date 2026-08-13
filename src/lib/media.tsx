import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  bucket?: string;
  fallback?: React.ReactNode;
}) {
  const url = useMediaUrl(path, bucket);
  if (!url) {
    return (
      <div
        className={cn("flex items-center justify-center bg-surface text-muted-foreground", className)}
        aria-label={alt}
      >
        {fallback ?? <span className="text-xs font-medium">{alt.slice(0, 18)}</span>}
      </div>
    );
  }
  return <img src={url} alt={alt} loading="lazy" className={className} />;
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadImage(file: File, folder: string, bucket = MEDIA_BUCKET) {
  if (!ALLOWED.includes(file.type)) throw new Error("Only JPG, PNG, WEBP or GIF images are allowed.");
  if (file.size > MAX_BYTES) throw new Error("Image must be smaller than 5 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}