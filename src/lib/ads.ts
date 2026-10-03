import { supabase } from "@/integrations/supabase/client";
import { isMissingRpc, isMissingTable } from "@/lib/supa-error";

/**
 * Advertising data access.
 *
 * Ads are served live from the `ads` table: an admin adds a creative, picks a
 * placement key, publishes it, and it appears wherever that placement renders.
 * Eligibility (schedule, campaign window, pause/archive, targeting) is resolved
 * server-side by the `eligible_ads` RPC so the client never decides what runs.
 * Impressions/clicks go through the hardened `record_ad_*` RPCs (deduplicated to
 * one per ad/session/placement/hour) and CTR is computed by `admin_ad_analytics`.
 */

export type AdPlacementKey =
  | "HOME_TOP"
  | "HOME_MIDDLE"
  | "HOME_BOTTOM"
  | "SHOP_TOP"
  | "PRODUCT_RELATED"
  | "CATEGORY_TOP"
  | "SEARCH_TOP"
  | "SPECIAL_MOMENTS_TOP";

export type AdType =
  "homepage_banner" | "sponsored_shop" | "sponsored_product" | "promotional_card";

export type AdLinkType = "shop" | "product" | "service" | "special_moments" | "external" | "none";

export type AdStatus = "draft" | "active" | "paused" | "archived";

export type Ad = {
  id: string;
  advertiser_id: string | null;
  campaign_id: string | null;
  placement_key: string;
  name: string;
  ad_type: AdType;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  image_url: string | null;
  link_type: AdLinkType;
  link_value: string | null;
  target_page: string | null;
  target_category_id: string | null;
  target_shop_id: string | null;
  target_product_id: string | null;
  target_service_category_slug: string | null;
  target_location: string | null;
  target_device: "all" | "mobile" | "desktop";
  priority: number;
  weight: number;
  status: AdStatus;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  sort_order: number;
  created_at: string;
};

export type Advertiser = {
  id: string;
  shop_id: string | null;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

export type AdCampaign = {
  id: string;
  advertiser_id: string | null;
  name: string;
  objective: string | null;
  status: AdStatus;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  notes: string | null;
  created_at: string;
};

export type AdPlacement = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  layout: "carousel" | "grid" | "single";
  max_ads: number;
  aspect_ratio: string;
  is_active: boolean;
  sort_order: number;
};

export type AdPackage = {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  price: number;
  placements: string[];
  is_active: boolean;
  sort_order: number;
};

export type AdAnalyticsRow = {
  ad_id: string;
  ad_name: string;
  ad_type: string;
  placement_key: string;
  advertiser_name: string | null;
  campaign_name: string | null;
  status: string;
  impressions: number;
  clicks: number;
  ctr: number;
};

export const AD_TYPE_LABEL: Record<AdType, string> = {
  homepage_banner: "Homepage banner",
  sponsored_shop: "Sponsored shop",
  sponsored_product: "Sponsored product",
  promotional_card: "Promotional card",
};

export const AD_STATUS_LABEL: Record<AdStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

export const AD_LINK_LABEL: Record<AdLinkType, string> = {
  shop: "Shop",
  product: "Product",
  service: "Service",
  special_moments: "Special Moments",
  external: "External URL",
  none: "No link",
};

export const AD_STATUS_TONE: Record<AdStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary-soft text-accent-foreground",
  paused: "bg-warning/15 text-warning-foreground",
  archived: "bg-secondary text-muted-foreground",
};

/** Where each placement renders in the customer app. */
export const AD_PLACEMENT_LABEL: Record<string, string> = {
  HOME_TOP: "Home — top",
  HOME_MIDDLE: "Home — middle",
  HOME_BOTTOM: "Home — bottom",
  SHOP_TOP: "Shop — top",
  PRODUCT_RELATED: "Product — related",
  CATEGORY_TOP: "Category — top",
  SEARCH_TOP: "Search — top",
  SPECIAL_MOMENTS_TOP: "Special Moments — top",
};

/** Resolve an ad's destination. Internal links stay in-app via the router. */
export function adHref(ad: Pick<Ad, "link_type" | "link_value" | "target_shop_id">): string | null {
  const v = ad.link_value?.trim();
  switch (ad.link_type) {
    case "shop":
      return v ? `/shops/${v}` : null;
    // A product has no standalone route; it opens in the shop menu modal.
    case "product":
      return v && ad.target_shop_id ? `/shops/${ad.target_shop_id}?product=${v}` : null;
    case "service":
      return v ? `/special-moments/${v}` : null;
    case "special_moments":
      return "/special-moments";
    case "external":
      return v && /^https?:\/\//i.test(v) ? v : null;
    default:
      return null;
  }
}

