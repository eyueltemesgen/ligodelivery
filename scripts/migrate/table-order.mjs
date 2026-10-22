/**
 * Derive an FK-safe table order for the export/import scripts.
 *
 * Rebuilding the schema in PGlite lets us ask Postgres itself which tables
 * depend on which, instead of hand-maintaining an order that silently breaks
 * when a migration adds a foreign key. Prints parents before children, so
 * inserting in this order never violates a constraint.
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = resolve(here, "../../supabase/migrations");
const db = new PGlite();

await db.exec(`
  CREATE ROLE anon NOLOGIN NOINHERIT;
  CREATE ROLE authenticated NOLOGIN NOINHERIT;
  CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now());
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL,
    public boolean NOT NULL DEFAULT false, file_size_limit bigint,
    allowed_mime_types text[], created_at timestamptz NOT NULL DEFAULT now());
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

// Topological sort over foreign keys, restricted to public tables.
const { rows: fks } = await db.query(`
  SELECT tc.table_name AS child, ccu.table_name AS parent
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public' AND ccu.table_schema = 'public'
`);

const { rows: all } = await db.query(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
);
const tables = all.map((r) => r.tablename);
const deps = new Map(tables.map((t) => [t, new Set()]));
for (const { child, parent } of fks) {
  if (child !== parent && deps.has(child)) deps.get(child).add(parent);
}

const order = [];
const seen = new Set();
const visit = (t, stack = new Set()) => {
  if (seen.has(t) || stack.has(t)) return;
  stack.add(t);
  for (const p of [...(deps.get(t) ?? [])].sort()) visit(p, stack);
  stack.delete(t);
  seen.add(t);
  order.push(t);
};
for (const t of tables) visit(t);
for (const t of tables) if (!seen.has(t)) order.push(t);

console.log(JSON.stringify(order, null, 2));
