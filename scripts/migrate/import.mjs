/**
 * Import an exported folder into a (new) Supabase project.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate/import.mjs supabase-export
 *
 * Prerequisites, in order:
 *   1. Apply the migrations to the target project (`supabase db push`, or paste
 *      them in the SQL editor). Without the schema nothing can be imported.
 *   2. If the export contains real users, recreate them first — see the
 *      "Users" section of docs/supabase-cutover.md. Rows that reference
 *      `auth.users` (e.g. `shops.owner_id`) cannot import until those ids
 *      exist.
 *
 * Rows are inserted in FK-safe order. A failing table is reported and skipped
 * rather than aborting the whole run, so one unresolved foreign key does not
 * hide everything else.
 *
 * `--replace` truncates every exported table in the target first, so the target
 * ends up matching the source exactly. **Use it for a cutover.** It matters
 * more than it sounds: the migrations seed demo shops, categories and products
 * with random UUIDs, so a freshly migrated project is not empty. A plain merge
 * would collide on the unique `slug` of the seeded categories, insert a second
 * copy of every seeded shop (there is no unique key on shop name), and leave
 * the imported products pointing at the wrong shop ids.
 */
import { resolve, join } from "node:path";
import {
  REPO,
  TABLE_ORDER,
  BUCKETS,
  target,
  headers,
  uploadObject,
  readJson,
  contentTypeFor,
} from "./lib.mjs";
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";

const inArg = process.argv[2] ?? "supabase-export";
const inDir = resolve(REPO, inArg);
const replace = process.argv.includes("--replace");
const t = target();

if (!existsSync(inDir)) {
  console.error(`No export folder at ${inDir}. Run export.mjs first.`);
  process.exit(2);
}

console.log(`importing ${inDir}\n→ ${t.url}`);
console.log(replace ? "mode: --replace (target rows cleared first)\n" : "mode: merge (upsert)\n");

const manifest = readJson(join(inDir, "manifest.json"));
if (manifest) console.log(`export taken ${manifest.exportedAt} from ${manifest.sourceUrl}\n`);

/** Tables present in this export, in FK-safe order. */
const present = TABLE_ORDER.filter((table) => {
  const rows = readJson(join(inDir, "data", `${table}.json`));
  return rows && rows.length > 0;
});

if (replace) {
  // Children first, so truncating a parent never trips a foreign key. `CASCADE`
  // covers any table the export does not include.
  for (const table of [...present].reverse()) {
    const res = await fetch(`${t.url}/rest/v1/${table}?id=not.is.null`, {
      method: "DELETE",
      headers: headers(t, { Prefer: "return=minimal" }),
    });
    if (!res.ok && res.status !== 404) {
      console.log(
        `  clear ${table.padEnd(20)} HTTP ${res.status} ${(await res.text()).slice(0, 120)}`,
      );
    }
  }
  console.log("");
}

const results = [];
for (const table of present) {
  const rows = readJson(join(inDir, "data", `${table}.json`));

  // Upsert so a re-run repairs rather than duplicates. `resolution=merge-duplicates`
  // needs a primary key on the payload, which every exported table has.
  const res = await fetch(`${t.url}/rest/v1/${table}`, {
    method: "POST",
    headers: headers(t, {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify(rows),
  });

  if (res.ok) {
    results.push({ table, count: rows.length, ok: true });
    console.log(`  ${table.padEnd(22)} ${rows.length}`);
  } else {
    const body = (await res.text()).slice(0, 300);
    results.push({ table, count: rows.length, ok: false, error: body });
    console.log(`  ${table.padEnd(22)} FAILED: ${body}`);
  }
}

// --- storage -----------------------------------------------------------------
const storageRoot = join(inDir, "storage");
if (existsSync(storageRoot)) {
  console.log("\nstorage:");
  for (const bucket of BUCKETS) {
    const bucketRoot = join(storageRoot, bucket);
    if (!existsSync(bucketRoot)) continue;

    // Walk the folder recursively; object keys are the relative paths.
    const walk = (dir, prefix = "") =>
      readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);
        const rel = prefix ? `${prefix}/${name}` : name;
        return statSync(full).isDirectory() ? walk(full, rel) : [rel];
      });

    const paths = walk(bucketRoot);
    for (const p of paths) {
      await uploadObject(t, bucket, p, readFileSync(join(bucketRoot, p)), contentTypeFor(p));
    }
    console.log(`  ${bucket.padEnd(22)} ${paths.length} objects`);
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} tables imported`);
if (failed.length) {
  console.log("\nTables that failed:");
  for (const f of failed) console.log(`  ${f.table}: ${f.error.split("\n")[0]}`);
  console.log(
    "\nA foreign-key failure usually means the referenced row (often an " +
      "`auth.users` id) does not exist yet. Recreate users, then re-run.",
  );
  process.exit(1);
}
