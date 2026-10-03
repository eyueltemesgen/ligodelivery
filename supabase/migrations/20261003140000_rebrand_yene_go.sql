-- Rebrand platform from "Ligo" to "የኔ Go" (Yene Go).
--
-- This migration only rewrites user-facing brand copy. It does NOT touch
-- tables, columns, ids, routes, storage buckets or any operational data.
-- Safe to run multiple times.

-- 1. Refresh the public site content (header logo, footer, hero, contact email).
UPDATE public.settings
SET value = value || jsonb_build_object(
  'brand_name', 'የኔ Go',
  'brand_short_name', 'የኔ Go',
  'how_title', replace(
    COALESCE(value ->> 'how_title', 'How የኔ Go works'), 'Ligo', 'የኔ Go'),
  'footer_tagline', replace(
    COALESCE(
      value ->> 'footer_tagline',
      'የኔ Go delivers food, groceries and essentials across Bishoftu — fast, local and reliable.'
    ), 'Ligo', 'የኔ Go'),
  'contact_email', replace(
    COALESCE(value ->> 'contact_email', 'hello@yenego.et'), '@ligo.et', '@yenego.et')
)
WHERE key = 'site_content';

-- 2. Public contact settings (email domain).
UPDATE public.settings
SET value = jsonb_set(value, '{email}', to_jsonb(replace(value ->> 'email', '@ligo.et', '@yenego.et')))
WHERE key = 'contact' AND value ->> 'email' LIKE '%@ligo.et';

-- 3. Placeholder banners whose copy is exactly the old brand name. Only exact
-- matches are rewritten, so real merchant/promo banners are never touched.
UPDATE public.banners
SET title = 'የኔ Go'
WHERE lower(title) IN ('ligo', 'ligo delivery');

UPDATE public.banners
SET subtitle = 'የኔ Go'
WHERE lower(subtitle) IN ('ligo', 'ligo delivery');

-- 4. Merchant notifications no longer reference the old brand.
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
    COALESCE(_opens_at,'08:00'), COALESCE(_closes_at,'22:00'), _logo_url, _cover_url, 'pending', now())
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

CREATE OR REPLACE FUNCTION public.review_merchant(_merchant uuid, _status text, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE m public.merchant_profiles; sid uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _status NOT IN ('pending','under_review','approved','rejected','suspended') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  SELECT * INTO m FROM public.merchant_profiles WHERE id = _merchant;
  IF NOT FOUND THEN RAISE EXCEPTION 'Merchant not found'; END IF;
  PERFORM set_config('app.merchant_internal', '1', true);
  sid := m.shop_id;
  IF _status = 'approved' THEN
    IF sid IS NULL THEN
      INSERT INTO public.shops(name, description, category_id, phone, address, lat, lng,
        image_url, cover_url, opens_at, closes_at, is_active, is_online, owner_id)
      VALUES (m.business_name, m.business_description, m.category_id, m.business_phone, m.address,
        m.lat, m.lng, m.logo_url, m.cover_url, m.opens_at, m.closes_at, true, true, m.id)
      RETURNING id INTO sid;
    ELSE
      UPDATE public.shops SET is_active = true, owner_id = m.id WHERE id = sid;
    END IF;
  ELSIF _status IN ('rejected','suspended') AND sid IS NOT NULL THEN
    UPDATE public.shops SET is_active = false WHERE id = sid;
  END IF;
  UPDATE public.merchant_profiles
     SET status = _status, review_notes = _notes, shop_id = sid
   WHERE id = _merchant;
  INSERT INTO public.notifications(user_id, title, body, type)
  VALUES (_merchant, 'Merchant application ' || _status,
          COALESCE(_notes, 'Your የኔ Go merchant account status is now ' || _status || '.'), 'merchant');
END; $$;
REVOKE ALL ON FUNCTION public.review_merchant(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_merchant(uuid,text,text) TO authenticated;
