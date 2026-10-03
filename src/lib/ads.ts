import { supabase } from "@/integrations/supabase/client";

export type Ad = {
  id: string;
  ad_type: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_label: string | null;
  destination_type: string;
  destination_url: string | null;
  placement: string;
  priority: number;
  target_category_id: string | null;
  target_shop_id: string | null;
  target_device: string;
  target_location: string | null;
};

export const AD_TYPES = [
  { value: "banner", label: "Homepage banner" },
  { value: "sponsored_shop", label: "Sponsored shop" },
  { value: "sponsored_product", label: "Sponsored product" },
  { value: "promo_card", label: "Promotional card" },
] as const;

export const AD_STATUSES = ["draft", "active", "paused", "archived"] as const;

/** Only the live ads for one placement — RLS already hides paused/expired/scheduled ads. */
export const adsQuery = (placement: string) => ({
  queryKey: ["ads", placement],
  staleTime: 60_000,
  queryFn: async (): Promise<Ad[]> => {
    const { data, error } = await supabase
      .from("ads")
      .select(
        "id,ad_type,title,subtitle,image_url,cta_label,destination_type,destination_url,placement,priority,target_category_id,target_shop_id,target_device,target_location",
      )
      .eq("placement", placement)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) {
      console.warn("ads unavailable", error);
      return [];
    }
    return (data ?? []) as Ad[];
  },
});

export function currentDevice(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  return window.innerWidth < 768 ? "mobile" : "desktop";
}

export function trackAd(adId: string, kind: "impression" | "click") {
  const device = currentDevice();
  if (kind === "impression") {
    const key = `ad-imp-${adId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
  }
  void supabase.rpc("track_ad_event", { _ad_id: adId, _kind: kind, _device: device });
}

export const ctr = (impressions: number, clicks: number) =>
  impressions > 0 ? (clicks / impressions) * 100 : 0;
