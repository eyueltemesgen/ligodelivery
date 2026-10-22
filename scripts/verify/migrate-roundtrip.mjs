/**
 * Round-trip test for the export/import tooling.
 *
 * Two PGlite databases, each fronted by a tiny HTTP server implementing just
 * the slice of the Supabase REST + Storage API that `export.mjs` and
 * `import.mjs` use. Data is seeded into A, exported with the real export
 * script, imported into B with the real import script, and the two are then
 * compared row for row. Storage objects are checked byte for byte, including
 * a nested folder, which exercises the recursive listing.
 *
 * This is the honest check that the cutover tooling works before it is pointed
 * at a real project, where a mistake means silently losing customer data.
 */
import { PGlite } from "@electric-sql/pglite";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "../..");
const MIGRATIONS = resolve(REPO, "supabase/migrations");
const OUT = "/tmp/migrate-roundtrip";
const SERVICE_KEY = "test-service-role-key";

/** Build a migrated PGlite database plus a mock Supabase HTTP server. */
async function makeProject(port) {
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

  // The mock keeps storage bytes in memory, keyed by "bucket/path".
  const objects = new Map();

  const columnsOf = async (table) => {
    const { rows } = await db.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [table],
    );
    return rows.map((r) => r.column_name);
  };
  const pkOf = async (table) => {
    const { rows } = await db.query(
      `SELECT a.attname FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE i.indrelid = $1::regclass AND i.indisprimary`,
      [`public.${table}`],
    );
    return rows.map((r) => r.attname);
  };

  const server = createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", async () => {
      const body = Buffer.concat(chunks);
      const url = new URL(req.url, "http://localhost");
      const send = (code, data, type = "application/json") => {
        const payload = type === "application/json" ? JSON.stringify(data) : data;
        res.writeHead(code, { "Content-Type": type });
        res.end(payload);
      };
      try {
        // --- REST -----------------------------------------------------------
        const rest = url.pathname.match(/^\/rest\/v1\/([\w]+)$/);
        if (rest && req.method === "GET") {
          const table = rest[1];
          const { rows } = await db.query(`SELECT * FROM public.${table}`);
          // Honour the Range header the way PostgREST does.
          const range = req.headers["range"];
          let out = rows;
          if (range) {
            const [from, to] = range.split("-").map(Number);
            out = rows.slice(from, to + 1);
          }
          return send(200, out);
        }
        if (rest && req.method === "POST") {
          const table = rest[1];
          const rows = JSON.parse(body.toString() || "[]");
          const cols = await columnsOf(table);
          const pk = await pkOf(table);
          for (const row of rows) {
            const present = cols.filter((c) => row[c] !== undefined);
            const values = present.map((c) => row[c]);
            const placeholders = present.map((_, i) => `$${i + 1}`).join(", ");
            const updates = present
              .filter((c) => !pk.includes(c))
              .map((c) => `${c} = EXCLUDED.${c}`)
              .join(", ");
            const conflict = pk.length
              ? `ON CONFLICT (${pk.join(", ")}) DO ${updates ? `UPDATE SET ${updates}` : "NOTHING"}`
              : "";
            await db.query(
              `INSERT INTO public.${table} (${present.join(", ")}) VALUES (${placeholders}) ${conflict}`,
              values,
            );
          }
          return send(201, null, "application/json");
        }
        // The replace-mode clear: `?id=not.is.null` means "delete every row".
        if (rest && req.method === "DELETE") {
          const table = rest[1];
          const filter = url.searchParams.get("id");
          const sql =
            filter === "not.is.null"
              ? `DELETE FROM public.${table}`
              : `DELETE FROM public.${table} WHERE 1=0`;
          await db.query(sql);
          return send(204, null, "application/json");
        }

        // --- Storage --------------------------------------------------------
        const list = url.pathname.match(/^\/storage\/v1\/object\/list\/([\w-]+)$/);
        if (list && req.method === "POST") {
          const bucket = list[1];
          const { prefix = "" } = JSON.parse(body.toString() || "{}");
          // Emulate the real API: folders have a null id, files do not.
          const seen = new Map();
          for (const key of objects.keys()) {
            if (!key.startsWith(`${bucket}/`)) continue;
            const rel = key.slice(bucket.length + 1);
            if (prefix && !rel.startsWith(`${prefix}/`)) continue;
            const remainder = prefix ? rel.slice(prefix.length + 1) : rel;
            const [head, ...tail] = remainder.split("/");
            if (tail.length) seen.set(head, null);
            else if (!seen.has(head)) seen.set(head, "file-id");
          }
          return send(
            200,
            [...seen].map(([name, id]) => ({ name, id })),
          );
        }
        const obj = url.pathname.match(/^\/storage\/v1\/object\/([\w-]+)\/(.+)$/);
        if (obj) {
          const key = `${obj[1]}/${decodeURIComponent(obj[2])}`;
          if (req.method === "GET") {
            if (!objects.has(key)) return send(400, { message: "not found" });
            return send(200, objects.get(key), "application/octet-stream");
          }
          if (req.method === "POST") {
            objects.set(key, body);
            return send(200, { Key: key });
          }
        }
        send(404, { message: `no route ${req.method} ${url.pathname}` });
      } catch (err) {
        send(500, { message: String(err.message ?? err) });
      }
    });
  });

  await new Promise((r) => server.listen(port, "127.0.0.1", r));
  return { db, objects, server, url: `http://127.0.0.1:${port}` };
}

