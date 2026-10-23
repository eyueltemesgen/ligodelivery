/**
 * Compare the LIVE Supabase schema against what the committed migrations build.
 *
 * This exists because real gaps kept being found by hand: the storage buckets,
 * then `coupons` (plus `orders.coupon_id`/`coupon_code`), then the whole
 * advertising subsystem. Anything in that class makes a fresh project silently
 * broken — the code references a table that is not there.
 *
 *   node scripts/verify/schema-drift.mjs
 *
 * The live schema of record is the committed `src/integrations/supabase/types.ts`
 * (generated from the live project). PostgREST refuses to hand out its own
 * OpenAPI spec to a publishable key (401), so there is no way to enumerate live
 * tables directly with the key we are allowed to use. types.ts is the honest
 * proxy and has the advantage of being pinned in git.
 *
 * An earlier version of this file only checked a hardcoded list of the tables
 * already known to be missing, so it could never find the *next* gap — which is
 * exactly how five advertising tables stayed hidden. It now diffs every table,
 * column and function.
 *
 * Exit code is non-zero when a table, column or function exists on live but no
 * migration creates it.
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "../..");
const MIGRATIONS = resolve(ROOT, "supabase/migrations");

// --- live schema of record: the generated types.ts --------------------------
/**
 * Pull the table/column and function lists out of the generated types file.
 *
 * The file is machine-written in a fixed shape, so a line scanner is more
 * robust here than a full TS parse: table names sit at six spaces under
 * `Tables:`, `Row:` fields at ten, and `Functions:` entries at six.
 */
