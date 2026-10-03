DO $body$
DECLARE
  stmts text[] := ARRAY[
    $ddl$CREATE TABLE IF NOT EXISTS public.advertisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS advertisers_shop_idx ON public.advertisers(shop_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertisers TO authenticated;
GRANT ALL ON public.advertisers TO service_role;
ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS advertisers_admin_all ON public.advertisers;
CREATE POLICY advertisers_admin_all ON public.advertisers
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP TRIGGER IF EXISTS advertisers_updated ON public.advertisers;
CREATE TRIGGER advertisers_updated BEFORE UPDATE ON public.advertisers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();$ddl$,
    $ddl$CREATE TABLE IF NOT EXISTS public.ad_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  layout text NOT NULL DEFAULT 'carousel' CHECK (layout IN ('carousel', 'grid', 'single')),
  max_ads integer NOT NULL DEFAULT 6,
  aspect_ratio text NOT NULL DEFAULT '16/6',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_placements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_placements TO authenticated;
GRANT ALL ON public.ad_placements TO service_role;
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ad_placements_public_read ON public.ad_placements;
CREATE POLICY ad_placements_public_read ON public.ad_placements
  FOR SELECT TO anon USING (is_active);
DROP POLICY IF EXISTS ad_placements_auth_read ON public.ad_placements;
CREATE POLICY ad_placements_auth_read ON public.ad_placements
  FOR SELECT TO authenticated USING (is_active OR public.is_admin());
DROP POLICY IF EXISTS ad_placements_admin_write ON public.ad_placements;
CREATE POLICY ad_placements_admin_write ON public.ad_placements
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP TRIGGER IF EXISTS ad_placements_updated ON public.ad_placements;
CREATE TRIGGER ad_placements_updated BEFORE UPDATE ON public.ad_placements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();$ddl$,
    $ddl$CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid REFERENCES public.advertisers(id) ON DELETE SET NULL,
  name text NOT NULL,
  objective text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  start_date date,
  end_date date,
  budget numeric(12,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ad_campaigns_advertiser_idx ON public.ad_campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS ad_campaigns_status_idx ON public.ad_campaigns(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_campaigns TO authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ad_campaigns_admin_all ON public.ad_campaigns;
CREATE POLICY ad_campaigns_admin_all ON public.ad_campaigns
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP TRIGGER IF EXISTS ad_campaigns_updated ON public.ad_campaigns;
CREATE TRIGGER ad_campaigns_updated BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();$ddl$,
    $ddl$CREATE TABLE IF NOT EXISTS public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid REFERENCES public.advertisers(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  placement_key text NOT NULL REFERENCES public.ad_placements(key)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  name text NOT NULL,
  ad_type text NOT NULL DEFAULT 'homepage_banner'
    CHECK (ad_type IN ('homepage_banner', 'sponsored_shop', 'sponsored_product', 'promotional_card')),
  title text,
  subtitle text,
  cta_label text,
  image_url text,
  link_type text NOT NULL DEFAULT 'none'
    CHECK (link_type IN ('shop', 'product', 'service', 'special_moments', 'external', 'none')),
  link_value text,
  target_page text,
  target_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  target_shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  target_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  target_service_category_slug text,
  target_location text,
  target_device text NOT NULL DEFAULT 'all'
    CHECK (target_device IN ('all', 'mobile', 'desktop')),
  priority integer NOT NULL DEFAULT 0,
  weight integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  is_active boolean NOT NULL DEFAULT true,
  start_at timestamptz,
  end_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ads_schedule_valid CHECK (end_at IS NULL OR start_at IS NULL OR end_at >= start_at)
);
CREATE INDEX IF NOT EXISTS ads_placement_idx ON public.ads(placement_key);
CREATE INDEX IF NOT EXISTS ads_status_idx ON public.ads(status, is_active);
CREATE INDEX IF NOT EXISTS ads_campaign_idx ON public.ads(campaign_id);
CREATE INDEX IF NOT EXISTS ads_advertiser_idx ON public.ads(advertiser_id);
CREATE INDEX IF NOT EXISTS ads_schedule_idx ON public.ads(start_at, end_at);
GRANT SELECT ON public.ads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT ALL ON public.ads TO service_role;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ads_public_read ON public.ads;
CREATE POLICY ads_public_read ON public.ads
  FOR SELECT TO anon
  USING (
    is_active
    AND status = 'active'
    AND (start_at IS NULL OR start_at <= now())
    AND (end_at IS NULL OR end_at >= now())
  );
DROP POLICY IF EXISTS ads_auth_read ON public.ads;
CREATE POLICY ads_auth_read ON public.ads
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      is_active
      AND status = 'active'
      AND (start_at IS NULL OR start_at <= now())
      AND (end_at IS NULL OR end_at >= now())
    )
  );
DROP POLICY IF EXISTS ads_admin_write ON public.ads;
CREATE POLICY ads_admin_write ON public.ads
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP TRIGGER IF EXISTS ads_updated ON public.ads;
CREATE TRIGGER ads_updated BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();$ddl$,
    $ddl$CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  placement_key text NOT NULL DEFAULT '',
  session_id text NOT NULL DEFAULT 'anon',
  user_id uuid,
  device text,
  page_path text,
  bucket_hour timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ad_impressions_ad_idx ON public.ad_impressions(ad_id);
CREATE INDEX IF NOT EXISTS ad_impressions_created_idx ON public.ad_impressions(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS ad_impressions_dedupe_idx
  ON public.ad_impressions(ad_id, session_id, placement_key, bucket_hour);
GRANT SELECT ON public.ad_impressions TO authenticated;
GRANT ALL ON public.ad_impressions TO service_role;
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ad_impressions_admin_read ON public.ad_impressions;
CREATE POLICY ad_impressions_admin_read ON public.ad_impressions
  FOR SELECT TO authenticated USING (public.is_admin());$ddl$,
    $ddl$CREATE TABLE IF NOT EXISTS public.ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  placement_key text NOT NULL DEFAULT '',
  session_id text NOT NULL DEFAULT 'anon',
  user_id uuid,
  device text,
  page_path text,
  bucket_hour timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ad_clicks_ad_idx ON public.ad_clicks(ad_id);
CREATE INDEX IF NOT EXISTS ad_clicks_created_idx ON public.ad_clicks(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS ad_clicks_dedupe_idx
  ON public.ad_clicks(ad_id, session_id, placement_key, bucket_hour);
GRANT SELECT ON public.ad_clicks TO authenticated;
GRANT ALL ON public.ad_clicks TO service_role;
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ad_clicks_admin_read ON public.ad_clicks;
CREATE POLICY ad_clicks_admin_read ON public.ad_clicks
  FOR SELECT TO authenticated USING (public.is_admin());$ddl$,
    $ddl$CREATE TABLE IF NOT EXISTS public.ad_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  duration_days integer NOT NULL DEFAULT 30,
  price numeric(12,2) NOT NULL DEFAULT 0,
  placements text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_packages TO authenticated;
GRANT ALL ON public.ad_packages TO service_role;
ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ad_packages_public_read ON public.ad_packages;
CREATE POLICY ad_packages_public_read ON public.ad_packages
  FOR SELECT TO anon USING (is_active);
DROP POLICY IF EXISTS ad_packages_auth_read ON public.ad_packages;
CREATE POLICY ad_packages_auth_read ON public.ad_packages
  FOR SELECT TO authenticated USING (is_active OR public.is_admin());
DROP POLICY IF EXISTS ad_packages_admin_write ON public.ad_packages;
CREATE POLICY ad_packages_admin_write ON public.ad_packages
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP TRIGGER IF EXISTS ad_packages_updated ON public.ad_packages;
CREATE TRIGGER ad_packages_updated BEFORE UPDATE ON public.ad_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();$ddl$,
    $ddl$DROP FUNCTION IF EXISTS public.eligible_ads(text, integer, text, uuid, uuid, uuid, text, text, text);
CREATE OR REPLACE FUNCTION public.eligible_ads(
  p_placement text,
  p_limit integer DEFAULT NULL,
  p_page text DEFAULT NULL,
  p_category uuid DEFAULT NULL,
  p_shop uuid DEFAULT NULL,
  p_product uuid DEFAULT NULL,
  p_service_type text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_device text DEFAULT NULL
) RETURNS SETOF public.ads
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
  SELECT a.*
  FROM public.ads a
  JOIN public.ad_placements pl ON pl.key = a.placement_key AND pl.is_active
  LEFT JOIN public.ad_campaigns c ON c.id = a.campaign_id
  WHERE a.placement_key = p_placement
    AND a.is_active
    AND a.status = 'active'
    AND (a.start_at IS NULL OR a.start_at <= now())
    AND (a.end_at IS NULL OR a.end_at >= now())
    AND (
      a.campaign_id IS NULL
      OR (
        c.status = 'active'
        AND (c.start_date IS NULL OR c.start_date <= now()::date)
        AND (c.end_date IS NULL OR c.end_date >= now()::date)
      )
    )
    AND (a.target_page IS NULL OR p_page IS NULL OR a.target_page = p_page)
    AND (a.target_category_id IS NULL OR p_category IS NULL OR a.target_category_id = p_category)
    AND (a.target_shop_id IS NULL OR p_shop IS NULL OR a.target_shop_id = p_shop)
    AND (a.target_product_id IS NULL OR p_product IS NULL OR a.target_product_id = p_product)
    AND (
      a.target_service_category_slug IS NULL
      OR p_service_type IS NULL
      OR a.target_service_category_slug = p_service_type
    )
    AND (
      a.target_location IS NULL
      OR p_location IS NULL
      OR lower(a.target_location) = lower(p_location)
    )
    AND (
      a.target_device IS NULL
      OR a.target_device = 'all'
      OR p_device IS NULL
      OR a.target_device = p_device
    )
  ORDER BY a.priority DESC, a.weight DESC, a.sort_order ASC, random()
  LIMIT COALESCE(
    p_limit,
    (SELECT max_ads FROM public.ad_placements WHERE key = p_placement),
    6
  )
$fn$;
REVOKE ALL ON FUNCTION public.eligible_ads(text, integer, text, uuid, uuid, uuid, text, text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eligible_ads(text, integer, text, uuid, uuid, uuid, text, text, text)
  TO anon, authenticated;$ddl$,
    $ddl$DROP FUNCTION IF EXISTS public.record_ad_impression(uuid, text, text, text, text);
CREATE OR REPLACE FUNCTION public.record_ad_impression(
  p_ad_id uuid,
  p_placement text DEFAULT NULL,
  p_session text DEFAULT 'anon',
  p_device text DEFAULT NULL,
  p_path text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF p_ad_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.ad_impressions (ad_id, placement_key, session_id, user_id, device, page_path, bucket_hour)
  VALUES (
    p_ad_id,
    COALESCE(p_placement, ''),
    COALESCE(NULLIF(p_session, ''), 'anon'),
    auth.uid(),
    left(p_device, 40),
    left(p_path, 300),
    date_trunc('hour', now())
  )
  ON CONFLICT (ad_id, session_id, placement_key, bucket_hour) DO NOTHING;
END; $fn$;
REVOKE ALL ON FUNCTION public.record_ad_impression(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_ad_impression(uuid, text, text, text, text) TO anon, authenticated;$ddl$,
    $ddl$DROP FUNCTION IF EXISTS public.record_ad_click(uuid, text, text, text, text);
CREATE OR REPLACE FUNCTION public.record_ad_click(
  p_ad_id uuid,
  p_placement text DEFAULT NULL,
  p_session text DEFAULT 'anon',
  p_device text DEFAULT NULL,
  p_path text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF p_ad_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.ad_clicks (ad_id, placement_key, session_id, user_id, device, page_path, bucket_hour)
  VALUES (
    p_ad_id,
    COALESCE(p_placement, ''),
    COALESCE(NULLIF(p_session, ''), 'anon'),
    auth.uid(),
    left(p_device, 40),
    left(p_path, 300),
    date_trunc('hour', now())
  )
  ON CONFLICT (ad_id, session_id, placement_key, bucket_hour) DO NOTHING;
END; $fn$;
REVOKE ALL ON FUNCTION public.record_ad_click(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_ad_click(uuid, text, text, text, text) TO anon, authenticated;$ddl$,
    $ddl$DROP FUNCTION IF EXISTS public.admin_ad_analytics(timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION public.admin_ad_analytics(
  p_from timestamptz DEFAULT (now() - interval '30 days'),
  p_to timestamptz DEFAULT now()
) RETURNS TABLE (
  ad_id uuid,
  ad_name text,
  ad_type text,
  placement_key text,
  advertiser_name text,
  campaign_name text,
  status text,
  impressions bigint,
  clicks bigint,
  ctr numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.ad_type,
    a.placement_key,
    adv.name,
    c.name,
    a.status,
    COALESCE(i.cnt, 0)::bigint,
    COALESCE(cl.cnt, 0)::bigint,
    CASE
      WHEN COALESCE(i.cnt, 0) = 0 THEN 0::numeric
      ELSE round((COALESCE(cl.cnt, 0)::numeric / i.cnt::numeric) * 100, 2)
    END
  FROM public.ads a
  LEFT JOIN public.advertisers adv ON adv.id = a.advertiser_id
  LEFT JOIN public.ad_campaigns c ON c.id = a.campaign_id
  LEFT JOIN (
    SELECT imp.ad_id, count(*) AS cnt
    FROM public.ad_impressions imp
    WHERE imp.created_at >= p_from AND imp.created_at <= p_to
    GROUP BY imp.ad_id
  ) i ON i.ad_id = a.id
  LEFT JOIN (
    SELECT ck.ad_id, count(*) AS cnt
    FROM public.ad_clicks ck
    WHERE ck.created_at >= p_from AND ck.created_at <= p_to
    GROUP BY ck.ad_id
  ) cl ON cl.ad_id = a.id
  ORDER BY COALESCE(i.cnt, 0) DESC, a.created_at DESC;
END; $fn$;
REVOKE ALL ON FUNCTION public.admin_ad_analytics(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ad_analytics(timestamptz, timestamptz) TO authenticated;$ddl$,
    $ddl$INSERT INTO public.ad_placements (key, name, description, layout, max_ads, aspect_ratio, sort_order) VALUES
  ('HOME_TOP', 'Home — top', 'Above the homepage hero. Best for brand campaigns.', 'carousel', 6, '16/6', 1),
  ('HOME_MIDDLE', 'Home — middle', 'Between the category grid and Special Moments.', 'carousel', 4, '16/6', 2),
  ('HOME_BOTTOM', 'Home — bottom', 'Below the trending items, above the footer.', 'grid', 3, '4/3', 3),
  ('SHOP_TOP', 'Shop — top', 'Above a shop menu.', 'single', 1, '16/6', 4),
  ('PRODUCT_RELATED', 'Product — related', 'Shown alongside a product. Sponsored products.', 'grid', 3, '1/1', 5),
  ('CATEGORY_TOP', 'Category — top', 'Above a category listing.', 'carousel', 4, '16/6', 6),
  ('SEARCH_TOP', 'Search — top', 'Above search results.', 'single', 1, '16/6', 7),
  ('SPECIAL_MOMENTS_TOP', 'Special Moments — top', 'Above the Special Moments landing content.', 'carousel', 4, '16/6', 8)
ON CONFLICT (key) DO NOTHING;$ddl$,
    $ddl$INSERT INTO public.ad_packages (name, description, duration_days, price, placements, sort_order) VALUES
  ('Homepage Featured', 'Rotating homepage banner across the top placements.', 30, 0,
   ARRAY['HOME_TOP', 'HOME_MIDDLE'], 1),
  ('Shop Promotion', 'Promote a shop at the top of its page and search.', 30, 0,
   ARRAY['SHOP_TOP', 'SEARCH_TOP'], 2),
  ('Product Promotion', 'Sponsored product placement alongside related items.', 30, 0,
   ARRAY['PRODUCT_RELATED'], 3),
  ('Special Moments Promotion', 'Feature a service above the Special Moments content.', 30, 0,
   ARRAY['SPECIAL_MOMENTS_TOP'], 4)
ON CONFLICT (name) DO NOTHING;$ddl$
  ];
  s text;
  i int := 0;
BEGIN
  FOREACH s IN ARRAY stmts LOOP
    i := i + 1;
    BEGIN
      EXECUTE s;
      RAISE NOTICE 'statement % ok', i;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'statement % FAILED: %', i, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'advertising bootstrap complete: % statements attempted', i;
END $body$;
