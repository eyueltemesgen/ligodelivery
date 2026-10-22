/**
 * Prove the whole schema builds from nothing.
 *
 * The point of this harness is the cutover question: if we move to a fresh
 * Supabase project, do the 40 committed migrations actually reconstruct the
 * database, or do they quietly assume state that only exists on the Lovable
 * project (a table added through the dashboard, a bucket, a publication entry)?
 *
 * There is no local Supabase stack here, so the handful of Supabase-provided
 * objects the migrations touch are shimmed to match the real signatures:
 * `auth.uid()`, `auth.users`, `storage.objects`, `storage.foldername()`,
 * `storage.buckets`, the three API roles, and the `supabase_realtime`
 * publication. Everything else is the repo's own SQL, applied in filename order
 * exactly as `supabase db push` would.
 *
 * A failure here is a real blocker for the move: it names the migration that
 * cannot apply to a blank project.
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = resolve(here, "../../supabase/migrations");

const db = new PGlite();

// --- the Supabase-provided surface, shimmed --------------------------------
await db.exec(`
  CREATE ROLE anon NOLOGIN NOINHERIT;
  CREATE ROLE authenticated NOLOGIN NOINHERIT;
  CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

  CREATE SCHEMA auth;
  CREATE TABLE auth.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  -- Real Supabase reads the JWT claim; a settings GUC is close enough for DDL.
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (
    id text PRIMARY KEY,
    name text NOT NULL,
    public boolean NOT NULL DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE storage.objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text REFERENCES storage.buckets(id),
    name text,
    owner uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb
  );
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  -- Supabase splits an object path into folder segments.
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
    SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;

  CREATE PUBLICATION supabase_realtime;
`);

const files = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`applying ${files.length} migrations to a blank database\n`);

let applied = 0;
const failures = [];

for (const file of files) {
  const sql = readFileSync(resolve(MIGRATIONS, file), "utf8");
  try {
    await db.exec(sql);
    applied++;
  } catch (err) {
    failures.push({ file, message: String(err.message ?? err).split("\n")[0] });
    console.log(`FAIL  ${file}`);
    console.log(`      ${String(err.message ?? err).split("\n").slice(0, 3).join("\n      ")}`);
  }
}

console.log(`\napplied ${applied}/${files.length}`);

// --- what a working storefront needs to exist -------------------------------
const tables = await db.query(`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
`);
const names = new Set(tables.rows.map((r) => r.tablename));
const required = [
  "shops",
  "products",
  "orders",
  "order_items",
  "profiles",
  "user_roles",
  "riders",
  "reviews",
  "settings",
  "banners",
  "categories",
  "notifications",
  "addresses",
  "wishlist",
  "delivery_fee_rules",
  "service_requests",
];
const missing = required.filter((t) => !names.has(t));
console.log(`public tables: ${names.size}`);
if (missing.length) console.log(`MISSING tables: ${missing.join(", ")}`);

const funcs = await db.query(`
  SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
`);
const fnames = new Set(funcs.rows.map((r) => r.proname));
const requiredFns = [
  "has_role",
  "is_admin",
  "place_order",
  "approve_and_dispatch",
  "accept_order",
  "complete_delivery",
  "calculate_delivery_fee",
  "notify_order_status",
  "reviews_recompute_aggregates",
  "owns_shop",
  "customer_can_see_rider",
];
const missingFns = requiredFns.filter((f) => !fnames.has(f));
if (missingFns.length) console.log(`MISSING functions: ${missingFns.join(", ")}`);

// The buckets are referenced by storage policies but created by no migration.
const buckets = await db.query(`SELECT id FROM storage.buckets`);
const bucketIds = new Set(buckets.rows.map((r) => r.id));
console.log(`storage buckets created by migrations: ${bucketIds.size ? [...bucketIds].join(", ") : "(none)"}`);

const pub = await db.query(`
  SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename
`);
console.log(`realtime tables: ${pub.rows.map((r) => r.tablename).join(", ") || "(none)"}`);

console.log("");
let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  ok ? pass++ : fail++;
};

check("every migration applies to a blank database", failures.length === 0,
  failures.map((f) => f.file).join(", "));
check("all required tables exist", missing.length === 0, missing.join(", "));
check("all required functions exist", missingFns.length === 0, missingFns.join(", "));
check("realtime publication has the live tables", pub.rows.length > 0);
check(
  "storage buckets are created by a migration",
  bucketIds.has("ligo-media") && bucketIds.has("ligo-proofs"),
  `got ${[...bucketIds].join(", ") || "none"}`,
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
