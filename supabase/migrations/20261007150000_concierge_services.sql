-- Concierge services: errands, bill payments and parcels.
--
-- These three are what Tona and Bishoftu Delivery advertise and we did not have.
-- They are all the same shape of job — the customer describes it, an admin quotes
-- a price, the customer accepts and pays — which is exactly what the existing
-- `service_requests` flow already does. So this is a data migration: three new
-- categories and fifteen services, no new tables and no new code paths.
--
-- That matters because it means the whole feature rides on machinery that is
-- already tested (review_service_request -> accept_service_quote ->
-- place_service_order) and already carries order_type='service', so these jobs
-- appear in the normal order list, get a normal order code and go through the
-- normal payment gate.
--
-- Pricing is `quote` for anything variable (a grocery run, an electricity bill,
-- a fragile parcel) and `fixed` only where the price genuinely does not move
-- (a document courier inside town). Quoting everything would be lazy; quoting
-- nothing would under-charge on the variable jobs.
--
-- Idempotent: both inserts are ON CONFLICT (slug) DO NOTHING, so re-running is
-- safe and it will not overwrite anything an admin has since edited.

INSERT INTO public.service_categories (slug, name, tagline, description, sort_order) VALUES
  ('errands', 'Errands & Tasks',
   'Hand us your to-do list',
   'Grocery runs, queue standing, document pickup and drop, pharmacy runs and any custom task around Bishoftu. Tell us what you need done and we send a rider.',
   6),
  ('bill-payments', 'Bill Payments',
   'Pay without leaving home',
   'Electric, water, telephone and internet bills, school fees and other payments. Share the account number and we pay it, then bring you the receipt.',
   7),
  ('parcels', 'Parcels & Courier',
   'Send anything across Bishoftu',
   'Documents, small packages, fragile items and bulk loads, picked up from your door and delivered across the city the same day.',
   8)
ON CONFLICT (slug) DO NOTHING;

-- Services. `service_category_id` is resolved by slug rather than a hardcoded
-- uuid, so this works regardless of what ids the live project assigned.
INSERT INTO public.services (
  slug, name, service_category_id, pricing_type, price,
  description, lead_time_hours, sort_order, is_active
)
SELECT v.slug, v.name, c.id, v.pricing_type, v.price::numeric,
       v.description, v.lead_time_hours::int, v.sort_order::int, true
FROM (VALUES
  -- Errands & Tasks
  ('errand-grocery-run', 'Grocery run', 'errands', 'quote', NULL,
   'Send us your shopping list and we buy it from any Bishoftu market or supermarket and deliver it to your door. You pay for the goods plus a service fee.', 2, 1),
  ('errand-queue-standing', 'Queue standing', 'errands', 'quote', NULL,
   'We stand in the queue for you — bank, government office, ticket counter — and bring back whatever you needed done.', 4, 2),
  ('errand-document-pickup', 'Document pickup & drop', 'errands', 'fixed', 100,
   'We collect a document from one address in Bishoftu and deliver it to another, the same day.', 2, 3),
  ('errand-pharmacy-run', 'Pharmacy run', 'errands', 'quote', NULL,
   'Send us the prescription or the medicine name and we collect it from a Bishoftu pharmacy and bring it to you.', 2, 4),
  ('errand-custom', 'Custom errand', 'errands', 'quote', NULL,
   'Anything else you would rather not do yourself. Describe the task and we quote it before we start.', 4, 5),

  -- Bill Payments
  ('bill-electric', 'Electric bill', 'bill-payments', 'quote', NULL,
   'Share your meter or account number and the amount, and we pay your electric bill and bring the receipt.', 24, 1),
  ('bill-water', 'Water bill', 'bill-payments', 'quote', NULL,
   'We pay your water bill at the Bishoftu office and deliver the stamped receipt to you.', 24, 2),
  ('bill-telephone', 'Telephone & internet', 'bill-payments', 'quote', NULL,
   'Ethio Telecom, Safaricom and internet bill payments, paid for you and receipted.', 24, 3),
  ('bill-school-fees', 'School fees', 'bill-payments', 'quote', NULL,
   'We pay school or college fees at the bursar and bring back the official receipt.', 48, 4),
  ('bill-other', 'Other payment', 'bill-payments', 'quote', NULL,
   'Rent, association dues, TV subscriptions or any other payment you need made on your behalf.', 48, 5),

  -- Parcels & Courier
  ('parcel-document', 'Document courier', 'parcels', 'fixed', 80,
   'One envelope or document file, picked up from your door and delivered anywhere in Bishoftu the same day.', 2, 1),
  ('parcel-small-package', 'Small package', 'parcels', 'fixed', 120,
   'A small box or bag up to about 5 kg, collected and delivered across the city.', 2, 2),
  ('parcel-fragile', 'Fragile item', 'parcels', 'quote', NULL,
   'Glassware, electronics, cake boxes and anything that needs careful handling. We quote after seeing the item.', 3, 3),
  ('parcel-food', 'Food package', 'parcels', 'quote', NULL,
   'Send a cooked meal or food package to family or a friend anywhere in Bishoftu while it is still warm.', 2, 4),
  ('parcel-bulk', 'Bulk / multiple packages', 'parcels', 'quote', NULL,
   'Several packages or one heavy load. Tell us the count and we quote per drop.', 4, 5)
) AS v(slug, name, cat_slug, pricing_type, price, description, lead_time_hours, sort_order)
JOIN public.service_categories c ON c.slug = v.cat_slug
ON CONFLICT (slug) DO NOTHING;
