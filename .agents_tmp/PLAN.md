# 1. OBJECTIVE

Bring the LIGO Delivery Platform (Admin Control Center + Rider Operations app) to full parity with the architecture spec, then validate the codebase for production deployment. A comprehensive audit of the repository shows the bulk of the spec **already exists** (Lovable iterations); the plan therefore focuses on (a) closing a small, concrete set of gaps identified in the audit, (b) synchronizing Supabase TypeScript types, and (c) validating the build. All monetary output continues to use the existing `ETB()` formatter (`src/lib/format.ts`), which defaults to Ethiopian Birr with an overrideable currency parameter.

# 2. CONTEXT SUMMARY

**Stack:** TanStack Start + React 19, Supabase (auth/DB/realtime), Tailwind v4, shadcn-style `src/components/ui/*`, Leaflet for maps, Recharts for analytics. Repository is Lovable-connected — no git history rewrites, keep the branch in a working state.

**What already exists (verified by audit):**

- **Admin shell** — `src/components/admin/AdminShell.tsx`: collapsible grouped sidebar (Dashboard, Orders, Live Delivery Map, Riders, Merchants, Customers, Products, Categories, Payments, Financials & Earnings, Reports, Offers & Coupons, Notifications, Settings, System Users), `Cmd+K` (`src/components/admin/CommandSearch.tsx`), system-health badge, pending-orders badge. **Missing: date-range filter, notifications center, admin user drawer.**
- **Dashboard KPIs + charts** — `src/routes/admin.index.tsx`: all 8 spec metric cards with % deltas, hourly volume chart, revenue split (commission / delivery fees / payouts on commission from `settings.platform`).
- **Live map** — `src/routes/admin.map.tsx` + `src/components/admin/LiveMap.tsx`: color-coded rider/merchant/destination markers, polyline overlays, realtime via Supabase channel, rider inspection sidebar (speed, battery, GPS, contact, reassign, pause/resume dispatch). **Missing: target ETA line.**
- **Orders admin** — `src/routes/admin.ops.tsx`: dispatch via `approve_and_dispatch` RPC, dispatch-pause guard, status override select, payments/payouts/customers/shops/products/categories/offers/banners/content/financials/settings/system panels. **Missing: manual rider override and cancel-with-reason+refund actions on orders.**
- **Riders admin** — `src/routes/admin.riders.tsx`: approval queue with ID/license document review, approve/reject-with-notes, suspend. **Missing: rider dossier (delivery history, earnings total, rating average, dispute log).**
- **Merchant ops** — `src/components/ligo/ShopHoursEditor.tsx` (weekly hours), force-pause via `shops.is_online` toggle, product/menu editor under Shops/Products tabs.
- **Rider app** — `src/routes/rider.index.tsx`: online toggle, full-screen incoming-order modal with `secondsLeft` countdown, accept via atomic `rpc("accept_order")`, staged delivery flow with PIN completion via `complete_delivery` RPC, earnings ledger with base/tip/bonus/distance incentive, instant payout (`payout_requests`), GPS+battery streaming via `watchPosition` every ~5s.
- **Database** — migrations through `supabase/migrations/20260819200000_*` create `shop_hours`, `rider_earnings`, `payout_requests`, `rider_ratings`, `rider_offer_events`, `accept_order`, `approve_and_dispatch`, `complete_delivery`, `record_rider_earning()`; generated types exist at `src/integrations/supabase/types.ts` (includes Functions section).

**Design system:** Emerald primary `#059669` is used via Tailwind tokens (`primary`, `primary-soft`) — components must continue using tokens rather than raw hex.

# 3. APPROACH OVERVIEW

Close the audited gaps with targeted, additive edits to existing files rather than architectural rewrites. Work proceeds in this order: (1) fill the AdminShell header gaps (date-range, notifications center, admin drawer) so every admin route inherits them; (2) add the missing live-map ETA line; (3) add the two missing order actions (manual rider override, cancel+refund) inside the existing `OrdersAdmin`; (4) add a rider dossier dialog on the riders page; (5) add a capacity overlay to the dashboard's hourly chart; (6) regenerate/verify Supabase types; (7) run lint + typecheck + production build and fix any surfaced issues. This sequencing keeps the spec-wide header work in one component change, then moves outward to per-page gaps.

# 4. IMPLEMENTATION STEPS

### Step 1 — Complete the AdminShell top header
- **Goal:** Bring `src/components/admin/AdminShell.tsx` to full spec: environment switcher, date-range filter, notifications center, admin user drawer.
- **Method:** Replace the static "Bishoftu · Hub 01" text with a bordered pill that opens a popover listing configured environments (single entry for now). Add a `Select` (today / last 7 days / last 30 days) that publishes its value via a small context/provider or URL search param on dashboard routes. Add a Bell icon with an unread badge opening a `Sheet` that lists recent `notifications` rows for the admin user (reuse query pattern from `src/routes/notifications.tsx`). Add an avatar button opening a `Drawer` showing the admin profile (from `useAuth`) and a sign-out action.
- **Reference:** `src/components/admin/AdminShell.tsx`, `src/hooks/useAuth.tsx`, `src/routes/notifications.tsx`.

