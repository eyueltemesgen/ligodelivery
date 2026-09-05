-- 1. Split public-read policies so anon does not need is_admin()
DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_anon_read ON public.categories FOR SELECT TO anon USING (is_active);
CREATE POLICY categories_auth_read ON public.categories FOR SELECT TO authenticated USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS shops_public_read ON public.shops;
CREATE POLICY shops_anon_read ON public.shops FOR SELECT TO anon USING (is_active);
CREATE POLICY shops_auth_read ON public.shops FOR SELECT TO authenticated USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_anon_read ON public.products FOR SELECT TO anon USING (is_active);
CREATE POLICY products_auth_read ON public.products FOR SELECT TO authenticated USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS offers_public_read ON public.offers;
CREATE POLICY offers_anon_read ON public.offers FOR SELECT TO anon USING (is_active);
CREATE POLICY offers_auth_read ON public.offers FOR SELECT TO authenticated USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS banners_public_read ON public.banners;
CREATE POLICY banners_anon_read ON public.banners FOR SELECT TO anon USING (is_active);
CREATE POLICY banners_auth_read ON public.banners FOR SELECT TO authenticated USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS settings_public_read ON public.settings;
CREATE POLICY settings_anon_read ON public.settings FOR SELECT TO anon USING (is_public);

DROP POLICY IF EXISTS shop_hours_public_read ON public.shop_hours;
CREATE POLICY shop_hours_anon_read ON public.shop_hours FOR SELECT TO anon USING (true);
CREATE POLICY shop_hours_auth_read ON public.shop_hours FOR SELECT TO authenticated USING (true);

-- 2. Revoke anon EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.riders_guard_update() FROM anon, authenticated, public;

-- 3. Rider guard also protects verification_status
CREATE OR REPLACE FUNCTION public.riders_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.is_approved is distinct from old.is_approved
     or new.verification_status is distinct from old.verification_status
     or new.commission_tier is distinct from old.commission_tier then
    raise exception 'Only admins can change rider approval or verification status';
  end if;
  return new;
end;
$$;
REVOKE EXECUTE ON FUNCTION public.riders_guard_update() FROM anon, authenticated, public;

-- 4. Admin bootstrap is strictly one-time via the sentinel table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE bootstrap_done boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS(SELECT 1 FROM public.admin_bootstrap) INTO bootstrap_done;
  IF NOT bootstrap_done THEN
    INSERT INTO public.admin_bootstrap (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'admin') ON CONFLICT DO NOTHING;
  END IF;

  IF COALESCE(NEW.raw_user_meta_data->>'role','customer') = 'rider' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'rider') ON CONFLICT DO NOTHING;
    INSERT INTO public.riders (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'customer') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;