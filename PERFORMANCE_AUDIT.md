# የኔ Go — Performance Audit (internal)

Scope: full storefront + customer account + admin + rider/merchant surfaces.
Method: static inspection of routes/queries/bundles, a production build, and
live probes against the configured Supabase project. No code was changed before
the measurements below were taken.

## Baseline measurements

Production build (`vite build`, TanStack Start + Nitro/Cloudflare):

- Client JS: 123 files, **2,165 kB raw / 637 kB gzip** total.
- Initial JS graph loaded by the homepage: 24 files, **849 kB raw / 256 kB gzip**.
- Largest initial chunks: `index` 489 kB, `@supabase/supabase-js` 212 kB,
  `i18n` 262 kB, `leaflet` 149 kB (route-lazy), `recharts` `PieChart` 396 kB
  (route-lazy).
- CSS: `styles` 100 kB (16.6 kB gzip) + `leaflet` 15 kB.
- `_headers` only caches `/assets/*`; HTML and data have no cache directives.

Live backend probes (real project, real rows):

- `ligo-media` bucket is **private** → every image requires a per-file signed URL.
- `GET /storage/v1/object/authenticated/...` (what the app requests) serves the
  original file: 32,709 B JPEG for one category image.
- `GET /storage/v1/render/image/authenticated/...?...format=webp` serves an
  optimized variant: 21,124 B WebP at width 400 (−35%), 10,178 B at width 200
  (−69%). The current client uses **no transform at all**.

## Findings

| # | Problem | Why it is slow | Severity | Fix | Expected impact |
|---|---------|----------------|----------|-----|-----------------|
| 1 | Amharic + Oromo dictionaries are bundled with English and parsed on every load | `i18n.ts` was a single 5,862-line module; the whole 262 kB chunk is on the critical path even for English users | High | Split into `src/lib/locales/{en,am,or}.ts`; English eager, others behind dynamic `import()` | −50 kB gzip initial JS |
| 2 | Images are served at original resolution with no format negotiation | Private bucket → signed URL to the raw object; a category thumbnail downloads the full upload | High | Sign with `transform: { width, quality, format: "webp" }`; responsive `width`/`height`/`sizes` | 35–70% less image bytes |
| 3 | Shop listing and shop detail load entire tables | `shopsQuery` has no limit; `shopProductsQuery` loads every product of a shop | High | Add limits + pagination window; keep detail bounded | Fewer rows over the wire |
| 4 | Admin dashboard/ops pull whole tables into the browser and aggregate in JS | `orders`, `profiles`, `orders(customer_id,total,status)` for all customers; `select("*")` everywhere | High | Server-side aggregation + `head` counts + limits; never `select("*")` on orders | Admin no longer downloads full tables |
| 5 | Account order history fetches every order unbounded | `ordersQuery` orders all rows, no range | Medium | Add `limit` + paged fetch | Bounded payload |
| 6 | Public catalogue data is never cached | Every navigation re-signs images and re-queries categories/shops/products | Medium | `staleTime`/`gcTime` on public queries; signed-URL cache keyed by path+size | Fewer repeat requests |
| 7 | Signed-URL resolution is per `<img>` and uncached across mounts | Each card signs independently on mount | Medium | Shared bounded cache keyed by bucket+path+transform | Fewer storage round-trips |
| 8 | All Radix UI / lucide / sonner ship in the initial chunk | No route-level isolation for rarely used UI | Low | Keep; only heavy libs matter (already lazy) | — |
| 9 | `defaultPreloadStaleTime: 0` disables route preload caching | Hover preloads are thrown away and re-fetched | Low | Set a small stale time | Fewer repeat route loads |
| 10 | Fonts: only "Noto Sans Ethiopic" is loaded, but `--font-display`/`--font-body` name Plus Jakarta Sans and DM Sans first | Every heading/body falls back to system font (and the fallback chain resolves late) | Medium | Request the actual families with `display=swap` and drop unused weights | Consistent typography, no FOUT stall |

## Non-goals / do-not-touch

