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
  { value: "home_top", label: "Home — top (above hero)" },
  { value: "home_hero", label: "Home — hero image" },
  { value: "home_middle", label: "Home — middle (after categories)" },
  { value: "home_bottom", label: "Home — bottom" },
  { value: "shops", label: "Shops page" },
  { value: "offers", label: "Offers page" },
  { value: "categories", label: "Categories page" },
] as const;

export const DEFAULT_CONTENT = {
  brand_name: "የኔ Go",
  brand_short_name: "የኔ Go",
  brand_tagline: "Fast. Local. Delivered.",
  logo_url: "",
  city: "Bishoftu",
  hero_badge: "Delivering across Bishoftu",
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

export const CONTENT_FIELDS: { key: keyof SiteContent; label: string; long?: boolean }[] = [
  { key: "brand_name", label: "Brand name" },
  { key: "brand_short_name", label: "Short name (header logo)" },
  { key: "brand_tagline", label: "Logo tagline" },
  { key: "city", label: "City" },
  { key: "hero_badge", label: "Hero badge" },
  { key: "hero_title", label: "Hero title", long: true },
  { key: "hero_subtitle", label: "Hero subtitle", long: true },
  { key: "hero_primary_cta", label: "Hero primary button" },
  { key: "hero_secondary_cta", label: "Hero secondary button" },
  { key: "categories_title", label: "Categories section title" },
  { key: "offers_title", label: "Offers section title" },
  { key: "shops_title", label: "Shops section title" },
  { key: "trending_title", label: "Trending section title" },
  { key: "how_title", label: "How it works title" },
  { key: "how_step1_title", label: "Step 1 title" },
  { key: "how_step1_text", label: "Step 1 text", long: true },
  { key: "how_step2_title", label: "Step 2 title" },
  { key: "how_step2_text", label: "Step 2 text", long: true },
  { key: "how_step3_title", label: "Step 3 title" },
  { key: "how_step3_text", label: "Step 3 text", long: true },
  { key: "footer_tagline", label: "Footer tagline", long: true },
  { key: "contact_phone", label: "Contact phone" },
  { key: "contact_email", label: "Contact email" },
  { key: "contact_address", label: "Contact address" },
  { key: "developer_name", label: "Developer name" },
  { key: "company_name", label: "Company name" },
];

export const siteContentQuery = {
  queryKey: ["site-content"],
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
