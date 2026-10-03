<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history â€” force pushing, or rebasing/amending/squashing commits
> that are already pushed â€” as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Public backend URL and publishable key are baked into vite.config.ts `define` as a fallback, because published builds have shipped without VITE_* env vars and blanked the site.

## Multilingual support (English / አማርኛ / Afaan Oromoo)
- Framework-agnostic primitives in `src/lib/i18n/core.ts` (language codes, detection, `interpolate`, `translate`). React layer in `src/lib/i18n/I18nProvider.tsx` exposing `useI18n()` → `{ t, lang, setLanguage }`; `t(key, vars?)` supports `{name}` interpolation.
- `src/lib/i18n/index.ts` ships English eagerly (it is the fallback) and code-splits `am`/`om` via `LOADERS` with an in-memory cache, so only the active locale is downloaded. Build output confirms separate `am-*.mjs` / `om-*.mjs` chunks.
- Locale dictionaries: `src/lib/i18n/locales/{en,am,om}.ts`. Keys must stay at exact parity across all three files — the fallback chain is active locale → English → the key itself, so a missing entry silently renders the key.
- Language switcher: `src/components/layout/LanguageSwitcher.tsx` (`LanguageSwitcher` in header, `LanguageSwitcherInline` in mobile nav). Uses lucide `Languages`/`Check` icons only — never emojis. Preference persists to `localStorage` key `yene-lang` (deliberately not brand-prefixed).
- DB-backed content translations live in `supabase/migrations/20261003170000_content_translations.sql`; read helpers are in `src/lib/i18n/content.ts` (`localizeEntity`, `useLocalizedEntity`, `TRANSLATABLE_FIELDS`).
- Shared label maps that must be translated carry a `*_KEY` (e.g. `MERCHANT_STATUS_KEY`, `PROMOTION_KEY`, `MERCHANT_NEXT_STATUS[].labelKey`) rather than a literal string, so the consuming component calls `t(key)`.
- Admin console: the `language` tab in `src/routes/admin.ops.tsx` renders `ContentTranslationsAdmin.tsx`.

## Customer Account Center
- Routes: `src/routes/account.*.tsx` (`/account`, `/account/orders`, `/account/orders/$orderId`, `/account/wishlist`, `/account/addresses`, `/account/profile`, `/account/notifications`, `/account/help`). Legacy `/orders`, `/orders/$orderId`, `/notifications` are redirect shims.
- Shell + nav: `src/components/account/AccountShell.tsx` (desktop sidebar, mobile horizontal pill nav). Shared async UI: `src/components/account/States.tsx`.
- Data layer: `src/lib/account.ts` (typed queries). Saved products/shops: `src/lib/saved.tsx` (tolerates missing `wishlist`/`shop_favorites` tables). Supabase error helpers: `src/lib/supa-error.ts`.
- Migrations are additive and idempotent: `supabase/migrations/20260908120000_account_center.sql` (addresses city/area/updated_at, single-default trigger, wishlist, shop_favorites, notifications).
- No local DB credentials. Migrations must be applied through Lovable/Supabase before dependent features work. Verify live functions before relying on them.
- `public.place_order` on the live DB had an unguarded `DELETE FROM _po_items;` (no WHERE) that Supabase safeupdate rejects; fix is `supabase/migrations/20260908130000_fix_place_order_safe_delete.sql` and must be applied for checkout to succeed.
- Address "set default" is also enforced client-side (clear other defaults before setting), so exactly one default holds even before the DB trigger migration is applied.

## Brand: á‹¨áŠ” Go (Yene Go)
- The platform was rebranded from "Ligo" to **á‹¨áŠ” Go** (English reference: Yene Go), tagline *Fast. Local. Delivered.*
- Internal identifiers are intentionally preserved for safety: routes, DB tables/columns, storage bucket `ligo-media`, CSS utilities `container-ligo`, theme localStorage key `ligo-theme`, and `src/components/ligo/*` paths. Do not rename these for cosmetic reasons.
- Live brand copy lives in `public.settings` key `site_content` (and `contact`). The read layer `src/lib/content.ts` normalizes legacy `Ligo*` values and placeholder `ligo` banners to the new brand so the UI is correct even before `supabase/migrations/20261003140000_rebrand_yene_go.sql` is applied. Applying that migration is still recommended.
- The header logo is an uploaded image (`site_content.logo_url`) rendered via `StorageImage`; the fallback wordmark/monogram is in `src/components/Logo.tsx`. Amharic glyphs rely on "Noto Sans Ethiopic", added as a fallback in `src/styles.css` and loaded from Google Fonts in `src/routes/__root.tsx`.
- Favicon/app icons live in `public/` (`favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`) with `public/manifest.webmanifest`.