function parseLiveTypes(src) {
  const lines = src.split("\n");
  const tables = new Map();
  const functions = new Set();

  const tablesAt = lines.findIndex((l) => /^ {4}Tables: \{$/.test(l));
  const funcsAt = lines.findIndex((l) => /^ {4}Functions: \{$/.test(l));
  if (tablesAt === -1) throw new Error("could not locate the Tables block in types.ts");

  let current = null;
  let inRow = false;
  for (let i = tablesAt + 1; i < (funcsAt === -1 ? lines.length : funcsAt); i++) {
    const line = lines[i];
    const table = line.match(/^ {6}([a-z0-9_]+): \{$/);
    if (table) {
      current = table[1];
      tables.set(current, []);
      inRow = false;
      continue;
    }
    if (!current) continue;
    if (/^ {8}Row: \{$/.test(line)) {
      inRow = true;
      continue;
    }
    if (inRow) {
      // The Row block ends at eight-space `}`; anything else at that indent
      // (Insert/Update/Relationships) also ends it.
      if (/^ {8}\}/.test(line)) {
        inRow = false;
        continue;
      }
      const col = line.match(/^ {10}([a-z0-9_]+):/);
      if (col) tables.get(current).push(col[1]);
    }
  }

  if (funcsAt !== -1) {
    for (let i = funcsAt + 1; i < lines.length; i++) {
      const fn = lines[i].match(/^ {6}([a-z0-9_]+): \{$/);
      if (fn) functions.add(fn[1]);
      if (/^ {4}\}/.test(lines[i])) break;
    }
  }

  return { tables, functions };
}

const typesSrc = readFileSync(resolve(ROOT, "src/integrations/supabase/types.ts"), "utf8");
const live = parseLiveTypes(typesSrc);
if (live.tables.size < 20) {
  throw new Error(`types.ts parse looks wrong: only ${live.tables.size} tables found`);
}

// --- which of those does the app actually use? ------------------------------
// A missing table the app never queries is a curiosity; one it queries is an
// outage waiting to happen. Annotating the output keeps it actionable.
const appSrc = [];
for (const dir of ["src/lib", "src/routes", "src/components", "src/hooks"]) {
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = resolve(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) appSrc.push(readFileSync(p, "utf8"));
    }
  };
  try {
    walk(resolve(ROOT, dir));
  } catch {
    /* directory may not exist */
  }
}
const appText = appSrc.join("\n");
const appUsesTable = (t) =>
  new RegExp(`\\.from\\(["'\`]${t}["'\`]\\)`).test(appText) ||
  new RegExp(`\\b${t}\\b`).test(appText);
const appUsesFn = (f) => new RegExp(`\\.rpc\\(["'\`]${f}["'\`]`).test(appText);

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
const localFns = new Set(
  (
    await db.query(
      `SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'`,
    )
  ).rows.map((r) => r.proname),
);

// --- diff ------------------------------------------------------------------
// Known, understood gaps that are deliberately NOT fixed yet. Without this the
// report repeats the same lines forever, and a check that always fails is a
// check nobody reads — which is how the first version of this file missed five
// tables. Each entry must say why it is tolerated.
const KNOWN_GAPS = new Map([
  [
    "ad_campaigns",
    "half-built advertising subsystem: tables exist on live but the UI is not wired in (AdvertisingHub is never mounted, AdSlot is rendered nowhere) and lib/ads.ts is @ts-nocheck with column names that do not match live. Reconstructing the schema would be guessing at a feature that is not switched on.",
  ],
  ["ad_packages", "same advertising subsystem as ad_campaigns"],
  ["ad_placements", "same advertising subsystem as ad_campaigns"],
  ["ads", "same advertising subsystem as ad_campaigns"],
  ["advertisers", "same advertising subsystem as ad_campaigns"],
  [
    "ad_stats()",
    "part of the unwired advertising subsystem; works on live but only AdvertisingHub calls it",
  ],
  [
    "track_ad_event()",
    "part of the unwired advertising subsystem; ALSO broken on live (references a `placement` column that does not exist)",
  ],
]);

console.log(`live types.ts: ${live.tables.size} tables, ${live.functions.size} functions`);
console.log(`local migrations: ${localCols.size} tables, ${localFns.size} functions\n`);

let critical = 0;
let notes = 0;
let known = 0;

for (const [table, cols] of [...live.tables].sort()) {
  const local = localCols.get(table);
  if (!local) {
    if (KNOWN_GAPS.has(table)) {
      known++;
      continue;
    }
    const used = appUsesTable(table);
    if (used) critical++;
    else notes++;
    console.log(
      `${used ? "MISSING FROM MIGRATIONS " : "unused on live           "} table public.${table}` +
        (used ? "  <- the app queries this" : ""),
    );
    continue;
  }
  const missing = cols.filter((c) => !local.includes(c));
  if (missing.length) {
    if (KNOWN_GAPS.has(table)) {
      known += missing.length;
      continue;
    }
    const used = appUsesTable(table);
    if (used) critical += missing.length;
    else notes += missing.length;
    console.log(
      `${used ? "MISSING FROM MIGRATIONS " : "unused on live           "} public.${table}: ${missing.join(", ")}`,
    );
  }
}

for (const fn of [...live.functions].sort()) {
  if (localFns.has(fn)) continue;
  if (KNOWN_GAPS.has(`${fn}()`)) {
    known++;
    continue;
  }
  const used = appUsesFn(fn);
  if (used) critical++;
  else notes++;
  console.log(
    `${used ? "MISSING FROM MIGRATIONS " : "unused on live           "} function public.${fn}()` +
      (used ? "  <- the app calls this" : ""),
  );
}

// The buckets are not in types.ts, so check them explicitly.
const buckets = (await db.query(`SELECT id FROM storage.buckets ORDER BY id`)).rows.map(
  (r) => r.id,
);
console.log(`\nlocal storage buckets: ${buckets.join(", ")}`);
for (const b of ["ligo-media", "ligo-proofs"]) {
  if (!buckets.includes(b)) {
    critical++;
    console.log(`MISSING FROM MIGRATIONS  storage bucket ${b}`);
  }
}

if (known) {
  console.log(`\n${known} known gap(s), understood and deliberately unfixed:`);
  for (const [k, why] of KNOWN_GAPS) console.log(`  ${k} — ${why}`);
}

console.log(
  critical
    ? `\n${critical} drift(s) the app depends on${notes ? `, ${notes} unused` : ""}`
    : `\nNO_DRIFT${notes ? ` (${notes} unused-on-live differences ignored)` : ""}`,
);
process.exit(critical ? 1 : 0);
