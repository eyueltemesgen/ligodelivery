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

## Layout gotcha: overlapping content must stack above media
- `StorageImage` renders a `relative` wrapper (positioned), so any sibling block that is *pulled up* over it with a negative margin must itself be positioned. Otherwise CSS paint order draws the positioned image above the non-positioned block, hiding the block's top (e.g. a shop name in a card overlapping the cover).
- On the shop detail page (`src/routes/shops.$shopId.tsx`) the card uses `container-ligo relative z-10 -mt-10` for exactly this reason. Keep the `relative z-10` when touching that overlap.

## Language switcher (English / አማርኛ)
- Copy lives in `src/lib/i18n.ts` (`translations.en` / `translations.am`, `TranslationKey`). Add new UI strings there, not inline.
- Provider/hook: `src/hooks/useLanguage.tsx` — mirrors `useTheme`; persists to `localStorage` key `ligo-lang` and sets `document.documentElement.lang`. Defaults to English unless the browser language starts with `am`.
- Button: `src/components/LanguageToggle.tsx`, rendered in the header next to `ThemeToggle`.
- Wired through `src/components/layout/SiteHeader.tsx`, `SiteFooter.tsx`, and `src/routes/index.tsx` only. It is purely additive — do not replace DB-driven content (e.g. `site_content` hero/brand copy) with translation keys.