## Special Moments
- Enhancement on top of the existing marketplace (no rebuild): gifts, surprises, holiday gifts, catering and decoration services, all admin-managed from the DB.
- Routes: `src/routes/special-moments.index.tsx` (hub `/special-moments`), `special-moments.category.$slug.tsx`, `special-moments.service.$serviceId.tsx`, `special-moments.search.tsx`; customer requests at `src/routes/account.service-requests.index.tsx` and `account.service-requests.$requestId.tsx`.
- Data layer: `src/lib/special-moments.ts` (queries, `createServiceRequest`, `acceptServiceQuote`, `placeServiceOrder`, `addonsTotal`, status constants). Presentation metadata: `src/lib/service-catalog.ts`. UI: `src/components/special-moments/{ServiceCards,ServiceRequestDialog}.tsx`; admin console `src/components/admin/SpecialMomentsAdmin.tsx` (wired as the `special-moments` tab in `admin.ops.tsx`).
- Migration `supabase/migrations/20261003160000_special_moments.sql` is additive/idempotent: tables `service_categories`, `services`, `service_addons`, `service_requests`; adds `orders.order_type`/`scheduled_for`/`service_request_id`; RPCs `review_service_request`, `accept_service_quote`, `place_service_order`. Must be applied before the feature works â€” reads degrade to empty, writes surface a clear error until then.
- Flow reuses the existing order + payment pipeline: fixed-price bookings pay the service price, quote requests go `quote_requested â†’ quoted â†’ accepted â†’ paid`. Service orders carry `order_type='service'` and a linked `service_request_id`, so `place_order` (products) is untouched.
- Security: `service_requests` is INSERT-only for customers via RLS; status/quote/order changes go through the SECURITY DEFINER RPCs. `service_categories`/`services`/`service_addons` are publicly readable when active and writable by admins or the linked shop owner (`owns_shop`).

## Multilingual support (i18n)
- Languages: `en` (English, source of truth + fallback), `am` (Amharic, Ethiopic), `om` (Afaan Oromoo, Latin Qubee). All three are LTR; `dir` is modelled in `src/lib/i18n/core.ts` for future-proofing.
- Core primitives are framework-agnostic in `src/lib/i18n/core.ts` (`LanguageCode`, `LANGUAGES`, `detectLanguage`, `matchLanguage`, `translate`); React bindings live in `src/lib/i18n/I18nProvider.tsx` (`I18nProvider`, `useI18n`, `useI18nOptional`, `useT`). The provider is mounted in `src/routes/__root.tsx`.
- Dictionaries: `src/lib/i18n/locales/{en,am,om}.ts`. English is imported eagerly; `am`/`om` are code-split and lazily loaded via `loadDictionary` in `src/lib/i18n/index.ts` and cached in memory. Keep the three files at exact key parity â€” a missing key falls back to English at runtime, so never leave a key absent from `en`.
- Persistence: localStorage key `yene-lang` (`LANGUAGE_STORAGE_KEY`). Detection order is stored preference â†’ `navigator.languages` â†’ English. `<html lang>`/`<html dir>` are kept in sync by the provider.
- Brand names (á‹¨áŠ” Go) and currency (`ETB`/Birr) are never translated.
- Switcher UI: `src/components/layout/LanguageSwitcher.tsx` (`LanguageSwitcher` in the header, `LanguageSwitcherInline` in the mobile menu, also in `AdminUserMenu`). Uses `lucide-react` icons only â€” no emojis anywhere in language UI.
- Dynamic DB content translations: table `content_translations` (migration `supabase/migrations/20261003170000_content_translations.sql`), typed in `src/integrations/supabase/types.ts`, queried via `src/lib/i18n/content.ts` (`useContentTranslations`, `useLocalizedEntity`, `localizeEntity`, `TRANSLATABLE_FIELDS`). Base tables stay English source-of-truth; a row overrides one field for one language and the storefront falls back to English when absent. Reads degrade to English if the table is missing (`isMissingTable`).
- Admin editor: `src/components/admin/ContentTranslationsAdmin.tsx`, wired as the `language` tab in `src/routes/admin.ops.tsx` (`OPS_TABS`). All admin ops UI strings use `admin.*` keys.
- Locale keys added for admin ops: `admin.ops*` (tab labels) plus `admin.*` form/table/button labels. When adding new admin strings, add the key to all three locale files.

