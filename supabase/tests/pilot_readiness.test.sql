-- Behaviour tests for 20261006120000_pilot_readiness.sql.
--
-- Self-contained: stubs the live objects the migration depends on (auth.uid,
-- is_admin, owns_shop, a minimal orders table), applies the real migration
-- file, then exercises every claim it makes. Run from the repo root:
--
--   docker run -d --name yg-pg -e POSTGRES_PASSWORD=pg -e POSTGRES_DB=yg -p 55432:5432 postgres:16-alpine
--   docker exec -i yg-pg psql -U postgres -d yg -v ON_ERROR_STOP=1 \
--     -f - < supabase/tests/pilot_readiness.test.sql
--
-- Expect 'TOTAL 31   PASS 31   FAIL 0'. Applying the migration twice must
-- also stay clean, since it is written to be idempotent.

-- Stub the live Supabase objects the pilot migration depends on, so the real
-- migration can be applied unmodified against a genuine Postgres 16.
CREATE SCHEMA IF NOT EXISTS auth;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;

-- auth.uid() is session-settable so a test can act as different callers.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('test.uid', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('test.is_admin', true), '') = '1'
$$;

CREATE OR REPLACE FUNCTION public.owns_shop(_shop uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('test.owns_shop', true), '') = _shop::text
$$;

-- Minimal orders table mirroring the live columns the migration touches.
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  shop_id uuid,
  status text NOT NULL DEFAULT 'pending_payment',
  total numeric(10,2),
  customer_phone text,
  delivery_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==== the migration under test ====
\i supabase/migrations/20261006120000_pilot_readiness.sql

\set ON_ERROR_STOP 0
\pset pager off
\pset tuples_only on
\pset format unaligned

-- Start from a clean slate so results are deterministic.
TRUNCATE public.orders;

CREATE TABLE pg_temp.results (n serial, ok boolean, name text, got text, want text);

