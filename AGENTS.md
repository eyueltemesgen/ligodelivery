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
- Account pages are mobile-first. `AccountShell` uses a CSS grid whose first column is the `<aside>` (profile card + nav); the `aside` must keep `min-w-0`, otherwise the non-shrinkable mobile pill nav forces the grid column to its content width and the whole page overflows horizontally on phones. Verify with a 320/360/390px viewport that `document.documentElement.scrollWidth === clientWidth` on every `/account/*` route.
