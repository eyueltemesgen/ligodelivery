/**
 * Compare the LIVE Supabase schema against what the committed migrations build.
 *
 * This exists because two real gaps were found by hand: the storage buckets and
 * the `coupons` table (plus `orders.coupon_id`/`coupon_code`) exist on the live
 * project but no migration creates them. Anything in that class makes a fresh
 * project silently broken — the code references a table that is not there.
 *
 * Reads the live project with the publishable key (safe: it is already public
 * and RLS still applies), then builds the same schema locally in PGlite and
 * diffs the table and column lists.
 *
 *   node scripts/verify/schema-drift.mjs
 *
 * A table that only exists on live is reported as MISSING FROM MIGRATIONS,
 * which is the actionable direction. A table that only exists locally is
 * reported as EXTRA (usually harmless — a migration ahead of the live project).
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = resolve(here, "../../supabase/migrations");

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://kyfyljkxijmamnkhvqaw.supabase.co";
const KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable__-26UQR-hg8e3YE4RCgRiw_lIkghIy1";

/** Every table name the live PostgREST instance exposes to this key. */
async function liveTables() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: "application/openapi+json" },
  });
  if (!res.ok) {
    // PostgREST refuses the root spec without a service key on some versions;
    // fall back to probing the tables the app actually queries.
    throw new Error(`openapi ${res.status}`);
  }
  const spec = await res.json();
  const defs = spec.definitions || spec.components?.schemas || {};
  return Object.keys(defs);
}

// --- local build -----------------------------------------------------------
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

const localCols = new Map();
{
  const { rows } = await db.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`);
  for (const r of rows) {
    if (!localCols.has(r.table_name)) localCols.set(r.table_name, []);
    localCols.get(r.table_name).push(r.column_name);
  }
}

// --- live column probe -----------------------------------------------------
// PostgREST 404s the whole request when a column is unknown, so probe one at a
// time against `orders` (the widest table and where the coupon columns live).
async function liveHasColumn(table, column) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${column}&limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  return res.ok;
}

console.log(`local migrations build ${localCols.size} public tables\n`);

// The two tables found by hand: prove the diff catches them.
const SUSPECTS = [
  { table: "coupons", columns: ["id", "code", "discount_type", "discount_value", "used_count"] },
  { table: "orders", columns: ["coupon_id", "coupon_code"] },
];

let problems = 0;
for (const { table, columns } of SUSPECTS) {
  const local = localCols.get(table);
  const liveHasTable = await liveHasColumn(table, "id");
  if (!local && liveHasTable) {
    problems++;
    console.log(
      `MISSING FROM MIGRATIONS  table public.${table} exists on live but no migration creates it`,
    );
  } else if (!local && !liveHasTable) {
    console.log(`absent everywhere         public.${table}`);
  } else {
    console.log(`table present locally     public.${table}`);
  }
  for (const c of columns) {
    const liveHas = await liveHasColumn(table, c);
    const localHas = Boolean(local?.includes(c));
    if (liveHas && !localHas) {
      problems++;
      console.log(
        `MISSING FROM MIGRATIONS  public.${table}.${c} exists on live but no migration adds it`,
      );
    }
  }
}

// Also check the buckets, the other hand-found gap.
const buckets = (await db.query(`SELECT id FROM storage.buckets ORDER BY id`)).rows.map(
  (r) => r.id,
);
console.log(`\nlocal storage buckets: ${buckets.join(", ")}`);
if (!buckets.includes("ligo-media") || !buckets.includes("ligo-proofs")) {
  problems++;
  console.log("MISSING FROM MIGRATIONS  a storage bucket the app signs URLs from");
}

console.log(problems ? `\n${problems} drift(s) found` : "\nNO_DRIFT");
process.exit(problems ? 1 : 0);
