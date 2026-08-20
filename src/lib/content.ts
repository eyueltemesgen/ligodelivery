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
  brand_name: "Ligo Delivery",
  brand_short_name: "Ligo",
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
  how_title: "How Ligo works",
  how_step1_title: "1. Choose",
  how_step1_text: "Browse Bishoftu shops and add items to your cart.",
  how_step2_title: "2. Pay",
  how_step2_text: "Cash on delivery or upload your Telebirr/bank receipt.",
  how_step3_title: "3. Track",
  how_step3_text: "Follow your rider live until the order arrives.",
  footer_tagline:
    "Ligo delivers food, groceries and essentials across Bishoftu — fast, local and reliable.",
  contact_phone: "+251942578001",
  contact_email: "hello@ligo.et",
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
    return { ...DEFAULT_CONTENT, ...((data?.value ?? {}) as Partial<SiteContent>) };
  },
  placeholderData: DEFAULT_CONTENT,
};

export const bannersQuery = (placement?: string) => ({
  queryKey: ["banners", placement ?? "all"],
  queryFn: async (): Promise<Banner[]> => {
    let q = supabase.from("banners").select("*").eq("is_active", true).order("sort_order");
    if (placement) q = q.eq("placement", placement);
    const { data } = await q;
    return (data ?? []) as Banner[];
  },
});
