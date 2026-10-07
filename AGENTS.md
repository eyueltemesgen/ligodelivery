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
- UI copy is fully localized: JSX text, `aria-label`/`title`/`alt`/`placeholder`, toasts, and route `head` metadata all go through `t("key")` or `translations.en.<key>`. Keep the three blocks in `src/lib/i18n.ts` in exact key parity; `TranslationKey` is `keyof typeof translations.en`.
- Reusable localization helpers: `mediaErrorKey(err)` (`src/lib/media.tsx`), `closedReason(shop, hours)` (`src/lib/hours.ts`), `paymentLabelKey`/`paymentStatusLabel` (`src/components/account/OrderCard.tsx`), `supabaseErrorText(t, err)` (`src/lib/supa-error.ts`, translate non-API errors). Prefer these over inline literals.
- Static config maps (ad types/statuses, banner placements, service categories, merchant statuses) expose i18n keys rather than English labels.

## Performance conventions

- Images: render through `StorageImage` (`src/lib/media.tsx`) with a `width` prop so the signed URL hits Supabase's image renderer. Signed URLs are cached per (bucket, path, width) and untransformed images are batch-signed; do not add per-image `createSignedUrl` calls elsewhere. `createSignedUrls` cannot carry transforms, so sized images sign individually by design.
- Toasts: import `toast` from `src/lib/toast`, never from `sonner` directly. `src/lib/toast.tsx` lazy-loads sonner and its `<Toaster>` host on the first toast, keeping ~14 kB gzip out of every route. `ToastHost` is mounted once in `src/routes/__root.tsx`.
- Public catalogue queries in `src/lib/queries.ts` carry explicit `staleTime` and a `limit` (`SHOP_PAGE_SIZE`, `PRODUCT_PAGE_SIZE`). Keep new list queries bounded; add `staleTime` for anything public.
- Indexes for hot read paths live in `supabase/migrations/20261004190000_performance_indexes.sql` (additive/idempotent, apply via Lovable/Supabase).

## Delivery Fee Engine & Menu System
- Migration: `supabase/migrations/20261004200000_delivery_fee_engine.sql` (additive/idempotent). Apply before deploying the matching app build.
- Single source of truth: `public.calculate_delivery_fee(shop_id, lat, lng)` returns `{ok,distance,delivery_fee,pricing_rule}` or `{ok:false,reason}` (`customer_location_unavailable`, `shop_location_unavailable`, `outside_service_area`, `no_rule`). Never compute a fee in the client; `src/lib/delivery.ts` only displays what the RPC returns.
- Pricing methods: `delivery_fee_rules` brackets (admin CRUD, CHECK forbids inverted ranges) or `base+km` in `settings.delivery`. Distance is haversine; road routing is not used.
- `place_order` re-prices option deltas and recomputes subtotal/delivery/total server-side, then snapshots `delivery_distance`, `delivery_rule`, `shop_lat/lng`, `customer_lat/lng` on the order. Historical orders are never recalculated.
- Shops without lat/lng fall back to their flat `shops.delivery_fee`; checkout also falls back to the flat fee if the RPC is missing.
- Product options live in `product_option_groups` + `product_options`; cart lines are keyed by `productId + option ids` (`lineId` in `src/lib/cart.tsx`).
- Admin: Delivery Fees tab, shop map location picker, product option editor. All new UI is translated in en/am/or.

## Payment gate & order tracking