CREATE OR REPLACE FUNCTION pg_temp.check(_name text, _got text, _want text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO pg_temp.results (ok, name, got, want) VALUES (_got = _want, _name, _got, _want);
END $$;

-- Insert and report whether it was accepted or rejected, plus the message.
CREATE OR REPLACE FUNCTION pg_temp.try_insert(
  _cust uuid, _shop uuid, _total numeric, _status text DEFAULT 'pending_payment',
  _age interval DEFAULT '0 seconds', _phone text DEFAULT '0911',
  _addr text DEFAULT 'Bishoftu'
) RETURNS text LANGUAGE plpgsql AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.orders (customer_id, shop_id, status, total, customer_phone,
                             delivery_address, created_at)
  VALUES (_cust, _shop, _status, _total, _phone, _addr, now() - _age)
  RETURNING id INTO _id;
  RETURN 'inserted';
EXCEPTION WHEN OTHERS THEN
  RETURN 'raised:' || SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.try_cancel(_order uuid, _reason text)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.cancel_order(_order, _reason);
  RETURN 'ok';
EXCEPTION WHEN OTHERS THEN
  RETURN 'raised:' || SQLERRM;
END $$;

-- ===========================================================================
-- 1. Duplicate suppression
-- ===========================================================================
-- The first submit must be accepted; the guard must not block a legitimate order.
SELECT pg_temp.check('the first submit is accepted',
  pg_temp.try_insert('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',250),
  'inserted');

SELECT pg_temp.check('identical re-submit is suppressed',
  (SELECT CASE WHEN pg_temp.try_insert('11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',250) ~ '^raised:DUPLICATE_ORDER:'
   THEN 'raised' ELSE 'inserted' END), 'raised');

SELECT pg_temp.check('suppression message carries the existing order id',
  (SELECT CASE WHEN pg_temp.try_insert('11111111-1111-1111-1111-111111111111',
     '22222222-2222-2222-2222-222222222222',250) ~ '^raised:DUPLICATE_ORDER:[0-9a-f-]{36}$'
   THEN 'uuid' ELSE 'other' END), 'uuid');

SELECT pg_temp.check('the reported id is the order that already exists',
  (SELECT CASE WHEN (SELECT regexp_replace(pg_temp.try_insert('11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',250), '^raised:DUPLICATE_ORDER:',''))
     = (SELECT id::text FROM public.orders WHERE customer_id='11111111-1111-1111-1111-111111111111'
        AND total=250) THEN 'same' ELSE 'different' END), 'same');

SELECT pg_temp.check('a different total is NOT suppressed',
  pg_temp.try_insert('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',999),
  'inserted');

SELECT pg_temp.check('a different customer is NOT suppressed',
  pg_temp.try_insert('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222',250),
  'inserted');

SELECT pg_temp.check('a different address is NOT suppressed',
  pg_temp.try_insert('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',250,
     'pending_payment','0 seconds','0911','Kuriftu'), 'inserted');

SELECT pg_temp.check('a >2 minute old order is NOT suppressed',
  pg_temp.try_insert('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222',250,
     'pending_payment','5 minutes'), 'inserted');

SELECT pg_temp.check('an order already moved on cannot block a new one',
  pg_temp.try_insert('55555555-5555-5555-5555-555555555555','77777777-7777-7777-7777-777777777777',300,'confirmed'),
  'inserted');

SELECT pg_temp.check('...and the next identical submit is accepted',
  pg_temp.try_insert('55555555-5555-5555-5555-555555555555','77777777-7777-7777-7777-777777777777',300),
  'inserted');

SELECT pg_temp.check('a non-checkout status is never suppressed',
  pg_temp.try_insert('66666666-6666-6666-6666-666666666666','22222222-2222-2222-2222-222222222222',111,'delivered'),
  'inserted');

-- ===========================================================================
-- 2. cancel_order behaviour
-- ===========================================================================
INSERT INTO public.orders (id, customer_id, shop_id, status, total, customer_phone, delivery_address)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222','confirmed',250,'0911','Bishoftu');

SET test.uid = '11111111-1111-1111-1111-111111111111';
SELECT pg_temp.check('customer cancels own order',
  pg_temp.try_cancel('aaaaaaaa-0000-0000-0000-000000000001','  Changed my mind  '), 'ok');

SELECT pg_temp.check('reason is recorded and trimmed',
  (SELECT cancel_reason FROM public.orders WHERE id='aaaaaaaa-0000-0000-0000-000000000001'),
  'Changed my mind');

INSERT INTO public.orders (id, customer_id, shop_id, status, total, customer_phone, delivery_address)
VALUES ('aaaaaaaa-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222','confirmed',250,'0911','Bishoftu');
SELECT pg_temp.check('whitespace-only reason becomes NULL',
  (SELECT CASE WHEN pg_temp.try_cancel('aaaaaaaa-0000-0000-0000-000000000002','   ') = 'ok'
     AND (SELECT cancel_reason IS NULL FROM public.orders
           WHERE id='aaaaaaaa-0000-0000-0000-000000000002')
   THEN 'null' ELSE 'not-null' END), 'null');

INSERT INTO public.orders (id, customer_id, shop_id, status, total, customer_phone, delivery_address)
VALUES ('aaaaaaaa-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222','confirmed',250,'0911','Bishoftu');
SELECT pg_temp.check('omitted reason becomes NULL',
  (SELECT CASE WHEN pg_temp.try_cancel('aaaaaaaa-0000-0000-0000-000000000003', NULL) = 'ok'
     AND (SELECT cancel_reason IS NULL FROM public.orders
           WHERE id='aaaaaaaa-0000-0000-0000-000000000003')
   THEN 'null' ELSE 'not-null' END), 'null');

-- ===========================================================================
-- 3. cancel_order authorization (must never widen access)
-- ===========================================================================
INSERT INTO public.orders (id, customer_id, shop_id, status, total, customer_phone, delivery_address)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001','99999999-9999-9999-9999-999999999999',
        '22222222-2222-2222-2222-222222222222','confirmed',250,'0911','Bishoftu');

SET test.uid = '11111111-1111-1111-1111-111111111111';
SELECT pg_temp.check('a different customer CANNOT cancel it',
  (CASE WHEN pg_temp.try_cancel('bbbbbbbb-0000-0000-0000-000000000001','x') ~ '^raised:' THEN 'refused' ELSE 'cancelled' END),
  'refused');
SELECT pg_temp.check('...and the order is untouched',
  (SELECT status FROM public.orders WHERE id='bbbbbbbb-0000-0000-0000-000000000001'), 'confirmed');

SET test.uid = '';
SELECT pg_temp.check('anonymous CANNOT cancel',
  (CASE WHEN pg_temp.try_cancel('bbbbbbbb-0000-0000-0000-000000000001','x') ~ '^raised:' THEN 'refused' ELSE 'cancelled' END),
  'refused');

SET test.owns_shop = '22222222-2222-2222-2222-222222222222';
SET test.uid = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
SELECT pg_temp.check('shop owner CAN cancel',
  pg_temp.try_cancel('bbbbbbbb-0000-0000-0000-000000000001','out of stock'), 'ok');
SET test.owns_shop = '';

SET test.is_admin = '1';
INSERT INTO public.orders (id, customer_id, shop_id, status, total, customer_phone, delivery_address)
VALUES ('bbbbbbbb-0000-0000-0000-000000000002','99999999-9999-9999-9999-999999999999',
        '22222222-2222-2222-2222-222222222222','confirmed',250,'0911','Bishoftu');
SELECT pg_temp.check('admin CAN cancel',
  pg_temp.try_cancel('bbbbbbbb-0000-0000-0000-000000000002','duplicate'), 'ok');
SET test.is_admin = '';

