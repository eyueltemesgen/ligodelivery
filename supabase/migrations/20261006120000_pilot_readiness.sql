-- Pilot readiness: duplicate-order protection and cancellation reasons.
--
-- Two verified problems this fixes:
--
-- 1. Double order submission. `place_order` inserts an order with no duplicate
--    guard, so a double tap or a retried submit after a lost response created
--    two separate orders (and two cash-on-delivery charges). This adds a
--    BEFORE INSERT trigger that suppresses a near-identical second order from
--    the same customer within a short window and reports the existing order id,
--    so the app can open it instead of charging again.
--
--    The trigger is used deliberately instead of redefining `place_order`:
--    the live function carries parameters (`p_road_distance_km`,
--    `p_delivery_duration_s`) that are not in this migration history, so
--    recreating it would silently drop them and create an ambiguous overload.
--
-- 2. Cancellations had no recorded reason. `orders.cancel_reason` is in the
--    migration history but was never applied to the live database (verified:
--    PostgREST returns 42703 "column orders.cancel_reason does not exist"), so
--    nothing could write it and a pilot cannot answer "why did orders fail".
--    The column is added here so this migration stands on its own.
--    `cancel_order` records the reason while the existing status guard still
--    decides *whether* a cancel is permitted.
--
-- Additive and idempotent. Nothing is dropped or rewritten, and no existing
-- column is altered. Apply before deploying the matching app build; the app
-- degrades to the previous behaviour when these objects are absent.

-- ---------------------------------------------------------------------------
-- 0. Columns this migration depends on but that the live DB is missing.
--    `20260819200000` added these in the migration history, but they were never
--    applied (verified live), so anything referencing them fails with 42703.
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS refunded boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 1. Support index for the duplicate lookup.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS orders_customer_shop_created_idx
  ON public.orders(customer_id, shop_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Duplicate suppression.
--
--    A second insert for the same customer, shop, total, phone and address
--    while an earlier one is still `pending_payment` and less than two minutes
--    old raises with the existing order id. Only orders that were just created
--    by checkout (status `pending_payment`) are compared, so an order that has
--    already moved on can never block a legitimate new one.
--
--    The error message is machine-readable on purpose: the client matches
--    `DUPLICATE_ORDER:<uuid>` and opens that order, so the customer sees the
--    order they already placed rather than a scary failure.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_duplicate_orders()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _existing uuid;
BEGIN
  IF NEW.status <> 'pending_payment' THEN RETURN NEW; END IF;

  SELECT id INTO _existing
    FROM public.orders
   WHERE customer_id = NEW.customer_id
     AND shop_id IS NOT DISTINCT FROM NEW.shop_id
     AND status = 'pending_payment'
     AND total IS NOT DISTINCT FROM NEW.total
     AND customer_phone IS NOT DISTINCT FROM NEW.customer_phone
     AND delivery_address IS NOT DISTINCT FROM NEW.delivery_address
     AND created_at > now() - interval '2 minutes'
   ORDER BY created_at DESC
   LIMIT 1;

  IF _existing IS NOT NULL THEN
    RAISE EXCEPTION 'DUPLICATE_ORDER:%', _existing
      USING ERRCODE = 'P0001',
            HINT = 'A matching order was just placed; open the existing order.';
  END IF;

  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.prevent_duplicate_orders() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_prevent_duplicate ON public.orders;
CREATE TRIGGER orders_prevent_duplicate BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_orders();

-- ---------------------------------------------------------------------------
-- 3. cancel_order — record who cancelled, why, and when.
--    The orders_guard_update trigger remains the single authority on whether a
--    cancel is permitted (customer, shop owner or admin); this RPC only attaches
--    the reason the guard cannot know. Any failure to find a permitted order
--    raises, so it can never widen access.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_order(_order_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _order public.orders;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _order FROM public.orders
    WHERE id = _order_id
      AND (customer_id = auth.uid() OR public.owns_shop(shop_id) OR public.is_admin());
  IF _order.id IS NULL THEN RAISE EXCEPTION 'Order not found or not yours to cancel'; END IF;

  -- Internal flag lets the column guard accept the cancel_reason write as a
  -- platform action; the guard still validates the status transition itself.
  PERFORM set_config('app.order_internal', '1', true);

  UPDATE public.orders
     SET status = 'cancelled',
         cancel_reason = NULLIF(btrim(COALESCE(_reason, '')), ''),
         updated_at = now()
   WHERE id = _order_id
     AND status NOT IN ('delivered', 'cancelled');

  IF NOT FOUND THEN RAISE EXCEPTION 'This order can no longer be cancelled'; END IF;
END; $$;

REVOKE ALL ON FUNCTION public.cancel_order(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. delivered_at — the pilot cannot measure delivery time without it.
--    `orders` records created_at, accepted_at and dispatched_at but nothing for
--    the moment an order actually arrived, so "average delivery time" and the
--    on-time rate were uncomputable. A trigger stamps it on the transition into
--    'delivered' (from any source: the PIN RPC, admin or a rider), so no
--    existing RPC has to be redefined.
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Backfill is intentionally skipped: inventing a delivery time for historical
-- orders would fabricate a metric. They stay NULL and are excluded from
-- delivery-time averages.
CREATE OR REPLACE FUNCTION public.stamp_delivered_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered'
     AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at := now();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_stamp_delivered_at ON public.orders;
CREATE TRIGGER orders_stamp_delivered_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.stamp_delivered_at();

