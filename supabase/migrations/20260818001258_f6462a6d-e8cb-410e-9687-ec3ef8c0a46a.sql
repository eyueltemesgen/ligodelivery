CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  subtitle text,
  image_url text,
  link_url text,
  cta_label text,
  placement text NOT NULL DEFAULT 'home_top',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS banners_public_read ON public.banners;
CREATE POLICY banners_public_read ON public.banners FOR SELECT TO public USING (is_active OR is_admin());
DROP POLICY IF EXISTS banners_admin_write ON public.banners;
CREATE POLICY banners_admin_write ON public.banners FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS banners_updated_at ON public.banners;
CREATE TRIGGER banners_updated_at BEFORE UPDATE ON public.banners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.settings (key, value, is_public) VALUES (
  'site_content',
  '{
    "brand_name": "Ligo Delivery",
    "city": "Bishoftu",
    "hero_badge": "Delivering across Bishoftu",
    "hero_title": "Everything you need, delivered in minutes",
    "hero_subtitle": "Food, groceries, pharmacy and daily essentials from your favourite Bishoftu shops — with live tracking and Telebirr, CBE, BOA or cash payment.",
    "hero_primary_cta": "Order now",
    "hero_secondary_cta": "Become a rider",
    "categories_title": "Categories",
    "offers_title": "Today''s offers",
    "shops_title": "Popular shops",
    "trending_title": "Trending items",
    "how_title": "How Ligo works",
    "how_step1_title": "1. Choose",
    "how_step1_text": "Browse Bishoftu shops and add items to your cart.",
    "how_step2_title": "2. Pay",
    "how_step2_text": "Cash on delivery or upload your Telebirr/bank receipt.",
    "how_step3_title": "3. Track",
    "how_step3_text": "Follow your rider live until the order arrives.",
    "footer_tagline": "Ligo delivers food, groceries and essentials across Bishoftu — fast, local and reliable.",
    "contact_phone": "+251942578001",
    "contact_email": "hello@ligo.et",
    "contact_address": "Bishoftu, Oromia",
    "developer_name": "Eyuel Temesgen",
    "company_name": "EYVORA Technologies"
  }'::jsonb,
  true
) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, is_public = true;