-- Distance and delivery fee for many shops in one round trip.
--
-- Fida shows "3.1 km away" on every partner card and we showed nothing, even
-- though we already had the number: `calculate_delivery_fee` computes haversine
-- distance for any shop. The problem was cost — calling it per card meant one
-- RPC per shop, so a listing of 24 shops fired 24 requests.
--
-- This wraps the *existing* function rather than reimplementing the fee rules.
-- That is deliberate: `calculate_delivery_fee` is the single source of truth for
-- pricing (brackets, base+km, surge, service area) and duplicating any of that
-- here would let the card and the checkout disagree. The card shows exactly what
-- the customer will be charged.
--
-- Returns a jsonb object keyed by shop id:
--   { "<shop uuid>": { "ok": true, "distance": 3.1, "delivery_fee": 55,
--                      "pricing_rule": "0-3 km" },
--     "<shop uuid>": { "ok": false, "reason": "outside_service_area" } }
--
-- Authenticated only, matching `calculate_delivery_fee`: the fees it returns are
-- pricing data, and checkout requires a signed-in customer anyway.
--
-- Idempotent (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.shop_distances(
  p_lat double precision,
  p_lng double precision,
  p_shop_ids uuid[]
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_out jsonb := '{}'::jsonb;
  v_id uuid;
BEGIN
  IF p_shop_ids IS NULL OR array_length(p_shop_ids, 1) IS NULL THEN
    RETURN v_out;
  END IF;

  FOREACH v_id IN ARRAY p_shop_ids LOOP
    v_out := v_out || jsonb_build_object(
      v_id::text,
      public.calculate_delivery_fee(v_id, p_lat, p_lng)
    );
  END LOOP;

  RETURN v_out;
END; $$;

REVOKE ALL ON FUNCTION public.shop_distances(double precision, double precision, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shop_distances(double precision, double precision, uuid[]) TO authenticated, service_role;
