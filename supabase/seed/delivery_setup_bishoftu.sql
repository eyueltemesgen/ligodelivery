-- Yene Go — shop coordinates + delivery rate setup (Bishoftu).
--
-- Run AFTER supabase/migrations/20261004200000_delivery_fee_engine.sql.
-- Safe to re-run: settings are merged, rules are matched by label, and shop
-- coordinates are only written where they are still NULL.
--
-- The coordinates below are approximate starting points derived from each
-- shop's stated address / landmark in Bishoftu. They are good enough to make
-- the distance engine produce sane fees, but the admin should fine-tune each
-- pin from Admin → Ops → shop location picker for exact accuracy.

-- ---------------------------------------------------------------------------
-- 1. Delivery settings — distance brackets, service area
--    (existing keys such as free_over are preserved)
-- ---------------------------------------------------------------------------
INSERT INTO public.settings (key, value, is_public)
VALUES ('delivery', jsonb_build_object(
  'pricing_method', 'brackets',
  'max_distance_km', 12,
  'base_fee', 50,
  'per_km', 15,
  'enabled', true
), true)
ON CONFLICT (key) DO UPDATE
  SET value = COALESCE(public.settings.value, '{}'::jsonb) || jsonb_build_object(
        'pricing_method', 'brackets',
        'max_distance_km', 12,
        'base_fee', 50,
        'per_km', 15,
        'enabled', true
      );

-- ---------------------------------------------------------------------------
-- 2. Calibrated distance brackets.
--    Removes only the example seed rows, then inserts the tuned set.
--    Re-runnable: a row is inserted only when no rule with that label exists.
-- ---------------------------------------------------------------------------
DELETE FROM public.delivery_fee_rules
WHERE label IN ('0-2 km', '2-4 km', '4-6 km', '6-8 km', '8-10 km');

-- Brackets cover the full 0-12 km service area; beyond 12 km the engine
-- returns outside_service_area (see settings.delivery.max_distance_km).
INSERT INTO public.delivery_fee_rules (min_distance, max_distance, fee, label, priority, is_active)
SELECT v.min_distance, v.max_distance, v.fee, v.label, v.priority, true
FROM (VALUES
  (0::numeric,   3::numeric,   50::numeric, '0-3 km',   1),
  (3::numeric,   6::numeric,   65::numeric, '3-6 km',   2),
  (6::numeric,  10::numeric,   85::numeric, '6-10 km',  3),
  (10::numeric, 12::numeric,  110::numeric, '10-12 km', 4)
) AS v(min_distance, max_distance, fee, label, priority)
WHERE NOT EXISTS (
  SELECT 1 FROM public.delivery_fee_rules r WHERE r.label = v.label
);

-- ---------------------------------------------------------------------------
-- 3. Shop coordinates (only where still NULL, so admin edits are never lost)
-- ---------------------------------------------------------------------------
UPDATE public.shops SET lat = 8.7530, lng = 38.9820
WHERE id = '7d401049-80aa-43ca-b8ce-7b99a6765199' AND lat IS NULL; -- Bishoftu Burger House (Main Street)

UPDATE public.shops SET lat = 8.7560, lng = 38.9890
WHERE id = '7d258779-22c9-4f33-9d4f-3b13ae6c20ff' AND lat IS NULL; -- Bishoftu Fresh Market 2 (Kebele 05)

UPDATE public.shops SET lat = 8.7620, lng = 38.9900
WHERE id = 'b2898585-c8d8-4894-a619-8594a4e44282' AND lat IS NULL; -- hora burger (Lake Hora)

UPDATE public.shops SET lat = 8.7830, lng = 38.9920
WHERE id = 'c7ef7006-04e5-4184-ae0c-68218c6270fc' AND lat IS NULL; -- Kuriftu Kitchen (Lake Babogaya Road)

UPDATE public.shops SET lat = 8.7470, lng = 38.9790
WHERE id = 'abade0e7-1d88-4089-8ad1-009aedf17637' AND lat IS NULL; -- lina bakery (Kebele 02)

UPDATE public.shops SET lat = 8.7250, lng = 38.9600
WHERE id = '73cce4a2-1c2b-42ce-a9f7-f39e8f108546' AND lat IS NULL; -- Selam Supermarket (Airport Road)

UPDATE public.shops SET lat = 8.7520, lng = 38.9930
WHERE id = 'd09d26e7-6722-49c0-a5d1-ce71e79315b9' AND lat IS NULL; -- Tana Cafe (Debre Zeyit Road)
