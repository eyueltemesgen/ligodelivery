/**
 * Shared helpers for exporting and importing a Supabase project.
 *
 * Both scripts talk to the REST and Storage APIs with a **service-role** key,
 * because RLS deliberately hides customer data from the publishable key (an
 * anonymous read of `orders` returns `[]`, not an error). Nothing here prints
 * or persists the key.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(here, "../..");

/** Tables to move. Order is FK-safe; see `table-order.mjs`. */
export const TABLE_ORDER = [
  "addresses",
  "admin_bootstrap",
  "banners",
  "categories",
  "delivery_fee_rules",
  "riders",
  "service_categories",
  "shops",
  "services",
  "service_requests",
  "orders",
  "loyalty_ledger",
  "loyalty_wallets",
  "merchant_profiles",
  "merchant_payouts",
  "products",
  "merchant_promotions",
  "notifications",
  "offers",
  "order_items",
  "payment_proofs",
  "payout_requests",
  "product_option_groups",
  "product_options",
  "profiles",
  "report_history",
  "reviews",
  "rider_earnings",
  "rider_offer_events",
  "rider_ratings",
  "service_addons",
  "settings",
  "shop_favorites",
  "shop_hours",
  "user_roles",
  "wishlist",
];

export const BUCKETS = ["ligo-media", "ligo-proofs"];

export function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}.`);
    console.error(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Supabase dashboard → Project Settings → API).",
    );
    process.exit(2);
  }
  return v;
}

export function target() {
  return {
    url: requireEnv("SUPABASE_URL").replace(/\/$/, ""),
    key: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function headers(t, extra = {}) {
  return { apikey: t.key, Authorization: `Bearer ${t.key}`, ...extra };
}

/** Read every row of a table, paginating past the 1000-row default. */
export async function fetchAll(t, table) {
  const out = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${t.url}/rest/v1/${table}?select=*`, {
      headers: headers(t, { Range: `${from}-${from + PAGE - 1}`, "Range-Unit": "items" }),
    });
    if (!res.ok) {
      // A table that does not exist on this project is skipped, not fatal: the
      // schema is rebuilt from migrations, so a missing table means "empty".
      if (res.status === 404) return null;
      // 401/403 means the key lacks privileges, which in practice means the
      // publishable key was used instead of the service-role key. Say so, or
      // the raw "permission denied for table loyalty_ledger" reads like a bug.
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          `${table}: HTTP ${res.status}. The key is not allowed to read this table — ` +
            `use the SERVICE ROLE key, not the publishable/anon key.\n${await res.text()}`,
        );
      }
      throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    }
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

export async function listObjects(t, bucket, prefix = "") {
  const res = await fetch(`${t.url}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: headers(t, { "Content-Type": "application/json" }),
    body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: "name", order: "asc" } }),
  });
  if (!res.ok) {
    if (res.status === 404 || res.status === 400) return [];
    throw new Error(`list ${bucket}/${prefix}: HTTP ${res.status} ${await res.text()}`);
  }
  const entries = await res.json();
  const files = [];
  for (const e of entries) {
    const path = prefix ? `${prefix}/${e.name}` : e.name;
    // Folders come back with a null id; recurse into them.
    if (e.id === null || e.id === undefined) files.push(...(await listObjects(t, bucket, path)));
    else files.push(path);
  }
  return files;
}

export async function downloadObject(t, bucket, path) {
  const res = await fetch(`${t.url}/storage/v1/object/${bucket}/${path}`, { headers: headers(t) });
  if (!res.ok) throw new Error(`download ${bucket}/${path}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function uploadObject(t, bucket, path, buf, contentType) {
  const res = await fetch(`${t.url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: headers(t, {
      "Content-Type": contentType ?? "application/octet-stream",
      "x-upsert": "true",
    }),
    body: buf,
  });
  if (!res.ok) throw new Error(`upload ${bucket}/${path}: HTTP ${res.status} ${await res.text()}`);
}

export function writeJson(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
}

export function readJson(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Minimal content type from an extension; the exact value is not critical. */
export function contentTypeFor(path) {
  const ext = path.toLowerCase().split(".").pop();
  return (
    {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      avif: "image/avif",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      jfif: "image/jpeg",
    }[ext] ?? "application/octet-stream"
  );
}
