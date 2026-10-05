-- Fix: `riders_select_assigned` caused infinite recursion on `orders`.
--
-- 20261005120000 added a `riders` SELECT policy that queried `orders`, but
-- `orders_select_dispatch_pool` already queries `riders` from inside an `orders`
-- policy. Postgres detects that policy cycle and fails EVERY `orders` SELECT
-- with 42P17 ("infinite recursion detected in policy for relation orders"),
-- so a signed-in customer could not load their order list or the live tracking
-- page at all.
--
-- Move the order -> rider ownership check into a SECURITY DEFINER function
-- (same pattern as public.is_admin / public.has_role), which RLS does not
-- re-evaluate, breaking the cycle while keeping the intended access rule.
-- Additive and idempotent.

CREATE OR REPLACE FUNCTION public.customer_can_see_rider(_rider_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.rider_id = _rider_id
      AND o.customer_id = auth.uid()
  )
$$;
REVOKE ALL ON FUNCTION public.customer_can_see_rider(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_can_see_rider(uuid) TO authenticated;

DROP POLICY IF EXISTS "riders_select_assigned" ON public.riders;
CREATE POLICY "riders_select_assigned" ON public.riders FOR SELECT TO authenticated
  USING (public.customer_can_see_rider(id));
