import type { TranslationKey } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  cta_label: string | null;
  placement: string;
  sort_order: number;
  is_active: boolean;
};

export const BANNER_PLACEMENTS = [
  { value: "home_top", labelKey: "bp_home_top" },
  { value: "home_hero", labelKey: "bp_home_hero" },
  { value: "home_middle", labelKey: "bp_home_middle" },
  { value: "home_bottom", labelKey: "bp_home_bottom" },
  { value: "shops", labelKey: "bp_shops" },
  { value: "offers", labelKey: "bp_offers" },
  { value: "categories", labelKey: "bp_categories" },
  { value: "special_moments", labelKey: "bp_special_moments" },
] as const satisfies readonly { value: string; labelKey: TranslationKey }[];

export const DEFAULT_CONTENT = {
  brand_name: "የኔ Go",
  brand_short_name: "የኔ Go",
  brand_tagline: "Fast. Local. Delivered.",
  logo_url: "",
  city: "Bishoftu",
  hero_badge: "",
  hero_title: "Everything you need, delivered in minutes",
  hero_subtitle:
    "Food, groceries, pharmacy and daily essentials from your favourite Bishoftu shops — with live tracking and Telebirr, CBE, BOA or cash payment.",
  hero_primary_cta: "Order now",
  hero_secondary_cta: "Become a rider",
  categories_title: "Categories",
  offers_title: "Today's offers",
  shops_title: "Popular shops",
  trending_title: "Trending items",
  how_title: "How የኔ Go works",
  how_step1_title: "1. Choose",
  how_step1_text: "Browse Bishoftu shops and add items to your cart.",
  how_step2_title: "2. Pay",
  how_step2_text: "Cash on delivery or upload your Telebirr/bank receipt.",
  how_step3_title: "3. Track",
  how_step3_text: "Follow your rider live until the order arrives.",
  footer_tagline:
    "የኔ Go delivers food, groceries and essentials across Bishoftu — fast, local and reliable.",
  contact_phone: "+251942578001",
  contact_email: "hello@yenego.et",
  contact_address: "Bishoftu, Oromia",
  developer_name: "Eyuel Temesgen",
  company_name: "EYVORA Technologies",
};

export type SiteContent = typeof DEFAULT_CONTENT;

export const CONTENT_FIELDS: {
  key: keyof SiteContent;
  labelKey: TranslationKey;
  long?: boolean;
}[] = [
  { key: "brand_name", labelKey: "cf_brand_name" },
  { key: "brand_short_name", labelKey: "cf_brand_short_name" },
  { key: "brand_tagline", labelKey: "cf_brand_tagline" },
  { key: "city", labelKey: "cf_city" },
  { key: "hero_badge", labelKey: "cf_hero_badge" },
  { key: "hero_title", labelKey: "cf_hero_title", long: true },
  { key: "hero_subtitle", labelKey: "cf_hero_subtitle", long: true },
  { key: "hero_primary_cta", labelKey: "cf_hero_primary_cta" },
  { key: "hero_secondary_cta", labelKey: "cf_hero_secondary_cta" },
  { key: "categories_title", labelKey: "cf_categories_title" },
  { key: "offers_title", labelKey: "cf_offers_title" },
  { key: "shops_title", labelKey: "cf_shops_title" },
  { key: "trending_title", labelKey: "cf_trending_title" },
  { key: "how_title", labelKey: "cf_how_title" },
  { key: "how_step1_title", labelKey: "cf_how_step1_title" },
  { key: "how_step1_text", labelKey: "cf_how_step1_text", long: true },
  { key: "how_step2_title", labelKey: "cf_how_step2_title" },
  { key: "how_step2_text", labelKey: "cf_how_step2_text", long: true },
  { key: "how_step3_title", labelKey: "cf_how_step3_title" },
  { key: "how_step3_text", labelKey: "cf_how_step3_text", long: true },
  { key: "footer_tagline", labelKey: "cf_footer_tagline", long: true },
  { key: "contact_phone", labelKey: "cf_contact_phone" },
  { key: "contact_email", labelKey: "cf_contact_email" },
  { key: "contact_address", labelKey: "cf_contact_address" },
  { key: "developer_name", labelKey: "cf_developer_name" },
  { key: "company_name", labelKey: "cf_company_name" },
];

export const siteContentQuery = {
  queryKey: ["site-content"],
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<SiteContent> => {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "site_content")
      .maybeSingle();
    return normalizeContent((data?.value ?? {}) as Partial<SiteContent>);
  },
  placeholderData: DEFAULT_CONTENT,
};

/**
 * The live `settings.site_content` row can still hold the previous brand name
 * until the rebrand migration is applied. Normalize those legacy values so the
 * customer-facing brand is always "የኔ Go".
 */
function normalizeContent(raw: Partial<SiteContent>): SiteContent {
  const merged = { ...DEFAULT_CONTENT, ...raw };
  const legacy = /ligo/i;
  if (!merged.brand_name || legacy.test(merged.brand_name)) {
    merged.brand_name = DEFAULT_CONTENT.brand_name;
  }
  if (!merged.brand_short_name || legacy.test(merged.brand_short_name)) {
    merged.brand_short_name = DEFAULT_CONTENT.brand_short_name;
  }
  merged.how_title = merged.how_title.replace(/Ligo/g, DEFAULT_CONTENT.brand_short_name);
  merged.footer_tagline = merged.footer_tagline.replace(/Ligo/g, DEFAULT_CONTENT.brand_short_name);
  merged.contact_email = merged.contact_email.replace("@ligo.et", "@yenego.et");
  return merged;
}

export const bannersQuery = (placement?: string) => ({
  queryKey: ["banners", placement ?? "all"],
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<Banner[]> => {
    let q = supabase.from("banners").select("*").eq("is_active", true).order("sort_order");
    if (placement) q = q.eq("placement", placement);
    const { data } = await q;
    const legacy = /^(ligo|ligo delivery)$/i;
    return ((data ?? []) as Banner[]).map((b) => ({
      ...b,
      title: legacy.test(b.title?.trim() ?? "") ? "የኔ Go" : b.title,
      subtitle: b.subtitle && legacy.test(b.subtitle.trim()) ? "የኔ Go" : b.subtitle,
    }));
  },
});
