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
