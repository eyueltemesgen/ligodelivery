CREATE TABLE IF NOT EXISTS public.ad_placements (
  code text PRIMARY KEY,
  label text NOT NULL,
  page text NOT NULL DEFAULT 'home',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_placements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ad_placements TO authenticated;
GRANT ALL ON public.ad_placements TO service_role;
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY ad_placements_read ON public.ad_placements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ad_placements_admin ON public.ad_placements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.ad_placements(code,label,page,sort_order) VALUES
 ('HOME_TOP','Home — top carousel','home',1),('HOME_MIDDLE','Home — middle','home',2),('HOME_BOTTOM','Home — bottom','home',3),
 ('SHOP_TOP','Shop page — top','shop',4),('PRODUCT_RELATED','Shop page — related products','shop',5),
 ('CATEGORY_TOP','Categories — top','categories',6),('SEARCH_TOP','Search — top','search',7),('SPECIAL_MOMENTS_TOP','Offers / Special Moments — top','offers',8)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.advertisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, contact_name text, phone text, email text,
  shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  notes text, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertisers TO authenticated;
GRANT ALL ON public.advertisers TO service_role;
ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;
CREATE POLICY advertisers_admin ON public.advertisers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.ad_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, duration_days integer NOT NULL DEFAULT 7, price numeric NOT NULL DEFAULT 0,
  placements text[] NOT NULL DEFAULT '{}', is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_packages TO authenticated;
GRANT ALL ON public.ad_packages TO service_role;
ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY ad_packages_admin ON public.ad_packages FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid REFERENCES public.advertisers(id) ON DELETE SET NULL,
  package_id uuid REFERENCES public.ad_packages(id) ON DELETE SET NULL,
  name text NOT NULL, status text NOT NULL DEFAULT 'active',
  starts_at timestamptz, ends_at timestamptz, budget numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_campaigns TO authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY ad_campaigns_admin ON public.ad_campaigns FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  advertiser_id uuid REFERENCES public.advertisers(id) ON DELETE SET NULL,
  ad_type text NOT NULL DEFAULT 'banner',
  title text NOT NULL, subtitle text, image_url text, cta_label text,
  destination_type text NOT NULL DEFAULT 'none',
  destination_id uuid, destination_url text,
  placement text NOT NULL REFERENCES public.ad_placements(code) ON UPDATE CASCADE,
  priority integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz, ends_at timestamptz,
  target_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  target_shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  target_device text NOT NULL DEFAULT 'all',
  target_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ads_status_chk CHECK (status IN ('draft','active','paused','archived')),
  CONSTRAINT ads_type_chk CHECK (ad_type IN ('banner','sponsored_shop','sponsored_product','promo_card')),
  CONSTRAINT ads_dest_chk CHECK (destination_type IN ('none','shop','product','category','offers','external')),
  CONSTRAINT ads_device_chk CHECK (target_device IN ('all','mobile','desktop'))
);
CREATE INDEX IF NOT EXISTS ads_placement_idx ON public.ads(placement, status, priority DESC);
GRANT SELECT ON public.ads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT ALL ON public.ads TO service_role;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY ads_public_live ON public.ads FOR SELECT TO anon, authenticated
  USING (status = 'active' AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY ads_admin ON public.ads FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER ads_updated_at BEFORE UPDATE ON public.ads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ad_id uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  placement text, device text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ad_clicks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ad_id uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  placement text, device text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ad_impressions_ad_idx ON public.ad_impressions(ad_id);
CREATE INDEX IF NOT EXISTS ad_clicks_ad_idx ON public.ad_clicks(ad_id);
GRANT SELECT ON public.ad_impressions, public.ad_clicks TO authenticated;
GRANT ALL ON public.ad_impressions, public.ad_clicks TO service_role;
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY ad_impressions_admin_read ON public.ad_impressions FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY ad_clicks_admin_read ON public.ad_clicks FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.track_ad_event(_ad_id uuid, _kind text, _device text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pl text;
BEGIN
  SELECT placement INTO _pl FROM public.ads WHERE id = _ad_id AND status = 'active'
    AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now());
  IF _pl IS NULL THEN RETURN; END IF;
  IF _device NOT IN ('mobile','desktop') THEN _device := NULL; END IF;
  IF _kind = 'impression' THEN INSERT INTO public.ad_impressions(ad_id, placement, device) VALUES (_ad_id, _pl, _device);
  ELSIF _kind = 'click' THEN INSERT INTO public.ad_clicks(ad_id, placement, device) VALUES (_ad_id, _pl, _device);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.track_ad_event(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.track_ad_event(uuid, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.ad_stats()
RETURNS TABLE(ad_id uuid, impressions bigint, clicks bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id,
    (SELECT count(*) FROM public.ad_impressions i WHERE i.ad_id = a.id),
    (SELECT count(*) FROM public.ad_clicks c WHERE c.ad_id = a.id)
  FROM public.ads a WHERE public.is_admin();
$$;
REVOKE ALL ON FUNCTION public.ad_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.ad_stats() TO authenticated;