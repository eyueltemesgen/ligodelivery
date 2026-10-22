/**
 * Export the live project's rows and storage objects to a local folder.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate/export.mjs out/
 *
 * The service-role key is required: RLS hides customers' orders, profiles and
 * payment proofs from the publishable key, so an anon export would silently
 * produce an empty (but plausible-looking) dataset. Writes to
 * `<out>/data/<table>.json` and `<out>/storage/<bucket>/<path>`.
 *
 * `--skip-storage` exports rows only, which is enough to rehearse an import.
 */
import { resolve, join } from "node:path";
import {
  REPO,
  TABLE_ORDER,
  BUCKETS,
  target,
  fetchAll,
  listObjects,
  downloadObject,
  writeJson,
  contentTypeFor,
} from "./lib.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const outArg = process.argv[2] ?? "supabase-export";
const outDir = resolve(REPO, outArg);
const skipStorage = process.argv.includes("--skip-storage");
const t = target();

console.log(`exporting from ${t.url}\n→ ${outDir}\n`);

const counts = {};
for (const table of TABLE_ORDER) {
  const rows = await fetchAll(t, table);
  if (rows === null) {
    console.log(`  ${table.padEnd(22)} (no such table)`);
    continue;
  }
  writeJson(join(outDir, "data", `${table}.json`), rows);
  counts[table] = rows.length;
  console.log(`  ${table.padEnd(22)} ${rows.length}`);
}

if (skipStorage) {
  console.log("\n--skip-storage: not exporting objects");
} else {
  console.log("\nstorage:");
  for (const bucket of BUCKETS) {
    const paths = await listObjects(t, bucket);
    for (const p of paths) {
      const buf = await downloadObject(t, bucket, p);
      const dest = join(outDir, "storage", bucket, p);
      mkdirSync(resolve(dest, ".."), { recursive: true });
      writeFileSync(dest, buf);
    }
    console.log(`  ${bucket.padEnd(22)} ${paths.length} objects`);
    counts[`storage:${bucket}`] = paths.length;
  }
}

writeJson(join(outDir, "manifest.json"), {
  exportedAt: new Date().toISOString(),
  sourceUrl: t.url,
  counts,
});

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`\ndone: ${total} items → ${outDir}`);