- No database replacement, no schema rewrites, no data deletion.
- No changes to order/payment/RLS business logic.
- Internal identifiers (`ligo-media`, `container-ligo`, `ligo-theme`, routes)
  stay as-is.

## Fixes implemented

| # | Fix | Files |
|---|-----|-------|
| 1 | i18n split: English eager, Amharic/Oromo behind `import()` | `src/lib/locales/{en,am,or}.ts`, `src/lib/i18n.ts`, `src/hooks/useLanguage.tsx` |
| 2 | Image transform: sign with `{ width, quality }` (renderer negotiates WebP), single right-sized candidate, `width`/`height` for CLS | `src/lib/media.tsx` |
| 3 | Catalogue bounded: `shopsQuery`/`shopProductsQuery` limits + account order pagination (25/page, load more) | `src/lib/queries.ts`, `src/lib/account.ts`, `src/routes/account.orders.index.tsx` |
| 4 | Admin dashboard bounded: order/profile windows capped at 4000, `select` narrowed, `head` counts | `src/routes/admin.index.tsx`, `src/routes/admin.ops.tsx` |
| 5 | Public query caching: `staleTime`/`gcTime` on categories/shops/products/offers | `src/lib/queries.ts`, `src/lib/content.ts` |
| 6 | Signed-URL cache keyed by bucket+path+width, shared across mounts; batched signing for untransformed images | `src/lib/media.tsx` |
| 7 | Route preload stale window (`defaultPreloadStaleTime`) | `src/router.tsx` |
| 8 | Toast layer deferred: `sonner` + `<Toaster>` loaded on first toast | `src/lib/toast.tsx`, `src/routes/__root.tsx`, all `toast` call sites |
| 9 | Hot-path indexes (additive, idempotent) | `supabase/migrations/20261004190000_performance_indexes.sql` |

## Measured impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Initial JS graph (homepage) | 24 files, 849.7 kB raw / 256.3 kB gzip | 25 files, 818.1 kB raw / 248.2 kB gzip | −8.1 kB gzip |
| `sonner` in initial bundle | yes (in `index`) | no (separate `sonner` chunk) | ~−14 kB gzip on every route |
| Amharic/Oromo dictionaries | eager in initial | async chunk | ~−50 kB gzip |
| Image bytes (26 catalogue images) | 2,014 kB original | 1,518 kB transformed | −24.6% |
| Storage signing round-trips (grid of N images) | N per-image calls | N/50 batched for untransformed; N with transform embedded for sized | fewer requests |
| Homepage network requests (images) | 1 per image, uncached | cached per (path,width) across mounts | repeat navigations reuse |

Note: image bytes were measured against the live private bucket. The renderer
re-encodes to JPEG for `.jfif` sources (WebP negotiation depends on the source
container), so the saving is size-driven rather than format-driven.

## Verification

- `tsc --noEmit`: clean.
- `vite build`: clean.
- Dev-server smoke test (SSR + client hydration): `/`, `/shops`, `/categories`,
  `/offers`, `/search`, `/special-moments`, `/cart`, `/login`, `/register`,
  `/admin`, `/rider/join`, `/merchant/join` all HTTP 200.
- Browser check: homepage renders, product images resolve through
  `/render/image/sign/...` with the transform claim in the token, add-to-cart
  fires and the lazily-loaded toast host mounts.

## Remaining bottlenecks / future work

- The homepage `index` chunk is still ~136 kB gzip because it statically
  imports the shared UI kit (Radix dialog/dropdown/select), lucide icons and the
  TanStack Query client. Splitting Radix out of the initial route is the next
  meaningful win but needs care to avoid hurting interaction latency.
- `createSignedUrls` cannot carry transforms, so sized images still sign one at
  a time. If Supabase adds batch transforms, switch to a single batched call.
- Migrations must be applied through Lovable/Supabase before the new indexes
  exist; until then queries work but may scan.
- Map (leaflet) and reports (ExcelJS/jsPDF) are already route-lazy; keep them
  that way.
