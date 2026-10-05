-- Two live-DB defects found while walking the rider and admin flows.
-- Additive and idempotent; apply via Lovable/Supabase.

-- ---------------------------------------------------------------------------
-- 1. accept_order sets orders.accepted_at, but that column does not exist on
--    the live database (the ADD COLUMN from 20260819181500 never landed on
--    this table even though its sibling columns did). Every rider claim failed
--    with 42703 "column accepted_at of relation orders does not exist", so no
--    order could ever be accepted. Add the column the function expects.
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. riders_insert_self only checked id = auth.uid(), and riders_guard_update
--    is an UPDATE-only trigger. A brand-new account could therefore INSERT its
--    own riders row with is_approved = true (or verification_status =
--    'approved') and become a fully approved rider with no admin review —
--    enough to see the live dispatch pool (orders_select_dispatch_pool only
--    requires is_approved) and claim orders. Reject a non-admin INSERT that
--    already claims approval; a pending self-insert (is_approved = false) is
--    still allowed so riders can apply.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.riders_guard_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.is_approved OR NEW.verification_status = 'approved' THEN
    RAISE EXCEPTION 'Only admins can approve riders';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.riders_guard_insert() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS riders_guard_insert ON public.riders;
CREATE TRIGGER riders_guard_insert BEFORE INSERT ON public.riders
  FOR EACH ROW EXECUTE FUNCTION public.riders_guard_insert();

-- ---------------------------------------------------------------------------
-- 3. Defence in depth for roles. Roles are granted by the handle_new_user
--    trigger (SECURITY DEFINER), never by the client, so no authenticated user
--    needs to write user_roles. Keep self-select and restrict writes to admins.
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_roles_admin_write ON public.user_roles;
CREATE POLICY user_roles_admin_write ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
