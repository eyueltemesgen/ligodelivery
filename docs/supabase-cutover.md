# Moving የኔ Go off Lovable Cloud to your own Supabase project

This is the operational guide for cutting the platform over from the
Lovable-managed Supabase project to a Supabase project you own. Follow it in
order. Each step says how to check it worked before you move on.

Budget about an hour, plus download/upload time for the storage objects.

---

## Decide first: copy the data, or start fresh?

The live project is small and not yet trading, so both paths are realistic.
Measure it yourself before choosing:

```bash
# counts (publishable key can read the catalogue tables)
curl -s "$U/rest/v1/shops?select=*&limit=1" -I -H "apikey: $K" | grep -i content-range
```

What is actually in the project today:

| Table | Rows | Notes |
| --- | --- | --- |
| `shops` | 7 | 5 are seeded demo shops; `hora burger` and `lina bakery` are real, hand-entered |
| `products` | 19 | includes real ones, e.g. `spcial burger` under `hora burger` |
| `categories` | 7 | just the seeded set (restaurants, cafes, grocery, …) |
| `banners` | 7 | real, with uploaded images |
| `settings` | 5 | **real config**, not reproducible from migrations — see below |
| `reviews` | 2 | real |
| `orders` | ≥1 | real, but not readable with the publishable key |
| `service_categories` | 5 | seeded |
| `delivery_fee_rules` | 4 | seeded |

**`settings` is the part you cannot get back from migrations.** It holds
`site_content` (brand name, contact phone, company name, hero copy),
`platform` (commission %, delivery fee), `delivery` (pricing method, per-km
rate, free-over threshold) and `loyalty` (points, redemption rules). The
migrations seed *default* rows, so a fresh project gets placeholder values and
you would have to re-enter your real ones by hand.

**Path A — copy everything (recommended).** Follow all the steps below. Needs
the current project's service-role key, because `orders`, `loyalty_ledger` and
friends are not readable with the publishable key. Images come across
automatically: the export downloads them and the import re-uploads them.

**Path B — start fresh.** Apply the migrations, then re-enter the catalogue by
hand and re-upload the images. Skip steps 3–5 and delete the seeded demo rows
instead. Choose this only if you are happy retyping the settings above and the
shop/product list; it is more manual work, not less, because the seed data is
placeholder content you would then have to replace.

### Why re-uploading images works either way

Image columns store **relative paths**, not full URLs — e.g.
`shops/9982b08b-7bb1-4016-83ac-cdbde6d886d2.jfif`, `branding/6bf2e79e-….jfif`.
`StorageImage` signs that path against whichever project is currently
configured (`src/lib/media.tsx`). So if you upload a file to the **same path**
in the new project, every row that references it keeps working with **no
database edit at all**. Path A does this for you; if you do it by hand, keep
the exact filename and folder.

---


## What actually depends on Lovable

The audit found the coupling is small and mostly harmless, which is why this is
a realistic move rather than a rewrite.

| Thing | Where | What to do |
| --- | --- | --- |
| Supabase project URL + key | `src/lib/public-env.ts` | Set env vars. The baked-in values are the **old** project. |
| `@lovable.dev/vite-tanstack-config` | `vite.config.ts`, `package.json` | Leave it. It is a normal public npm package and works anywhere. |
| Preview auth broker | `src/integrations/supabase/previewAuthStorage.ts` | Leave it. Inert unless the host is a Lovable preview domain. |
| Error reporting | `src/lib/lovable-error-reporting.ts` | Leave it. A no-op unless `window.__lovableEvents` exists. |
| `LOVABLE_API_KEY` provider | `src/lib/assistant-config.ts` | Optional. See step 7. |

The migrations use only stock Supabase primitives (`auth.uid`, `auth.users`,
`storage.objects`, `storage.foldername`, the `anon` / `authenticated` /
`service_role` roles) and no extensions. They are portable as-is.

---

## Step 0 — Know the risk

Two things make this move dangerous if done carelessly:

1. **Writes can silently land in the old project.** If `VITE_SUPABASE_URL` is
   missing, the app falls back to the baked-in Lovable project and keeps working
   — looking completely healthy while every new order goes to the wrong
   database. A warning is logged server-side (`USING_LEGACY_SUPABASE_FALLBACK`),
   but you should verify with step 8 rather than trust it.
2. **An export contains real customer data.** Orders, phone numbers, addresses
   and payment-proof images. `supabase-export/` is in `.gitignore` for this
   reason. Do not commit it, email it, or upload it anywhere except the target
   project.

Do this on a quiet hour and tell riders and merchants beforehand. Orders placed
during the switch can end up split across the two projects.

---

## Step 1 — Create the new Supabase project

1. Create a project at <https://supabase.com/dashboard>. Pick the region closest
   to Ethiopia — `eu-central-1` (Frankfurt) or `me-central-1` (Bahrain) are the
   sensible choices; a US region adds latency for every request.
