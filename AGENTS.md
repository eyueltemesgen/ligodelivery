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

## Brand: የኔ Go (Yene Go)
- The platform was rebranded from "Ligo" to **የኔ Go** (English reference: Yene Go), tagline *Fast. Local. Delivered.*
- Internal identifiers are intentionally preserved for safety: routes, DB tables/columns, storage bucket `ligo-media`, CSS utilities `container-ligo`, theme localStorage key `ligo-theme`, and `src/components/ligo/*` paths. Do not rename these for cosmetic reasons.
- Live brand copy lives in `public.settings` key `site_content` (and `contact`). The read layer `src/lib/content.ts` normalizes legacy `Ligo*` values and placeholder `ligo` banners to the new brand so the UI is correct even before `supabase/migrations/20261003140000_rebrand_yene_go.sql` is applied. Applying that migration is still recommended.
- The header logo is an uploaded image (`site_content.logo_url`) rendered via `StorageImage`; the fallback wordmark/monogram is in `src/components/Logo.tsx`. Amharic glyphs rely on "Noto Sans Ethiopic", added as a fallback in `src/styles.css` and loaded from Google Fonts in `src/routes/__root.tsx`.
- Favicon/app icons live in `public/` (`favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`) with `public/manifest.webmanifest`.

## Special Moments
- Enhancement on top of the existing marketplace (no rebuild): gifts, surprises, holiday gifts, catering and decoration services, all admin-managed from the DB.
- Routes: `src/routes/special-moments.index.tsx` (hub `/special-moments`), `special-moments.category.$slug.tsx`, `special-moments.service.$serviceId.tsx`, `special-moments.search.tsx`; customer requests at `src/routes/account.service-requests.index.tsx` and `account.service-requests.$requestId.tsx`.
- Data layer: `src/lib/special-moments.ts` (queries, `createServiceRequest`, `acceptServiceQuote`, `placeServiceOrder`, `addonsTotal`, status constants). Presentation metadata: `src/lib/service-catalog.ts`. UI: `src/components/special-moments/{ServiceCards,ServiceRequestDialog}.tsx`; admin console `src/components/admin/SpecialMomentsAdmin.tsx` (wired as the `special-moments` tab in `admin.ops.tsx`).
- Migration `supabase/migrations/20261003160000_special_moments.sql` is additive/idempotent: tables `service_categories`, `services`, `service_addons`, `service_requests`; adds `orders.order_type`/`scheduled_for`/`service_request_id`; RPCs `review_service_request`, `accept_service_quote`, `place_service_order`. Must be applied before the feature works — reads degrade to empty, writes surface a clear error until then.
- Flow reuses the existing order + payment pipeline: fixed-price bookings pay the service price, quote requests go `quote_requested → quoted → accepted → paid`. Service orders carry `order_type='service'` and a linked `service_request_id`, so `place_order` (products) is untouched.
- Security: `service_requests` is INSERT-only for customers via RLS; status/quote/order changes go through the SECURITY DEFINER RPCs. `service_categories`/`services`/`service_addons` are publicly readable when active and writable by admins or the linked shop owner (`owns_shop`).

## Admin Reports & Exports
- Route: `src/routes/admin.reports.tsx` (`/admin/reports`, guarded by the `/admin` layout plus an explicit `AdminGate`); the Finance group in `src/components/admin/AdminShell.tsx` links to it under the `shell_reports` key. UI: `src/components/admin/ReportsAdmin.tsx`.
- Single source of truth: `src/lib/reports.server.ts` `generateReport()` aggregates real tables into one `ReportPayload`; the dashboard, Excel and PDF all render from it so on-screen and exported figures match. `src/lib/reports.ts` is client-safe (types, `resolvePeriod`, `buildBuckets`, labels). `src/lib/reports.functions.ts` exposes admin-verified server functions. `report-excel.ts` (ExcelJS) and `report-pdf.ts` (jsPDF + autotable) are server-only, dynamically imported.
- Timezone Africa/Addis_Ababa (+03:00) via `resolvePeriod`; granularity adapts (today→hour, week/month/custom→day, year→month). Delivered orders only count as sales; `netRevenue = delivered sales - refunds`.
- Report history is optional: `supabase/migrations/20261003170000_report_history.sql` (admin-only RLS). Reads degrade gracefully and recording is best-effort, so the dashboard works before the migration is applied.
- Added deps: `exceljs`, `jspdf`, `jspdf-autotable`. `recharts` (already present) renders the on-screen charts.

