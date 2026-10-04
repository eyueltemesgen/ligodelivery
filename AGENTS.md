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