2. Save the database password somewhere safe.
3. From **Project Settings → API**, note:
   - **Project URL** → this is `VITE_SUPABASE_URL` / `SUPABASE_URL`
   - **`anon` / publishable key** → `VITE_SUPABASE_PUBLISHABLE_KEY` /
     `SUPABASE_PUBLISHABLE_KEY`
   - **`service_role` key** → `SUPABASE_SERVICE_ROLE_KEY`. **Server-side only.**
     It bypasses every RLS policy. Never put it in a `VITE_*` variable, never
     commit it, never send it to a browser.

---

## Step 2 — Apply the migrations

All 41 migrations are verified to apply cleanly to a blank database (that is
what `scripts/verify/blank-project-sql.mjs` checks, and it is worth re-running
if you touch them).

**Option A — Supabase CLI (preferred, repeatable):**

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Option B — SQL editor:** paste each file in `supabase/migrations/` in
filename order (they are timestamp-prefixed, so alphabetical = chronological).

Verify:

```bash
node scripts/verify/blank-project-sql.mjs   # schema-level check, local
```

Then confirm on the new project that `public` has 36 tables and that the
storage buckets `ligo-media` and `ligo-proofs` exist.

### About the seeded demo data

The migrations **seed demo content**: 6 shops, 8 categories, ~19 products,
delivery fee rules, service categories. A freshly migrated project is therefore
*not* empty.

This is why the import has a `--replace` mode. Without it, importing your real
data collides with the seeds: the categories fail on their unique `slug`, and
the shops get inserted a second time because there is no unique key on shop
name — leaving your real products attached to the wrong shop rows. For a
cutover, always use `--replace`.

If you would rather start truly clean, delete the seeded rows before importing
(they are only in `categories`, `shops`, `products`, `delivery_fee_rules` and
`service_categories`).

---

## Step 3 — Export the current project

You need the **service-role key of the current (Lovable) project**, from its
Supabase dashboard. The publishable key will not work: RLS returns an empty list
rather than an error for customer tables, so an anon export silently produces an
empty dataset that looks plausible.

```bash
SUPABASE_URL="https://<old-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<old-service-role-key>" \
node scripts/migrate/export.mjs supabase-export
```

Verify: `supabase-export/manifest.json` exists and the per-table counts match
what the old project's Table Editor shows. Sanity-check a few counts — a zero
where you expect data is the failure mode this step exists to catch.

To rehearse without downloading images, add `--skip-storage`.

---

## Step 4 — Move the users

**This is the step people get wrong.** Only three columns have a real foreign
key to `auth.users`:

- `profiles.id` → `auth.users(id)` (ON DELETE CASCADE)
- `shops.owner_id` → `auth.users(id)` (ON DELETE SET NULL)
- `report_history.generated_by` → `auth.users(id)` (ON DELETE SET NULL)

Those are the ones that will make the import fail. Note that
`orders.customer_id`, `reviews.customer_id`, `user_roles.user_id` and
`riders.id` are **plain uuids with no foreign key**, so they import fine on
their own — but if the referenced account does not exist in the new project,
that customer can no longer sign in to see their order, and any code that
looks the profile up finds nothing. Copy the users anyway; it is cheap and
avoids a confusing half-broken state.

`auth.users` is not part of the REST API, so the scripts cannot copy it. Create
the users in the new project first, preserving their ids:

1. **Dashboard → Authentication → Users → Add user** for each account, or use
   the Admin API:

   ```bash
   curl -X POST "https://<new-ref>.supabase.co/auth/v1/admin/users" \
     -H "apikey: <new-service-role-key>" \
     -H "Authorization: Bearer <new-service-role-key>" \
     -H "Content-Type: application/json" \
     -d '{"id":"<same-uuid-as-old>","email":"user@example.com","email_confirm":true}'
   ```

   Passing `id` explicitly is what keeps `owner_id`, `profiles.id` and
   `customer_id` pointing at the right people.

2. Do **not** rely on users signing up again — a new signup gets a new uuid and
   will not own their old shop or orders.

3. In the current project every `shops.owner_id` is NULL and `profiles` is
   empty, so for the catalogue you only really need **your own admin account**
   plus whoever placed the existing order. Check with:

   ```bash
   curl -s "$U/rest/v1/shops?select=name,owner_id" -H "apikey: $K"
   ```

4. `public.admin_bootstrap` is copied by the export. Keep it. It is the one-time
   flag that stops the *first* signup on a fresh project from being granted
   `admin` automatically (`handle_new_user`). If it is missing, the next person
   to register becomes an admin.

5. Recreate your own admin account, and confirm `user_roles` has your admin row
   after the import.

---

## Step 5 — Import into the new project

```bash
SUPABASE_URL="https://<new-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<new-service-role-key>" \
node scripts/migrate/import.mjs supabase-export --replace
```

It prints a count per table and a clear list of any that failed. A foreign-key
failure almost always means a missing `auth.users` row from step 4.