## Layout gotcha: overlapping content must stack above media
- `StorageImage` renders a `relative` wrapper (positioned), so any sibling block that is *pulled up* over it with a negative margin must itself be positioned. Otherwise CSS paint order draws the positioned image above the non-positioned block, hiding the block's top (e.g. a shop name in a card overlapping the cover).
- On the shop detail page (`src/routes/shops.$shopId.tsx`) the card uses `container-ligo relative z-10 -mt-10` for exactly this reason. Keep the `relative z-10` when touching that overlap.

## Language switcher (English / አማርኛ / Afaan Oromoo)
- Copy lives in `src/lib/locales/{en,am,or}.ts`, re-exported by `src/lib/i18n.ts` (`translations.en`, `LANGUAGES`, `LANGUAGE_LABELS`, `HTML_LANG`, `TranslationKey`). Add new UI strings there, not inline. English is imported eagerly; Amharic/Oromo are code-split behind `import()` and fetched on demand by `useLanguage` — keep it that way so the initial bundle stays small.
- Provider/hook: `src/hooks/useLanguage.tsx` — mirrors `useTheme`; persists to `localStorage` key `ligo-lang` and sets `<html lang>`. Defaults to English unless the browser language starts with `am`, `om`/`or`.
- Button: `src/components/LanguageToggle.tsx`, rendered in the header next to `ThemeToggle`; options are generated from `LANGUAGES`.
- Internal language code for Oromo is `or` (avoids clashing with the `or` operator) but `<html lang>` uses the correct BCP-47 `om` via `HTML_LANG`.
- Wired through `src/components/layout/SiteHeader.tsx`, `SiteFooter.tsx`, and `src/routes/index.tsx` only. It is purely additive — do not replace DB-driven content (e.g. `site_content` hero/brand copy) with translation keys.
- DB-driven copy still needs a localized fallback: `src/routes/index.tsx` uses a `copy(field, key)` helper that shows the admin's `site_content` value when it differs from `DEFAULT_CONTENT`, and otherwise `t(key)` from `content_*` keys. Rendering `c?.field` directly leaves the home page in English for am/or visitors, because `DEFAULT_CONTENT` is English-only. Add `content_*` keys for any new `site_content` field rendered on the storefront.
- Dynamic DB rows (shop/product/category names, descriptions) stay English in every language — there is no `content_translations` table on the live DB, so `src/lib/i18n/content.ts` from the pre-#9 branch does not exist. Do not re-add it without applying its migration first.
- UI copy is fully localized: JSX text, `aria-label`/`title`/`alt`/`placeholder`, toasts, and route `head` metadata all go through `t("key")` or `translations.en.<key>`. Keep the three blocks in `src/lib/i18n.ts` in exact key parity; `TranslationKey` is `keyof typeof translations.en`.
- Reusable localization helpers: `mediaErrorKey(err)` (`src/lib/media.tsx`), `closedReason(shop, hours)` (`src/lib/hours.ts`), `paymentLabelKey`/`paymentStatusLabel` (`src/components/account/OrderCard.tsx`), `supabaseErrorText(t, err)` (`src/lib/supa-error.ts`, translate non-API errors). Prefer these over inline literals.
- Static config maps (ad types/statuses, banner placements, service categories, merchant statuses) expose i18n keys rather than English labels.
- Special Moments category rows are seeded with English `name`/`tagline`/`description`. Render them through `categoryDisplayName(t, category)` / `categoryDisplayTagline(t, category)` (`src/lib/service-catalog.ts`), which substitute the translated `smcat_*` copy for untouched seed values while leaving admin edits and custom categories verbatim. Rendering `category.name` directly leaves the hub/category/search pages in English for am/or visitors.

## Performance conventions

- Images: render through `StorageImage` (`src/lib/media.tsx`) with a `width` prop so the signed URL hits Supabase's image renderer. Signed URLs are cached per (bucket, path, width) and untransformed images are batch-signed; do not add per-image `createSignedUrl` calls elsewhere. `createSignedUrls` cannot carry transforms, so sized images sign individually by design.
- Toasts: import `toast` from `src/lib/toast`, never from `sonner` directly. `src/lib/toast.tsx` lazy-loads sonner and its `<Toaster>` host on the first toast, keeping ~14 kB gzip out of every route. `ToastHost` is mounted once in `src/routes/__root.tsx`.
- Public catalogue queries in `src/lib/queries.ts` carry explicit `staleTime` and a `limit` (`SHOP_PAGE_SIZE`, `PRODUCT_PAGE_SIZE`). Keep new list queries bounded; add `staleTime` for anything public.
- Indexes for hot read paths live in `supabase/migrations/20261004190000_performance_indexes.sql` (additive/idempotent, apply via Lovable/Supabase).

