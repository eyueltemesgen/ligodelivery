-- Shop operating hours default to 08:00–21:00 (8 am – 9 pm).
-- Previously the fallback was 08:00–22:00. Idempotent and additive.

-- 1. Column defaults for new rows.
ALTER TABLE public.shops
  ALTER COLUMN opens_at SET DEFAULT '08:00',
  ALTER COLUMN closes_at SET DEFAULT '21:00';

ALTER TABLE public.merchant_profiles
  ALTER COLUMN opens_at SET DEFAULT '08:00',
  ALTER COLUMN closes_at SET DEFAULT '21:00';

ALTER TABLE public.shop_hours
  ALTER COLUMN opens_at SET DEFAULT '08:00',
  ALTER COLUMN closes_at SET DEFAULT '21:00';

-- 2. Existing rows still on the old default.
UPDATE public.shops SET closes_at = '21:00' WHERE closes_at = '22:00';
UPDATE public.merchant_profiles SET closes_at = '21:00' WHERE closes_at = '22:00';
UPDATE public.shop_hours SET closes_at = '21:00' WHERE closes_at = '22:00';

-- 3. Merchant application RPC fallback.
CREATE OR REPLACE FUNCTION public.submit_merchant_application(
  _owner_name text, _contact_phone text, _business_name text, _business_description text,
  _category_id uuid, _business_phone text, _address text, _city text,
  _lat double precision, _lng double precision, _opens_at time, _closes_at time,
  _logo_url text, _cover_url text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); em text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  SELECT email INTO em FROM auth.users WHERE id = uid;
  PERFORM set_config('app.merchant_internal', '1', true);
  INSERT INTO public.merchant_profiles(
    id, owner_name, contact_phone, contact_email, business_name, business_description,
    category_id, business_phone, address, city, lat, lng, opens_at, closes_at,
    logo_url, cover_url, status, terms_accepted_at)
  VALUES (uid, _owner_name, _contact_phone, em, _business_name, _business_description,
    _category_id, _business_phone, _address, COALESCE(NULLIF(_city,''),'Bishoftu'), _lat, _lng,
    COALESCE(_opens_at,'08:00'), COALESCE(_closes_at,'21:00'), _logo_url, _cover_url, 'pending', now())
  ON CONFLICT (id) DO UPDATE SET
    owner_name = EXCLUDED.owner_name, contact_phone = EXCLUDED.contact_phone,
    business_name = EXCLUDED.business_name, business_description = EXCLUDED.business_description,
    category_id = EXCLUDED.category_id, business_phone = EXCLUDED.business_phone,
    address = EXCLUDED.address, city = EXCLUDED.city, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
    opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
    logo_url = EXCLUDED.logo_url, cover_url = EXCLUDED.cover_url,
    status = CASE WHEN public.merchant_profiles.status IN ('rejected','pending','under_review')
                  THEN 'pending' ELSE public.merchant_profiles.status END,
    terms_accepted_at = now();
  INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'merchant') ON CONFLICT DO NOTHING;
  INSERT INTO public.notifications(user_id, title, body, type)
  SELECT ur.user_id, 'New merchant application', _business_name || ' applied to sell on የኔ Go.', 'merchant'
  FROM public.user_roles ur WHERE ur.role = 'admin';
  RETURN uid;
END; $$;
REVOKE ALL ON FUNCTION public.submit_merchant_application(text,text,text,text,uuid,text,text,text,double precision,double precision,time,time,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_merchant_application(text,text,text,text,uuid,text,text,text,double precision,double precision,time,time,text,text) TO authenticated;
