-- =========================================================================
-- Fix: Special Moments public read policies called public.is_admin(), whose
-- EXECUTE is not granted to anon. Anonymous visitors therefore got
-- "permission denied for function is_admin" and the hub, category and search
-- pages rendered empty states even though the taxonomy is seeded.
--
-- Anon reads now use is_active alone. Authenticated reads keep
-- (is_active OR is_admin()) so admins can still see and re-enable inactive
-- rows in the admin UI. Admin writes are unchanged (is_admin(), authenticated
-- role which has EXECUTE). Idempotent and safe to re-run.
-- =========================================================================

DROP POLICY IF EXISTS service_categories_public_read ON public.service_categories;
CREATE POLICY service_categories_public_read ON public.service_categories
  FOR SELECT TO anon USING (is_active);
DROP POLICY IF EXISTS service_categories_authenticated_read ON public.service_categories;
CREATE POLICY service_categories_authenticated_read ON public.service_categories
  FOR SELECT TO authenticated USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS services_public_read ON public.services;
CREATE POLICY services_public_read ON public.services
  FOR SELECT TO anon USING (is_active);
DROP POLICY IF EXISTS services_authenticated_read ON public.services;
CREATE POLICY services_authenticated_read ON public.services
  FOR SELECT TO authenticated USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS service_addons_public_read ON public.service_addons;
CREATE POLICY service_addons_public_read ON public.service_addons
  FOR SELECT TO anon USING (is_active);
DROP POLICY IF EXISTS service_addons_authenticated_read ON public.service_addons;
CREATE POLICY service_addons_authenticated_read ON public.service_addons
  FOR SELECT TO authenticated USING (is_active OR public.is_admin());