## Delivery Fee Engine & Menu System
- Migration: `supabase/migrations/20261004200000_delivery_fee_engine.sql` (additive/idempotent). Apply before deploying the matching app build.
- Single source of truth: `public.calculate_delivery_fee(shop_id, lat, lng)` returns `{ok,distance,delivery_fee,pricing_rule}` or `{ok:false,reason}` (`customer_location_unavailable`, `shop_location_unavailable`, `outside_service_area`, `no_rule`). Never compute a fee in the client; `src/lib/delivery.ts` only displays what the RPC returns.
- Pricing methods: `delivery_fee_rules` brackets (admin CRUD, CHECK forbids inverted ranges) or `base+km` in `settings.delivery`. Distance is road distance from OSRM, falling back to haversine.
- Road routing: `routeBetweenFn` in `src/lib/routing.functions.ts` is an authenticated server function that calls OSRM (`OSRM_URL`, default `router.project-osrm.org`), 5 s timeout, 10 min in-memory cache, and returns `{ ok: false }` on any failure. It resolves the origin from `shops.lat/lng` when given a `shopId`, so a client cannot fake a nearby shop. Client wrapper `src/lib/routing.ts` de-dupes in-flight requests and falls back to haversine, tagging results `source: "road" | "straight_line"`.
- `calculate_delivery_fee(shop, lat, lng, p_road_distance_km?)` uses the road distance only when it is plausible (`>= haversine` and `<= haversine*4+5`); otherwise haversine. This keeps the fee authoritative even though the road distance comes from the client. Returns `distance_source` alongside `distance`/`delivery_fee`/`pricing_rule`.
- Orders snapshot `delivery_distance`, `delivery_rule`, `delivery_source` ('road'|'straight_line'|'flat') and `delivery_duration_s`; historical orders are never recalculated. `place_order` takes optional `p_road_distance_km`/`p_delivery_duration_s`.
- Checkout and the order maps label a fallback as "estimated distance" and never present a straight line as an exact road distance. Rider routes (`OrderMap`, `RiderTrackingMap`) draw the real OSRM geometry, debounced, and draw nothing if routing is down.
- `place_order` re-prices option deltas and recomputes subtotal/delivery/total server-side, then snapshots `delivery_distance`, `delivery_rule`, `shop_lat/lng`, `customer_lat/lng` on the order. Historical orders are never recalculated.
- Shops without lat/lng fall back to their flat `shops.delivery_fee`; checkout also falls back to the flat fee if the RPC is missing.
- Product options live in `product_option_groups` + `product_options`; cart lines are keyed by `productId + option ids` (`lineId` in `src/lib/cart.tsx`).
- Admin: Delivery Fees tab, shop map location picker, product option editor. All new UI is translated in en/am/or.

## Account layout

- `AccountShell` (`src/components/account/AccountShell.tsx`) is a grid whose first column is the `<aside>` holding the profile card and the mobile pill nav. The `<aside>` must keep `min-w-0`: grid items default to `min-width:auto`, and the non-shrinkable pill row would otherwise force the column to ~891px and make every `/account/*` page scroll sideways on phones (measured 923px scrollWidth at a 500px viewport). Verify fixes with `document.documentElement.scrollWidth === clientWidth` at a narrow viewport.

## Advertisements

- The live storefront ad system is **`banners`** (`bannersQuery` in `src/lib/content.ts`), rendered by `AdCarousel` (`src/components/ligo/AdCarousel.tsx`) through the `BannerSlot` wrapper. It auto-rotates active banners for a placement in one fixed-size slot: 3s per ad, crossfade, dots, swipe, hover-pause, reduced-motion off, and 0/1/N handling (0 hides the slot). Admin CRUD is `BannersAdmin` in `admin.ops.tsx` (Banners tab).
- `BANNER_PLACEMENTS` in `src/lib/content.ts` is the canonical placement list — a placement is just a free-text `banners.placement` value, so adding one needs no migration. Special Moments promotion is done the same way as any other placement: create a real banner with `placement = "special_moments"` (the Special Moments page renders that slot; homepage uses `home_hero`). There is no built-in/house promo slide.
- There is a **second, dead ad system**: `src/lib/ads.ts` + `src/components/ligo/AdSlot.tsx` + `src/components/admin/AdvertisingHub.tsx`. `AdvertisingHub` is not imported by any route and `adsQuery` queries columns (`placement`, `destination_url`, `cta_label`, …) that do not exist on the live `ads` table (it actually has `placement_key`, `link_value`, `link_type`, …). This is the source of the only `tsc` errors in the repo — do not wire it up without fixing the schema mapping first.
- Banner image sizing: `StorageImage` uses Supabase's render transform via the signed URL, so different `width` props produce differently-sized signed URLs. The homepage hero passes `width={1080}`, slot placements default to `768`.

