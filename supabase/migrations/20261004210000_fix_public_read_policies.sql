-- Fix: public read policies on delivery/menu tables referenced public.is_admin(),
-- which the anon role cannot execute (EXECUTE was revoked from PUBLIC). That made
-- anonymous reads of delivery_fee_rules, product_option_groups and product_options
-- fail with "permission denied for function is_admin", breaking the checkout fee
-- breakdown and product variants for signed-out customers.
--
-- Public reads now follow the project convention: USING (is_active). Admin writes
-- keep is_admin() (authenticated role, which has EXECUTE).
-- Idempotent and safe to re-run.

DROP POLICY IF EXISTS delivery_fee_rules_public_read ON public.delivery_fee_rules;
CREATE POLICY delivery_fee_rules_public_read ON public.delivery_fee_rules
  FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS product_option_groups_read ON public.product_option_groups;
CREATE POLICY product_option_groups_read ON public.product_option_groups
  FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS product_options_read ON public.product_options;
CREATE POLICY product_options_read ON public.product_options
  FOR SELECT TO anon, authenticated USING (is_active);