INSERT INTO public.orders (id, customer_id, shop_id, status, total, customer_phone, delivery_address)
VALUES ('bbbbbbbb-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222','delivered',250,'0911','Bishoftu');
SET test.uid = '11111111-1111-1111-1111-111111111111';
SELECT pg_temp.check('a delivered order CANNOT be cancelled',
  (CASE WHEN pg_temp.try_cancel('bbbbbbbb-0000-0000-0000-000000000003','x') ~ '^raised:' THEN 'refused' ELSE 'cancelled' END),
  'refused');

INSERT INTO public.orders (id, customer_id, shop_id, status, total, customer_phone, delivery_address)
VALUES ('bbbbbbbb-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222','cancelled',250,'0911','Bishoftu');
SELECT pg_temp.check('an already-cancelled order CANNOT be re-cancelled',
  (CASE WHEN pg_temp.try_cancel('bbbbbbbb-0000-0000-0000-000000000004','x') ~ '^raised:' THEN 'refused' ELSE 'cancelled' END),
  'refused');

-- ===========================================================================
-- 4. delivered_at
-- ===========================================================================
INSERT INTO public.orders (id, customer_id, shop_id, status, total, customer_phone, delivery_address)
VALUES ('bbbbbbbb-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222','on_the_way',250,'0911','Bishoftu');
SELECT pg_temp.check('delivered_at is NULL before delivery',
  (SELECT CASE WHEN delivered_at IS NULL THEN 'null' ELSE 'set' END
     FROM public.orders WHERE id='bbbbbbbb-0000-0000-0000-000000000005'), 'null');

UPDATE public.orders SET status='delivered' WHERE id='bbbbbbbb-0000-0000-0000-000000000005';
SELECT pg_temp.check('delivered_at is stamped on the transition to delivered',
  (SELECT CASE WHEN delivered_at IS NOT NULL THEN 'set' ELSE 'null' END
     FROM public.orders WHERE id='bbbbbbbb-0000-0000-0000-000000000005'), 'set');

CREATE TEMP TABLE _before AS
  SELECT delivered_at FROM public.orders WHERE id='bbbbbbbb-0000-0000-0000-000000000005';
UPDATE public.orders SET delivery_address='Bishoftu 2'
  WHERE id='bbbbbbbb-0000-0000-0000-000000000005';
SELECT pg_temp.check('a later update does not overwrite it',
  (SELECT CASE WHEN (SELECT delivered_at FROM public.orders
                      WHERE id='bbbbbbbb-0000-0000-0000-000000000005')
                    IS NOT DISTINCT FROM (SELECT delivered_at FROM _before)
   THEN 'stable' ELSE 'changed' END), 'stable');

-- Re-saving a delivered order must not move the timestamp forward.
UPDATE public.orders SET delivery_address='Bishoftu 3'
  WHERE id='bbbbbbbb-0000-0000-0000-000000000005';
SELECT pg_temp.check('re-saving a delivered order keeps the original stamp',
  (SELECT CASE WHEN (SELECT delivered_at FROM public.orders
                      WHERE id='bbbbbbbb-0000-0000-0000-000000000005')
                    IS NOT DISTINCT FROM (SELECT delivered_at FROM _before)
   THEN 'stable' ELSE 'changed' END), 'stable');

SELECT pg_temp.check('cancelling does not stamp delivered_at',
  (SELECT CASE WHEN delivered_at IS NULL THEN 'null' ELSE 'set' END
     FROM public.orders WHERE id='bbbbbbbb-0000-0000-0000-000000000004'), 'null');

-- ===========================================================================
-- 5. Privileges
-- ===========================================================================
SELECT pg_temp.check('anon cannot execute cancel_order',
  has_function_privilege('anon','public.cancel_order(uuid,text)','EXECUTE')::text, 'false');
SELECT pg_temp.check('authenticated can execute cancel_order',
  has_function_privilege('authenticated','public.cancel_order(uuid,text)','EXECUTE')::text, 'true');
SELECT pg_temp.check('anon cannot execute the duplicate trigger fn',
  has_function_privilege('anon','public.prevent_duplicate_orders()','EXECUTE')::text, 'false');
SELECT pg_temp.check('authenticated cannot execute the trigger fn either',
  has_function_privilege('authenticated','public.prevent_duplicate_orders()','EXECUTE')::text, 'false');

\echo ''
\echo '================ SUMMARY ================'
SELECT (CASE WHEN ok THEN 'PASS  ' ELSE 'FAIL  ' END || name ||
        CASE WHEN ok THEN '' ELSE '   [got ' || got || ', want ' || want || ']' END)
  FROM pg_temp.results ORDER BY n;
SELECT 'TOTAL ' || count(*) || '   PASS ' || count(*) FILTER (WHERE ok)
     || '   FAIL ' || count(*) FILTER (WHERE NOT ok)
  FROM pg_temp.results;