### Step 2 — Live map rider panel ETA
- **Goal:** Show an estimated target ETA in the rider inspection panel.
- **Method:** Compute haversine distance from rider GPS to the assigned order's destination (the shop pickup point when pre-pickup) and derive ETA at ~25 km/h; render as a `dl` row alongside existing speed/battery/GPS/last-update rows.
- **Reference:** `src/routes/admin.map.tsx` (sidebar block), helper `haversineKm` pattern already exists in `rider.index.tsx`.

### Step 3 — Orders admin: manual rider override + cancel with refund
- **Goal:** Add the two missing admin actions on order rows.
- **Method:** Inside `OrdersAdmin` in `src/routes/admin.ops.tsx`: (a) "Assign rider" select listing approved riders → update `rider_id` and set status to `accepted`; (b) "Cancel order" dialog requiring a reason → update `status: "cancelled"`, `cancel_reason`, `refunded: true`, and set `payment_status: "refunded"` where non-cash. Both actions invalidate the orders query and notify relevant parties via the existing `notify()` helper in `src/lib/orders.ts`.
- **Reference:** `src/routes/admin.ops.tsx` (OrdersAdmin), `src/lib/orders.ts`.

### Step 4 — Rider dossier dialog
- **Goal:** Give admins a full rider detail view from the approval queue.
- **Method:** Add a "Dossier" button per rider in `RiderApprovalQueue` that opens a `Dialog` aggregating: delivered-orders history (from `orders` where `rider_id=X`), total earnings + breakdown (from `rider_earnings`), average rating + recent comments (from `rider_ratings`), and dispute/cancellation log (cancelled orders previously assigned to the rider). Load on open with per-dialog `useQuery`.
- **Reference:** `src/routes/admin.riders.tsx`, tables `orders`, `rider_earnings`, `rider_ratings`.

### Step 5 — Dashboard capacity overlay
- **Goal:** Match the "order volume vs capacity" chart requirement.
- **Method:** In `src/routes/admin.index.tsx` compute baseline capacity per hour (approved riders online count × configured per-rider orders/hour, e.g. 3) and render the hourly chart as a grouped/stacked comparison (volume bars vs capacity line) or side-by-side bars.
- **Reference:** `src/routes/admin.index.tsx`, `recharts` ComposedChart.

### Step 6 — Supabase type synchronization
- **Goal:** Ensure `src/integrations/supabase/types.ts` matches the migrated schema.
- **Method:** If Supabase CLI + project ref/access token are available, run `supabase gen types --linked` (or `--project-id`) and overwrite `types.ts`. Otherwise, perform a manual audit: compare the tables/columns created by migrations against the generated file (`payout_requests`, `shop_hours`, `rider_offer_events` columns like `distance_km`, `refunded`, `delivery_pin`, `speed`, `battery`) and patch discrepancies by hand, noting in the PR description which method was used.
- **Reference:** `src/integrations/supabase/types.ts`, `supabase/migrations/`.

### Step 7 — Validation & production readiness
- **Goal:** Ship a clean, build-verified branch.
- **Method:** Run `npm run lint` (or `bun run lint`) and fix non-prettier issues; run `npx tsc --noEmit` to surface type errors (the build script does not typecheck); fix any surfaced mismatches; run `npm run build` and confirm production bundle success; confirm `vercel.json` SPA rewrite and `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` env requirements are documented (the client errors loudly when missing).
- **Reference:** `package.json`, `tsconfig.json`, `vercel.json`, `src/integrations/supabase/client.ts`.

# 5. TESTING AND VALIDATION

Success is defined as:

1. **Lint:** `npm run lint` passes with no `eslint-plugin-react-hooks` violations beyond tolerated warnings.
2. **Typecheck:** `npx tsc --noEmit` exits cleanly; `types.ts` matches the schema (checked either by CLI regeneration or manual diff).
3. **Build:** `npm run build` completes and produces the production bundle.
4. **Manual UI verification (dev server):**
   - AdminShell header: ⌘K/Ctrl+K opens command search; bell shows unread notifications drawer; avatar drawer shows admin info and sign-out; environment pill visible.
   - `/admin`: 8 KPIs visible with delta badges; hourly chart shows volume + capacity series; revenue split pie renders.
   - `/admin/map`: rider markers color-coded; clicking a rider opens the panel with Speed, Battery, GPS, ETA; Contact/Reassign/Pause buttons work; realtime updates stream.
   - `/admin/ops?tab=orders`: manual "Assign rider" and "Cancel with reason & refund" actions succeed and reflect in the table.
   - `/admin/riders`: "Dossier" dialog shows history, earnings, rating avg, disputes.
   - `/rider/` (mobile viewport): online toggle works; incoming offer modal shows countdown and accept/decline; staged flow completes with PIN via `complete_delivery`; earnings payout request writes a `payout_requests` row.
5. **Realtime smoke test:** open `/admin/map` and `/rider/` in two sessions; toggling rider online updates the admin map marker within seconds (Supabase realtime subscription on `riders`/`orders`).
