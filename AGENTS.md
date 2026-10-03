<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Public backend URL and publishable key are baked into vite.config.ts `define` as a fallback, because published builds have shipped without VITE_* env vars and blanked the site.

## Customer Account Center
- Routes: `src/routes/account.*.tsx` (`/account`, `/account/orders`, `/account/orders/$orderId`, `/account/wishlist`, `/account/addresses`, `/account/profile`, `/account/notifications`, `/account/help`). Legacy `/orders`, `/orders/$orderId`, `/notifications` are redirect shims.
- Shell + nav: `src/components/account/AccountShell.tsx` (desktop sidebar, mobile horizontal pill nav). Shared async UI: `src/components/account/States.tsx`.
- Data layer: `src/lib/account.ts` (typed queries). Saved products/shops: `src/lib/saved.tsx` (tolerates missing `wishlist`/`shop_favorites` tables). Supabase error helpers: `src/lib/supa-error.ts`.
- Migrations are additive and idempotent: `supabase/migrations/20260908120000_account_center.sql` (addresses city/area/updated_at, single-default trigger, wishlist, shop_favorites, notifications).
- No local DB credentials. Migrations must be applied through Lovable/Supabase before dependent features work. Verify live functions before relying on them.
- `public.place_order` on the live DB had an unguarded `DELETE FROM _po_items;` (no WHERE) that Supabase safeupdate rejects; fix is `supabase/migrations/20260908130000_fix_place_order_safe_delete.sql` and must be applied for checkout to succeed.
- Address "set default" is also enforced client-side (clear other defaults before setting), so exactly one default holds even before the DB trigger migration is applied.

## Special Moments (Surprises, Gifts, Catering, Decoration)
- Migration: `supabase/migrations/20260910090000_special_moments.sql` (additive + idempotent). Adds `service_categories`, `services`, `service_options`, `service_requests`, `service_request_items`, an `orders.order_type` discriminator (`product`/`delivery`/`service`, existing rows default `product`), RLS, request-lifecycle notifications, and a `services/` storage policy. Must be applied through Lovable/Supabase before the feature works live.
- RPCs (server-authoritative, `SECURITY DEFINER`): `submit_service_request(...)` validates the service, guest bounds, schedule and location, recomputes totals from the catalogue (never trusts client prices), writes request + line items; `accept_service_quote(request_id)` turns a quoted request into a real `orders` row with `order_type='service'` + `order_items`; `cancel_service_request(request_id)` withdraws before confirmation.
- `service_requests_guard` keeps `total`/`subtotal` in step with `quoted_amount` and blocks non-admin price tampering; the internal-update `set_config('app.service_internal', ...)` flag is reset to `'0'` after use so it does not leak across a transaction.
- Data layer: `src/lib/services.ts` (typed queries, `SERVICE_STATUS_LABEL/TONE`, `OCCASIONS`, `SERVICE_CATEGORY_META`, admin + provider queries).
- Customer routes: `/special-moments` (landing + filters), `/special-moments/$serviceId` (detail + `ServiceRequestForm`), `/account/requests` + `/account/requests/$requestId` (timeline + quote confirmation). Homepage uses `SpecialMomentsStrip`; search (`src/lib/queries.ts` + `search.tsx`) returns services too.
- Admin: `/admin/services` (Services + Requests tabs). Providers: the merchant dashboard (`/merchant`) has a Services tab (`MerchantServices`). Both reuse `src/components/ligo/ServiceEditor.tsx`; `is_featured` is admin-only (draft `allow_featured: false` hides it for providers).
- Fixed-price requests create the payable order on quote acceptance / confirmation; quote requests collect requirements first and are priced by an admin. No new payment integration — the existing order payment flow is reused via `orders`.

## Advertising (real ads + real analytics)
- Migration: `supabase/migrations/20260911090000_advertising.sql` (additive + idempotent). Adds `advertisers`, `ad_campaigns`, `ad_placements`, `ads`, `ad_impressions`, `ad_clicks`, `ad_packages`, RLS, `ads/` storage policy, and seeds the placement + package catalogue. Must be applied through Lovable/Supabase before ads serve; the client degrades to "no ads" until then.
- Step 0 of the migration reconciles a pre-existing, differently-shaped `public.ads`: because `CREATE TABLE IF NOT EXISTS` would silently skip it and every later `ads.placement_key` reference would fail with `42703`, such a table is renamed to `ads_legacy_<timestamp>` (rows and dependents preserved) so the migration can own the name. It is a no-op when `ads` is absent or already correct. Verify the renamed table is not needed, then drop it manually if desired.
- Serving: public pages render `AdSlot` (`src/components/ads/AdSlot.tsx`) with a placement key. Eligibility (active + schedule + campaign window + pause/archive + device/category/shop/product/service-type/location targeting) is resolved server-side by the `eligible_ads(...)` RPC — the client never decides what runs, and the slot renders nothing when there is no eligible ad.
- Placements in use: `HOME_TOP`, `HOME_MIDDLE`, `HOME_BOTTOM`, `SHOP_TOP`, `PRODUCT_RELATED`, `CATEGORY_TOP`, `SEARCH_TOP`, `SPECIAL_MOMENTS_TOP`. Layout (`carousel`/`grid`/`single`) and `max_ads` come from `ad_placements`.
- Analytics are real: impressions/clicks go through `record_ad_impression`/`record_ad_click` (SECURITY DEFINER; deduped to one per ad/session/placement/hour by a unique index) and are only fired on real visibility (IntersectionObserver) / real clicks. `admin_ad_analytics(from,to)` returns live counts + CTR, admin-only.
- Admin: `/admin/advertising` (tabs: Ads, Advertisers, Campaigns, Placements, Packages, Analytics) under the "Growth" nav group. Data layer: `src/lib/ads.ts`. Previews use `AdPreview`, which never records analytics.
- No fake data or fake metrics: numbers come only from recorded events and show 0 when there is none.

