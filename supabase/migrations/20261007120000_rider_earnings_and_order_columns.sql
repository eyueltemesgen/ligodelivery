-- Fix two schema gaps found by the widened `schema-drift.mjs`.
--
-- 1. `rider_earnings.updated_at` was never created, but a trigger writes it.
--    20260819181500 creates the table without the column; 20260901235243 then
--    re-declares it with `CREATE TABLE IF NOT EXISTS`, which is a no-op against
--    an existing table, so `updated_at` is silently absent — while the same
--    file installs `rider_earnings_updated`, whose function does
--    `NEW.updated_at = now()`. Every UPDATE on rider_earnings therefore fails
--    with `record "new" has no field "updated_at"`, which breaks marking an
--    earning as paid and the whole payout flow on a migration-built database.
--    (The live project has the column, so this only bites a rebuild — but it
--    bites hard, and silently, because the table still reads fine.)
--
-- 2. `orders.delivery_duration_s` and `orders.delivery_source` exist on live but
--    no migration adds them. No current app code reads them, so this is parity
--    rather than a live break, but leaving them out keeps the drift report
--    noisy and hides the next real gap.
--
-- Idempotent, so it is safe against the live project where both already exist.

ALTER TABLE public.rider_earnings ADD COLUMN IF NOT EXISTS updated_at timestamptz;
-- Backfill before the NOT NULL, or the ALTER would fail on any existing row.
UPDATE public.rider_earnings SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.rider_earnings ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.rider_earnings ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_duration_s integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_source text;
