-- Withdraw the "Queue standing" concierge service.
--
-- The row was seeded by 20261007150000_concierge_services.sql and is already
-- live. Deactivate rather than delete so any service_request that references it
-- keeps its foreign key, and so the decision is reversible from the admin.
--
-- The app also filters this slug out client-side (RETIRED_SERVICE_SLUGS in
-- src/lib/service-catalog.ts), so the service disappears immediately even
-- before this migration is applied.
--
-- Additive and idempotent: safe to re-run.

UPDATE public.services
SET is_active = false,
    updated_at = now()
WHERE slug = 'errand-queue-standing'
  AND is_active IS DISTINCT FROM false;
