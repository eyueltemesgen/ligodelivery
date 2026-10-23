/**
 * Every column a trigger writes must actually exist on its table.
 *
 * This is the generic form of a real bug: `rider_earnings.updated_at` was never
 * created, but `rider_earnings_updated` calls `update_updated_at_column()`,
 * which does `NEW.updated_at = now()`. Postgres only resolves that at runtime,
 * so the table created, read and migrated perfectly happily — and then every
 * UPDATE failed with `record "new" has no field "updated_at"`. A schema diff
 * caught it only because the live project happened to have the column.
 *
 * Rather than test for that one column, this walks every BEFORE/AFTER trigger in
 * the built schema, extracts the `NEW.<col>` references from its function body,
 * and asserts the column exists. Any future trigger/table mismatch fails here.
 *
 *   node scripts/verify/trigger-columns-sql.mjs
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

// --- gather triggers and the NEW.<col> references in their function bodies ----
const triggers = (
  await db.query(`
    SELECT t.tgname AS trigger_name,
           c.relname AS table_name,
           n.nspname AS schema_name,
           p.proname AS function_name,
           p.prosrc AS body
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal AND n.nspname = 'public'
    ORDER BY c.relname, t.tgname`)
).rows;

const columnsFor = new Map();
for (const r of (
  await db.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public'`)
).rows) {
  if (!columnsFor.has(r.table_name)) columnsFor.set(r.table_name, new Set());
  columnsFor.get(r.table_name).add(r.column_name);
}

check("triggers were found in the built schema", triggers.length > 0, `${triggers.length}`);

let mismatches = 0;
let checkedRefs = 0;
for (const t of triggers) {
  // `NEW.col` and `NEW.col =` — word boundary stops `NEW.updated_at` matching
  // a prefix of a longer name.
  const refs = new Set(
    [...String(t.body).matchAll(/\bNEW\.([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()),
  );
  const cols = columnsFor.get(t.table_name) ?? new Set();
  for (const col of refs) {
    checkedRefs++;
    if (!cols.has(col)) {
      mismatches++;
      console.log(
        `FAIL  trigger ${t.trigger_name} on public.${t.table_name} writes NEW.${col}, which does not exist`,
      );
    }
  }
}
check(
  "every column a trigger writes exists on its table",
  mismatches === 0,
  `${mismatches} mismatch(es) across ${checkedRefs} reference(s)`,
);

// Prove the check has teeth: the guard must flag a deliberately broken pair.
{
  await db.exec(`
    CREATE TABLE public._probe_missing_col (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    CREATE TRIGGER _probe_bad BEFORE UPDATE ON public._probe_missing_col
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  `);
  const probe = (
    await db.query(`
      SELECT p.prosrc AS body FROM pg_trigger t
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE t.tgname = '_probe_bad'`)
  ).rows[0];
  const refs = [...String(probe.body).matchAll(/\bNEW\.([a-z_][a-z0-9_]*)/gi)].map((m) =>
    m[1].toLowerCase(),
  );
  check("the check detects a trigger writing a missing column", refs.includes("updated_at"));
  await db.exec(`DROP TABLE public._probe_missing_col`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