- Orders must not be fulfilled before payment. The single gate is `public.approve_and_dispatch(uuid)`: it refuses to dispatch a non-cash order unless `payment_status = 'paid'` (set by the admin's "Mark payment as verified" action or a receipt approval), and it sets `app.order_internal = '1'` so the column guard allows the dispatch write. Never add a raw `orders.update({ status: 'dispatched' })` fallback — that would deliver an unpaid order.
- `orders_guard_update` blocks a non-admin from changing `status` on a non-cash order that is not paid (only `cancelled` is exempt), and blocks every non-admin write to `payment_status`/amounts/`rider_id`/`delivery_pin`. `accept_order` and `complete_delivery` therefore set `app.order_internal = '1'` before their updates. `complete_delivery` also requires the order to be `on_the_way`/`picked_up` and marks cash orders `paid`.
- Payment alone is not enough — the guard must also check **who** is writing the status. `20261005120000` exempted cash orders and never checked the actor, so any authenticated customer could `PATCH` their own cash order straight to `delivered` (verified live: customer self-delivered an order with `rider_id` NULL and `payment_status` `unpaid`, earning commission/payouts for a delivery nobody made). `supabase/migrations/20261005160000_order_fulfilment_authorization.sql` closes this: for non-admins, `confirmed`/`preparing`/`ready_for_pickup` require `owns_shop(shop_id)`, `accepted`/`arrived_at_merchant`/`picked_up`/`on_the_way` require the caller to be the assigned rider (`has_role(uid,'rider')`), `delivered` is RPC-only ("Deliveries are completed with the customer PIN"), `cancelled` requires the customer or shop owner, and any other transition raises. It also restores the commission columns on every non-admin write (including cancel) so a caller cannot forge them. When changing the guard, keep the admin/`app.order_internal` bypass or `approve_and_dispatch`/`accept_order`/`complete_delivery` break.
- All three RPCs are defined in the final migrations as `RETURNS void`, but the current code returns `public.orders`. `CREATE OR REPLACE FUNCTION` cannot change a return type, so the migration that fixes them must `DROP FUNCTION IF EXISTS public.<name>(<args>);` first (see `supabase/migrations/20261005120000_payment_gate_and_tracking.sql`).
- Customer live tracking needs the `riders_select_assigned` RLS policy: it lets a customer read the `riders` row for the rider assigned to their own order (`order.rider_id`). Without it the order page's `riders` query returns null and no marker shows. The order page also polls the rider every 15 s and subscribes to `riders` realtime updates as a fallback.
- Leaflet markers must use `L.divIcon`, never the default icon. `L.marker(...)` with no `icon` resolves to `marker-icon.png` relative to the Leaflet CSS, but Vite emits no such asset (the URL 404s) so the marker renders as a broken image — this is why the customer's rider marker (and the `LocationPicker` pin) never appeared on the tracking map. `OrderMap.tsx` and `LocationPicker.tsx` now draw a coloured `divIcon`; `RiderTrackingMap.tsx`/`LiveMap.tsx` already did.
- RLS policy recursion trap: `orders_select_dispatch_pool` is a policy ON `orders` that reads `riders`, so any policy ON `riders` that reads `orders` closes a cycle and Postgres fails **every** `orders` SELECT with `42P17 infinite recursion detected in policy for relation "orders"` — the customer order list errors and the tracking page renders blank. Never put a `SELECT ... FROM public.orders` directly inside a `riders` policy. Instead expose the check through a `SECURITY DEFINER` function (`public.customer_can_see_rider(uuid)`), which RLS does not re-evaluate (same pattern as `is_admin`/`has_role`). The naive policy shipped in `20261005120000` and is corrected by `20261005130000_fix_riders_tracking_recursion.sql`; both must be applied for tracking to work without breaking order reads.
- UI mirrors the gate so users get a disabled button and an explanation instead of a raw DB error: `admin.ops.tsx` (Approve & Dispatch) and `merchant.tsx` (accept/prepare) both disable the action when `payment_method !== 'cash' && payment_status !== 'paid'`.
- The order detail page (`account.orders.$orderId.tsx`) presents payment before tracking: the map renders only once `paymentSettled` (`payment_method === 'cash' || payment_status === 'paid'`). While unsettled it shows `od_tracking_locked` instead of the map, so a customer cannot watch a rider before paying.


## Rotating banners & carousels
- One reusable rotator lives in `src/components/ligo/RotatingCarousel.tsx`: `RotatingSlides` (full-width slides, translateX track, autoplay) and `RotatingRow<T>` (horizontally scrollable card row that pages one screen at a time). Both default to a 3 s autoplay interval (`intervalMs`, overridable per call site), pause on hover/focus/drag and honor `prefers-reduced-motion` (no autoplay, no smooth scroll). Use these instead of writing new carousel logic.
- `RotatingSlides` renders a single child as-is (no controls), so it is safe for a placement that only has one banner.
- `BannerSlot` rotates every active banner for a placement through one slot rather than stacking a grid, so a placement with N banners occupies one slot on the page. Banners are DB-driven (`public.banners`, `bannersQuery(placement)` in `src/lib/content.ts`).
- The homepage hero (`src/routes/index.tsx`) rotates all `home_hero` banners with images (`heroImages`); controls appear only when there is more than one.
- Special Moments hub (`special-moments.index.tsx`) rotates the category hero (2 categories per slide) and the "Browse by category" and "Featured services" rows via `RotatingRow`.
- Carousels set `aria-roledescription="carousel"` + a distinct `aria-label` per region. Keep the labels distinct — two regions with the same label are ambiguous for screen readers. Keys used: `banner_carousel_aria`, `carousel_show`, `smi_categories`, `smi_show_categories`, `smi_show_services`, `home_moments_title`.

## Mobile responsiveness: account area
- `src/components/account/AccountShell.tsx`: the shell grid is `min-w-0` (so a wide child cannot force page overflow) and `lg:grid-cols-[260px_minmax(0,1fr)]`; the sidebar is `lg:sticky lg:top-20 lg:h-fit`. Below `lg` the desktop nav is hidden and a horizontally scrollable pill nav is shown, plus a sign-out button in the identity card.
- `AccountHeader` titles use `break-words` and a smaller base size (`text-xl sm:text-2xl lg:text-3xl`).
- Route content (e.g. `account.profile.tsx`) uses `p-4 sm:p-5` section padding and stacks the avatar/photo row (`flex-col sm:flex-row`) so nothing is clipped at 390 px.
- Verified at 390×844: `/account`, `/account/orders`, `/account/wishlist`, `/account/addresses`, `/account/profile`, `/account/notifications`, `/account/help` all have zero horizontal document overflow. Re-check with a headless Chromium CDP script if you touch these layouts.