Verify, on the new project:

- `shops`, `products`, `categories`, `orders` row counts match the export.
- A shop's products are attached to **that** shop (spot-check one in the Table
  Editor). This is the check that catches the seeded-data collision.
- `user_roles` contains your admin row.
- The `ligo-media` bucket has your images.

---

## Step 6 — Point the app at the new project

Set these in your hosting provider (Vercel → Settings → Environment Variables):

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<new-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | new publishable key |
| `SUPABASE_URL` | `https://<new-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | new publishable key |

Both pairs are needed and they are **not** interchangeable: `vite.config.ts`
bakes the `VITE_*` pair into the browser bundle, while the server middleware
(`optional-auth-middleware.ts`, used by the shopping assistant) reads the plain
`SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`. Setting only one pair leaves the
other half pointed at the old project.

`SUPABASE_SERVICE_ROLE_KEY` is **not** needed for the deployed app. The
assistant deliberately runs on the caller's own RLS-enforced client.

### Auth redirect URLs

In the new project: **Authentication → URL Configuration**. Add every origin the
app is served from, or email links and OAuth will bounce:

- `https://ligodelivery.vercel.app`
- `https://ligodelivery-novexa4.vercel.app`
- your custom domain, if any
- `http://localhost:5173` (or whatever port `npm run dev` uses) for local work

Also set **Site URL** to the primary production origin. If the site is embedded
in the rider Android app, add its origin too — check
`RIDER_APP_URL` in `capacitor.config.ts`.

### Email

If the new project sends auth emails, configure SMTP under
**Authentication → Email**. The default Supabase mailer is heavily rate-limited
and is not suitable for real customers. Copy your existing settings, or expect
signup confirmation emails to fail.

---

## Step 7 — The shopping assistant (optional)

Only needed if you want the AI assistant to keep answering.

`LOVABLE_API_KEY` is injected by Lovable Cloud as a project secret. On any other
host it is unset, so the assistant returns a typed `ai_unavailable` note **with
HTTP 200** — it looks like "the assistant is broken" rather than "a key is
missing".

Set a model credential in the host's environment. Any one of these works, and
the key you set selects the matching endpoint automatically:

- `GEMINI_API_KEY` — Google, generous free tier to start
- `LOVABLE_API_KEY` — if you hold the value
- `DEEPSEEK_API_KEY`

Do not bake a key into the bundle. `src/lib/assistant-config.ts` reads it at
call time for exactly this reason.

---

## Step 8 — Verify before you call it done

1. **Load the site.** Homepage, `/shops`, a shop page, `/special-moments`.
   Images should render — if every image is a placeholder, the storage objects
   or bucket policies did not come across.
2. **Check the project actually in use.** Open the browser devtools Network tab
   and confirm requests go to `<new-ref>.supabase.co`, not the old one. This is
   the only reliable check that the env vars took effect.
3. **Sign in** as a customer and as your admin account.
4. **Place a test order** end to end, then confirm the row appears in the *new*
   project's Table Editor.
5. **Upload an image** as a merchant (e.g. a product photo) and confirm it
   renders.
6. **Check the server logs** for the fallback warning from step 0. If you see
   `No VITE_SUPABASE_URL / SUPABASE_URL configured`, an env var is still
   missing.
7. Run the local harnesses:

   ```bash
   node scripts/verify/blank-project-sql.mjs
   node scripts/verify/migrate-roundtrip.mjs
   node scripts/verify/ratings-sql.mjs
   node scripts/verify/notify-rpc-sql.mjs
   python3 scripts/verify/locale-parity.py
   ```

---

## Step 9 — After the cutover

- **Keep the old project for a while.** Do not delete it. It is your only
  backup, and historical orders may reference it.
- **Free-tier pausing.** A Supabase free project pauses after about a week of
  inactivity. A live delivery platform is never inactive, so this is unlikely —
  but a paid plan removes the risk and is worth it for production.
- **Backups.** Supabase's daily backups are on paid plans. Given this database
  holds live orders and payouts, enable them.
- **Test a restore before you need one.** Export with `export.mjs` on a schedule
  and keep the output somewhere safe and private.

---

## Reference: what each script does

| Script | Purpose |
| --- | --- |
| `scripts/migrate/table-order.mjs` | Derives the FK-safe table order from the live schema, so the import order cannot go stale. |
| `scripts/migrate/export.mjs` | Reads every table and storage object from a project. Needs a service-role key. |
| `scripts/migrate/import.mjs` | Writes an export into a project. `--replace` clears target rows first. |
| `scripts/verify/blank-project-sql.mjs` | Applies all migrations to a blank Postgres, proving a fresh project can be built. |
| `scripts/verify/migrate-roundtrip.mjs` | Exports from one database and imports into another, then compares them row for row. |

Both SQL harnesses need PGlite, which is not a committed dependency:

```bash
npm i @electric-sql/pglite
```

Note that a later `npm install` prunes it, so reinstall before re-running.
