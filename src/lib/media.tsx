import type { TranslationKey } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/** Lightweight inline blur placeholder shown instantly while media resolves. */
const BLUR_PLACEHOLDER =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 5"><filter id="b"><feGaussianBlur stdDeviation="1.4"/></filter><rect width="8" height="5" fill="#e2e8f0" filter="url(#b)"/><ellipse cx="5.5" cy="2" rx="3" ry="2" fill="#d1fae5" filter="url(#b)"/></svg>`,
  );

/**
 * Bounded cache of resolved display URLs. Images resolve once per
 * (bucket, path, transform) triple and are reused for every later mount, so a
 * catalogue page signs each object at most once instead of once per card.
 * Signed URLs last 7 days; entries are evicted well before that.
 */
const CACHE_LIMIT = 600;
const cache = new Map<string, string>();

/** In-flight display-URL requests, so parallel cards share one network call. */
const inflight = new Map<string, Promise<string | null>>();

export const MEDIA_BUCKET = "ligo-media";
export const PROOF_BUCKET = "ligo-proofs";

/** Width buckets for responsive delivery; keep small so CDN caching stays hot. */
export const MEDIA_WIDTHS = [160, 320, 480, 768, 1080] as const;
export type MediaWidth = (typeof MEDIA_WIDTHS)[number] | number;

function cacheKey(bucket: string, path: string, width: number | undefined) {
  return width ? `${bucket}:${path}:w${width}` : `${bucket}:${path}`;
}

function remember(key: string, url: string) {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, url);
}

/** Small delay that lets one screenful of cards coalesce into a single batch. */
const BATCH_DELAY_MS = 25;

/** Paths waiting to be signed, grouped per bucket for the untransformed case. */
const pendingSign = new Map<string, Map<string, (url: string | null) => void>>();
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Sign every pending path for a group in one `createSignedUrls` call.
 *
 * `createSignedUrls` has no transform option, so it can only produce plain
 * object URLs. Sized images therefore sign individually (the transform must be
 * embedded in the signed token), while full-size avatars and proofs — which are
 * often rendered in lists — still collapse into a single request.
 */
function flushPending(group: string, bucket: string) {
  const timer = pendingTimers.get(group);
  if (timer) clearTimeout(timer);
  pendingTimers.delete(group);
  const waiters = pendingSign.get(group);
  if (!waiters || waiters.size === 0) return;
  pendingSign.delete(group);
  const paths = [...waiters.keys()];
  void supabase.storage
    .from(bucket)
    .createSignedUrls(paths, 60 * 60 * 24 * 7)
    .then(({ data, error }) => {
      if (error || !data) {
        for (const resolve of waiters.values()) resolve(null);
        return;
      }
      const byPath = new Map(data.map((d) => [d.path, d.signedUrl ?? d.signedURL ?? null]));
      for (const [path, resolve] of waiters) resolve(byPath.get(path) ?? null);
    })
    .catch(() => {
      for (const resolve of waiters.values()) resolve(null);
    });
}

function queueSign(bucket: string, group: string, path: string) {
  return new Promise<string | null>((resolve) => {
    let waiters = pendingSign.get(group);
    if (!waiters) {
      waiters = new Map();
      pendingSign.set(group, waiters);
    }
    waiters.set(path, resolve);
    if (waiters.size >= 50) {
      flushPending(group, bucket);
    } else if (!pendingTimers.has(group)) {
      pendingTimers.set(
        group,
        setTimeout(() => flushPending(group, bucket), BATCH_DELAY_MS),
      );
    }
  });
}

/**
 * Resolve a storage path to a displayable URL.
 *
 * When `width` is given the signed URL targets Supabase's image renderer, which
 * resizes and re-encodes to WebP — typically 35–70% fewer bytes than the
 * original upload. Non-image objects fall back to the plain signed URL.
 */
export async function resolveMedia(
  path: string | null | undefined,
  bucket = MEDIA_BUCKET,
  width?: MediaWidth,
) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const w = width ? Math.round(width) : undefined;
  const key = cacheKey(bucket, path, w);
  const hit = cache.get(key);
  if (hit) return hit;
  const pending = inflight.get(key);
  if (pending) return pending;

  const request = (async () => {
    const group = `${bucket}|plain`;
    // Batch signing cannot carry transforms, so sized images sign one at a time
    // (the transform must live inside the signed token).
    const signed = w
      ? (await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7, {
          transform: { width: w, quality: 68 },
        })).data?.signedUrl ?? null
      : await queueSign(bucket, group, path);
    if (!signed) return null;
    remember(key, signed);
    return signed;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, request);
  return request;
}

export function useMediaUrl(
  path: string | null | undefined,
  bucket = MEDIA_BUCKET,
  width?: MediaWidth,
) {
  const w = width ? Math.round(width) : undefined;
  const [url, setUrl] = useState<string | null>(() => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return cache.get(cacheKey(bucket, path, w)) ?? null;
  });
  useEffect(() => {
    let active = true;
    void resolveMedia(path, bucket, w).then((u) => active && setUrl(u));
    return () => {
      active = false;
    };
  }, [path, bucket, w]);
  return url;
}

export function StorageImage({
  path,
  alt,
  className,
  bucket = MEDIA_BUCKET,
  fallback,
  priority = false,
  width,
  height,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  bucket?: string;
  fallback?: React.ReactNode;
  /** Load eagerly with high fetch priority (above-the-fold visuals). */
  priority?: boolean;
  /**
   * Target device-pixel width. Passing it makes the signed URL use Supabase's
   * image renderer (resize + WebP) instead of the full original upload. Pass
   * roughly 1.5–2× the CSS size so it stays crisp on high-density phones.
   */
  width?: number;
  /** Intended CSS display height in px. Reserves layout space to avoid CLS. */
  height?: number;
}) {
  const target = width ? Math.min(Math.round(width), 1600) : undefined;
  const url = useMediaUrl(path, bucket, target);
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
        width={width}
        height={height}
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

const MEDIA_ERROR_KEYS: Record<string, TranslationKey> = {
  media_err_type: "media_err_type",
  media_err_size: "media_err_size",
};

/** i18n key for a validation error thrown by uploadImage, or null for other errors. */
export function mediaErrorKey(err: unknown): TranslationKey | null {
  if (!(err instanceof Error)) return null;
  return MEDIA_ERROR_KEYS[err.message] ?? null;
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadImage(file: File, folder: string, bucket = MEDIA_BUCKET) {
  if (!ALLOWED.includes(file.type)) throw new Error("media_err_type");
  if (file.size > MAX_BYTES) throw new Error("media_err_size");
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