## Shop hours

- Canonical default window lives in `src/lib/hours.ts` (`DEFAULT_OPEN_HOUR = "07:00"`, `DEFAULT_CLOSE_HOUR = "22:00"`). Use those constants, never literals, for the fallback window in editors, merchant onboarding and fallback shop data.
- The DB column defaults for `shops`/`merchant_profiles`/`shop_hours` and the `submit_merchant_application` RPC fallback are set by `supabase/migrations/20261004210000_comfortable_bishoftu_hours.sql` (additive/idempotent; only rewrites rows still on the untouched 08:00–21:00 default). It must be applied through the Lovable/Supabase pipeline — a code deploy alone does not update existing rows.
- `isShopOpenNow` (`src/lib/hours.ts`) prefers per-day `shop_hours` rows, then falls back to the shop-level `opens_at`/`closes_at`. `isShopOpen` in `src/lib/format.ts` is the simpler card-level check.

## Rider portal

- `/rider` is a self-contained app shell: it renders its own sticky header and 5-tab bottom bar, and `src/routes/__root.tsx` hides `SiteHeader`/`SiteFooter`/`MobileTabBar` for that exact path only. `/rider/join` and `/rider/login` keep the storefront chrome so riders can navigate back. Do not widen the bare-path check to `startsWith("/rider")`.
- Rider queries, realtime channels, the throttled 5 s GPS writer, `accept_order` and `complete_delivery` RPCs, and the `rider_offer_events` decline upsert all live in `RiderPortal` (`src/routes/rider.index.tsx`). Components are presentational and receive data/handlers as props — keep DB access in the orchestrator.
- Available orders are polled every 10 s as a fallback: a rider stops receiving realtime events for an order the moment another rider accepts it (RLS hides the row).
- `RiderTrackingMap` draws the real OSRM route via `getRoute` and is lazily imported on the rider portal; it is not rendered during SSR.
- Rider-facing copy uses `rd_*` keys; `rd_earnings` labels the wallet tab, and `md_tab_earnings` is the shorter "Earnings" tab label. Keep en/am/or key parity (verified with a script that diffs `^  key:` lines across the three files).

## Payment gate & order tracking

- Orders must not be fulfilled before payment. The single gate is `public.approve_and_dispatch(uuid)`: it refuses to dispatch a non-cash order unless `payment_status = 'paid'` (set by the admin's "Mark payment as verified" action or a receipt approval), and it sets `app.order_internal = '1'` so the column guard allows the dispatch write. Never add a raw `orders.update({ status: 'dispatched' })` fallback — that would deliver an unpaid order.
- `orders_guard_update` blocks a non-admin from changing `status` on a non-cash order that is not paid (only `cancelled` is exempt), and blocks every non-admin write to `payment_status`/amounts/`rider_id`/`delivery_pin`. `accept_order` and `complete_delivery` therefore set `app.order_internal = '1'` before their updates. `complete_delivery` also requires the order to be `on_the_way`/`picked_up` and marks cash orders `paid`.
- All three RPCs are defined in the final migrations as `RETURNS void`, but the current code returns `public.orders`. `CREATE OR REPLACE FUNCTION` cannot change a return type, so the migration that fixes them must `DROP FUNCTION IF EXISTS public.<name>(<args>);` first (see `supabase/migrations/20261005120000_payment_gate_and_tracking.sql`).
- Customer live tracking needs the `riders_select_assigned` RLS policy: it lets a customer read the `riders` row for the rider assigned to their own order (`order.rider_id`). Without it the order page's `riders` query returns null and no marker shows. The order page also polls the rider every 15 s and subscribes to `riders` realtime updates as a fallback.
- UI mirrors the gate so users get a disabled button and an explanation instead of a raw DB error: `admin.ops.tsx` (Approve & Dispatch) and `merchant.tsx` (accept/prepare) both disable the action when `payment_method !== 'cash' && payment_status !== 'paid'`.
