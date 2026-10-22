// Applies every migration TWICE to a blank database.
//
// A single apply only proves the schema can be built from scratch. Re-applying
// proves it is idempotent, which matters when a migration gets run again after
// a partial failure or a re-link: any bare CREATE POLICY/CREATE TRIGGER without
// a DROP IF EXISTS guard fails on the second pass and only on the second pass.
//
// Seven migrations have carried that flaw since they were written (see
// KNOWN_NOT_IDEMPOTENT). They are listed rather than fixed because they are
// already applied everywhere and a normal incremental run never re-executes
// them; the list exists so a NEW failure is loud. Do not add to it without
// understanding why.
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";

/** Pre-existing second-pass failures, all bare CREATE POLICY/seed INSERT. */
const KNOWN_NOT_IDEMPOTENT = new Set([
  "20260813201511_feba6b02-632d-4747-a29e-d19ba3fbec67.sql", // CREATE TYPE app_role
  "20260813201602_dc0177f8-362a-40d7-9898-7fb03d47c41f.sql", // CREATE POLICY media_public_read
  "20260813201705_ec880e85-a041-4d20-af9c-f4c9fad30bca.sql", // seed INSERT categories
  "20260817105403_58833ecc-3efc-4b3e-b508-65dacf3fbacb.sql", // CREATE POLICY media_owner_avatar_read
  "20260819181500_3f5b7c2a-9d4e-4f1a-b8c6-2e7a9d1c4f55.sql", // CREATE POLICY shop_hours_owner_write
  "20260819193000_8a1e4c6d-2b3f-4a5e-9c7d-1f2e3a4b5c66.sql", // CREATE POLICY shops_merchant_insert
  "20260905143155_45f61647-f0c1-4b6f-9775-d3dc420dc1b4.sql", // CREATE POLICY categories_anon_read
]);

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

const files = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort();

const regressions = [];
for (const pass of [1, 2]) {
  for (const f of files) {
    try {
      await db.exec(readFileSync("supabase/migrations/" + f, "utf8"));
    } catch (err) {
      const msg = String(err.message ?? err).split("\n")[0];
      const expected = pass === 2 && KNOWN_NOT_IDEMPOTENT.has(f);
      console.log(`${expected ? "known" : "FAIL "} pass ${pass}  ${f}\n      ${msg}`);
      if (!expected) regressions.push(`${f}: ${msg}`);
    }
  }
  console.log(`--- pass ${pass} complete (${files.length} migrations) ---`);
}

if (regressions.length) {
  console.log(`\n${regressions.length} NEW failure(s) — a migration is not replayable:`);
  for (const r of regressions) console.log("  " + r);
  process.exit(1);
}
console.log(`\nNO_REGRESSIONS (${KNOWN_NOT_IDEMPOTENT.size} known pre-existing)`);
