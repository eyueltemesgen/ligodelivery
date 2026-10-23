/**
 * Functional check for `shop_distances`, the RPC behind the distance badge on
 * shop cards.
 *
 * The invariant that matters is agreement: the fee a card shows must be the fee
 * checkout will charge. Both come from `calculate_delivery_fee`, and this test
 * pins that down by asserting the bulk result for a shop is byte-for-byte the
 * same object a direct `calculate_delivery_fee` call returns. If someone ever
 * reimplements the pricing inside `shop_distances`, this fails.
 *
 *   node scripts/verify/shop-distances-sql.mjs
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = resolve(here, "../../supabase/migrations");

let passed = 0;
let failed = 0;
const check = (name, ok, detail = "") => {
  if (ok) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
  }
};

const db = new PGlite();
await db.exec(`
  CREATE ROLE anon NOLOGIN NOINHERIT; CREATE ROLE authenticated NOLOGIN NOINHERIT;
  CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false,
    file_size_limit bigint, allowed_mime_types text[], created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text REFERENCES storage.buckets(id), name text, owner uuid,
    created_at timestamptz NOT NULL DEFAULT now(), metadata jsonb);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
    SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  CREATE PUBLICATION supabase_realtime;
`);
for (const f of readdirSync(MIGRATIONS)
  .filter((x) => x.endsWith(".sql"))
  .sort()) {
  await db.exec(readFileSync(resolve(MIGRATIONS, f), "utf8"));
}

// Two shops near Bishoftu: one geolocated, one not (to exercise the fallback).
const NEAR = "c0000000-0000-0000-0000-000000000001";
const NOGEO = "c0000000-0000-0000-0000-000000000002";
await db.exec(`
  INSERT INTO public.shops (id, name, lat, lng, delivery_fee, is_active)
  VALUES
    ('${NEAR}', 'Near Shop', 8.7510, 38.9780, 40, true),
    ('${NOGEO}', 'No Geo Shop', NULL, NULL, 70, true);
`);

// A customer ~2 km away.
const LAT = 8.769;
const LNG = 38.978;

const bulk = (
  await db.query(`SELECT public.shop_distances($1::float8, $2::float8, $3::uuid[]) AS r`, [
    LAT,
    LNG,
    [NEAR, NOGEO],
  ])
).rows[0].r;

check(
  "shop_distances returns an entry for every requested shop",
  Object.keys(bulk).length === 2,
  JSON.stringify(bulk),
);

const nearBulk = bulk[NEAR];
check("geolocated shop resolves ok", nearBulk?.ok === true, JSON.stringify(nearBulk));
check(
  "geolocated shop reports a positive distance",
  Number(nearBulk?.distance) > 0,
  `distance=${nearBulk?.distance}`,
);
check(
  "geolocated shop reports a positive fee",
  Number(nearBulk?.delivery_fee) > 0,
  `fee=${nearBulk?.delivery_fee}`,
);

// The agreement invariant: bulk output === direct call output.
const direct = (
  await db.query(`SELECT public.calculate_delivery_fee($1::uuid, $2::float8, $3::float8) AS r`, [
    NEAR,
    LAT,
    LNG,
  ])
).rows[0].r;
check(
  "bulk fee matches a direct calculate_delivery_fee call exactly",
  JSON.stringify(nearBulk) === JSON.stringify(direct),
  `bulk=${JSON.stringify(nearBulk)} direct=${JSON.stringify(direct)}`,
);

// A shop without coordinates must degrade, not throw, and keep its flat fee.
const nogeo = bulk[NOGEO];
check(
  "shop with no coordinates degrades with a reason instead of erroring",
  nogeo?.ok === false && nogeo?.reason === "shop_location_unavailable",
  JSON.stringify(nogeo),
);
check(
  "shop with no coordinates still surfaces its flat fee",
  Number(nogeo?.delivery_fee) === 70,
  `fee=${nogeo?.delivery_fee}`,
);

// Location unknown: every shop should report customer_location_unavailable.
const noLoc = (
  await db.query(`SELECT public.shop_distances(NULL::float8, NULL::float8, $1::uuid[]) AS r`, [
    [NEAR],
  ])
).rows[0].r;
check(
  "unknown customer location degrades with a reason",
  noLoc[NEAR]?.ok === false && noLoc[NEAR]?.reason === "customer_location_unavailable",
  JSON.stringify(noLoc),
);

// Empty input must be an empty object, not an error (the card list can be empty).
const empty = (
  await db.query(`SELECT public.shop_distances($1::float8, $2::float8, '{}'::uuid[]) AS r`, [
    LAT,
    LNG,
  ])
).rows[0].r;
check(
  "empty shop list returns an empty object",
  JSON.stringify(empty) === "{}",
  JSON.stringify(empty),
);

// Permissions: pricing is for signed-in customers, matching calculate_delivery_fee.
const anonCan = (
  await db.query(`
    SELECT has_function_privilege('anon',
      'public.shop_distances(double precision, double precision, uuid[])', 'EXECUTE') AS ok`)
).rows[0].ok;
const authCan = (
  await db.query(`
    SELECT has_function_privilege('authenticated',
      'public.shop_distances(double precision, double precision, uuid[])', 'EXECUTE') AS ok`)
).rows[0].ok;
check("anon cannot execute shop_distances", anonCan === false);
check("authenticated can execute shop_distances", authCan === true);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