export const isExternalAd = (ad: Pick<Ad, "link_type" | "link_value">) =>
  ad.link_type === "external" && !!ad.link_value && /^https?:\/\//i.test(ad.link_value);

const soft = async <T>(
  q: PromiseLike<{ data: unknown; error: unknown }>,
  fallback: T,
  isAbsent: (err: unknown) => boolean = isMissingTable,
): Promise<T> => {
  try {
    const res = await q;
    if (res.error) {
      if (isAbsent(res.error)) return fallback;
      throw res.error;
    }
    return (res.data ?? fallback) as T;
  } catch (err) {
    if (isAbsent(err)) return fallback;
    throw err;
  }
};

export type AdTargeting = {
  page?: string | null;
  categoryId?: string | null;
  shopId?: string | null;
  productId?: string | null;
  serviceType?: string | null;
  location?: string | null;
  device?: "mobile" | "desktop" | null;
  limit?: number | null;
};

/** Live ads for one placement, filtered and capped server-side. */
export const eligibleAdsQuery = (
  placement: AdPlacementKey | string,
  targeting: AdTargeting = {},
) => ({
  queryKey: ["ads", placement, targeting],
  queryFn: async () =>
    soft<Ad[]>(
      supabase.rpc("eligible_ads", {
        p_placement: placement,
        p_limit: targeting.limit ?? undefined,
        p_page: targeting.page ?? undefined,
        p_category: targeting.categoryId ?? undefined,
        p_shop: targeting.shopId ?? undefined,
        p_product: targeting.productId ?? undefined,
        p_service_type: targeting.serviceType ?? undefined,
        p_location: targeting.location ?? undefined,
        p_device: targeting.device ?? undefined,
      }),
      [],
      isMissingRpc,
    ),
  staleTime: 60_000,
});

/** Fire-and-forget impression. Deduplicated server-side; never blocks the UI. */
export function recordAdImpression(adId: string, placement: string, session: string, path: string) {
  void supabase
    .rpc("record_ad_impression", {
      p_ad_id: adId,
      p_placement: placement,
      p_session: session,
      p_device: typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop",
      p_path: path,
    })
    .then(
      () => undefined,
      () => undefined,
    );
}

/** Fire-and-forget click, awaited nowhere. */
export function recordAdClick(adId: string, placement: string, session: string, path: string) {
  void supabase
    .rpc("record_ad_click", {
      p_ad_id: adId,
      p_placement: placement,
      p_session: session,
      p_device: typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop",
      p_path: path,
    })
    .then(
      () => undefined,
      () => undefined,
    );
}

// --- Admin -------------------------------------------------------------------

export const adminAdvertisersQuery = {
  queryKey: ["admin-advertisers"],
  queryFn: async () =>
    soft<Advertiser[]>(
      supabase.from("advertisers").select("*").order("created_at", { ascending: false }),
      [],
    ),
};

export const adminAdCampaignsQuery = {
  queryKey: ["admin-ad-campaigns"],
  queryFn: async () =>
    soft<AdCampaign[]>(
      supabase.from("ad_campaigns").select("*").order("created_at", { ascending: false }),
      [],
    ),
};

export const adminAdsQuery = {
  queryKey: ["admin-ads"],
  queryFn: async () =>
    soft<Ad[]>(supabase.from("ads").select("*").order("created_at", { ascending: false }), []),
};

export const adminAdPlacementsQuery = {
  queryKey: ["admin-ad-placements"],
  queryFn: async () =>
    soft<AdPlacement[]>(supabase.from("ad_placements").select("*").order("sort_order"), []),
};

/** Public placement config (layout, aspect ratio) for rendering slots. */
export const adPlacementsQuery = {
  queryKey: ["ad-placements"],
  queryFn: async () =>
    soft<AdPlacement[]>(
      supabase.from("ad_placements").select("*").eq("is_active", true).order("sort_order"),
      [],
    ),
};

export const adminAdPackagesQuery = {
  queryKey: ["admin-ad-packages"],
  queryFn: async () =>
    soft<AdPackage[]>(supabase.from("ad_packages").select("*").order("sort_order"), []),
};

export const adminAdAnalyticsQuery = (from?: string, to?: string) => ({
  queryKey: ["admin-ad-analytics", from ?? "default", to ?? "default"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_ad_analytics", {
      p_from: from ?? undefined,
      p_to: to ?? undefined,
    });
    if (error) {
      if (isMissingTable(error) || isMissingRpc(error)) return [] as AdAnalyticsRow[];
      throw error;
    }
    return (data ?? []) as AdAnalyticsRow[];
  },
});

export const adCountsByPlacement = (ads: Ad[]) => {
  const counts: Record<string, number> = {};
  for (const a of ads) counts[a.placement_key] = (counts[a.placement_key] ?? 0) + 1;
  return counts;
};
