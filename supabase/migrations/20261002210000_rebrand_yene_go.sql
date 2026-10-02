-- Rebrand platform from "Ligo" to "የኔ Go" (Yene Go).
--
-- SAFETY: This migration does not touch any shop, product, category, order,
-- customer, payment, address or rider record. It is additive and idempotent:
-- it only rewrites user-facing brand copy inside the `settings.site_content`
-- JSON blob (and the legacy `settings.contact` email if still on the old
-- domain). All other keys are merged back untouched.

-- 1. site_content — rewrite only the user-facing brand fields.
UPDATE public.settings
SET value = value
  || jsonb_build_object(
       'brand_name',       regexp_replace(COALESCE(value->>'brand_name', 'የኔ Go'),       'Ligo', 'የኔ Go', 'gi'),
       'brand_short_name', regexp_replace(COALESCE(value->>'brand_short_name', 'የኔ Go'), 'Ligo', 'የኔ Go', 'gi'),
       'how_title',        regexp_replace(COALESCE(value->>'how_title', ''),              'Ligo', 'የኔ Go', 'gi'),
       'footer_tagline',   regexp_replace(COALESCE(value->>'footer_tagline', ''),         'Ligo', 'የኔ Go', 'gi'),
       'contact_email',    CASE
                             WHEN lower(COALESCE(value->>'contact_email', '')) = 'hello@ligo.et'
                               THEN 'hello@yenego.et'
                             ELSE COALESCE(value->>'contact_email', 'hello@yenego.et')
                           END
     )
WHERE key = 'site_content';

-- 2. contact setting (used by legacy surfaces) — brand email only.
UPDATE public.settings
SET value = value || jsonb_build_object('email', 'hello@yenego.et')
WHERE key = 'contact'
  AND lower(COALESCE(value->>'email', '')) = 'hello@ligo.et';

-- 3. Merchant notification copy. These functions embed the platform name in
-- notifications shown to admins/merchants. Logic is unchanged — only the brand
-- string is updated — so this is safe to re-run and cannot affect data.
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