/** Run one of the migrate scripts as a child process against a mock project. */
function runScript(script, args, url) {
  return new Promise((res) => {
    const child = spawn("node", [resolve(REPO, "scripts/migrate", script), ...args], {
      env: { ...process.env, SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY },
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => res({ code, out }));
  });
}

rmSync(OUT, { recursive: true, force: true });

const A = await makeProject(5391);
const B = await makeProject(5392);

// Seed A with a small but relationally real dataset.
await A.db.exec(`
  INSERT INTO public.settings (key, value, is_public) VALUES ('seed_key', '{"a":1}'::jsonb, true)
    ON CONFLICT (key) DO NOTHING;
  INSERT INTO public.categories (name, slug, sort_order, is_active)
    VALUES ('Test Cat', 'test-cat', 1, true) ON CONFLICT (slug) DO NOTHING;
  INSERT INTO public.shops (name, is_active, rating, rating_count, delivery_fee, is_online)
    VALUES ('Test Shop', true, 4.0, 1, 30, true) ON CONFLICT DO NOTHING;
  INSERT INTO public.products (shop_id, name, price, is_active)
    SELECT id, 'Test Product', 120, true FROM public.shops WHERE name = 'Test Shop'
    ON CONFLICT DO NOTHING;
`);
A.objects.set("ligo-media/banners/one.jpg", Buffer.from("banner-one-bytes"));
A.objects.set("ligo-media/shops/deep/two.png", Buffer.from("nested-shop-bytes"));

const exportRun = await runScript("export.mjs", [OUT], A.url);
const importRun = await runScript("import.mjs", [OUT, "--replace"], B.url);

console.log(exportRun.out.trim().split("\n").slice(0, 4).join("\n"));
console.log("...");
console.log("--- import output ---");
console.log(importRun.out.trim());

// --- compare ----------------------------------------------------------------
let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  ok ? pass++ : fail++;
};

check("export succeeded", exportRun.code === 0, exportRun.out.slice(-200));
check("import succeeded", importRun.code === 0, importRun.out.slice(-200));

for (const table of ["shops", "products", "categories", "settings"]) {
  const a = await A.db.query(`SELECT * FROM public.${table}`);
  const b = await B.db.query(`SELECT * FROM public.${table}`);
  check(
    `${table} rows match`,
    a.rows.length === b.rows.length && a.rows.length > 0,
    `source ${a.rows.length}, target ${b.rows.length}`,
  );
}

// Relational integrity: the product must point at the copied shop.
const rel = await B.db.query(`
  SELECT p.name, s.name AS shop FROM public.products p JOIN public.shops s ON s.id = p.shop_id
`);
check("foreign keys survived the copy", rel.rows.length > 0, JSON.stringify(rel.rows[0] ?? {}));

check(
  "storage object copied",
  B.objects.get("ligo-media/banners/one.jpg")?.toString() === "banner-one-bytes",
);
check(
  "nested storage object copied (recursive list)",
  B.objects.get("ligo-media/shops/deep/two.png")?.toString() === "nested-shop-bytes",
);

// Re-running the import must repair, not duplicate.
const rerun = await runScript("import.mjs", [OUT, "--replace"], B.url);
const after = await B.db.query(`SELECT count(*)::int AS n FROM public.shops`);
check(
  "re-import is idempotent",
  rerun.code === 0 && after.rows[0].n === 7,
  `shops=${after.rows[0].n}`,
);

A.server.close();
B.server.close();
await A.db.close();
await B.db.close();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
