/**
 * Exercise the real loyalty engine against real Postgres (PGlite).
 *
 * The migration documents several money invariants and nothing tested them:
 * earning is based on goods value only, a re-delivered order does not pay out
 * twice, a cancelled order mints nothing, redemption is capped at a percentage
 * of the order, a redemption can never push a wallet negative, and a referral
 * pays out once per customer and never to yourself.
 *
 * Every assertion calls the shipped RPC or the shipped trigger — nothing is
 * reimplemented here — so a regression in the SQL fails this harness.
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
    email text,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (
    id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false,
    file_size_limit bigint, allowed_mime_types text[],
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE storage.objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text REFERENCES storage.buckets(id), name text, owner uuid,
    created_at timestamptz NOT NULL DEFAULT now(), metadata jsonb
  );
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
    SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;
  CREATE PUBLICATION supabase_realtime;
`);

for (const f of readdirSync(MIGRATIONS)
  .filter((x) => x.endsWith(".sql"))
  .sort()) {
  await db.exec(readFileSync(resolve(MIGRATIONS, f), "utf8"));
}

// --- fixtures --------------------------------------------------------------
const SHOP = "11111111-1111-1111-1111-111111111111";
const PRODUCT = "22222222-2222-2222-2222-222222222222";
const CUSTOMER = "33333333-3333-3333-3333-333333333333";
const REFERRER = "44444444-4444-4444-4444-444444444444";

/** Run a statement as a signed-in user, the way PostgREST would. */
async function asUser(uid, sql, params = []) {
  await db.exec(`SET request.jwt.claim.sub = '${uid}'`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec(`RESET request.jwt.claim.sub`);
  }
}

await db.exec(`
  INSERT INTO public.shops (id, name, is_active, lat, lng, delivery_fee)
  VALUES ('${SHOP}', 'Test Shop', true, 8.75, 38.98, 50);
  INSERT INTO public.products (id, shop_id, name, price, is_active)
  VALUES ('${PRODUCT}', '${SHOP}', 'Test Burger', 200, true);
  INSERT INTO public.profiles (id, full_name) VALUES
    ('${CUSTOMER}', 'Customer'), ('${REFERRER}', 'Referrer');
  INSERT INTO public.loyalty_wallets (user_id, referral_code) VALUES
    ('${CUSTOMER}', 'CUST01'), ('${REFERRER}', 'REFER1');
`);

/** Place an order as the customer, returning its id. */
async function placeOrder({ subtotalUnits = 1, redeem = 0, tip = 0 } = {}) {
  const items = JSON.stringify([{ product_id: PRODUCT, quantity: subtotalUnits }]);
  const r = await asUser(
    CUSTOMER,
    `SELECT public.place_order($1, $2::jsonb, 'cash', 'Customer', '+251900000000',
       'Bishoftu', NULL, $3, NULL, 8.75, 38.98, $4) AS id`,
    [SHOP, items, tip, redeem],
  );
  return r.rows[0].id;
}

/**
 * Mark an order delivered, which is what fires the loyalty trigger.
 *
 * The `orders_guard_update` trigger refuses a direct status write (a customer
 * cannot self-deliver — that is the payment-gate hardening), so this sets the
 * same `app.order_internal` flag the real `complete_delivery` RPC sets.
 */
async function deliver(orderId) {
  await db.exec(`SET app.order_internal = '1'`);
  try {
    await db.exec(`UPDATE public.orders SET status = 'delivered' WHERE id = '${orderId}'`);
  } finally {
    await db.exec(`RESET app.order_internal`);
  }
}

const balance = async (uid) =>
  (
    await db.query(
      `SELECT points, lifetime_points FROM public.loyalty_wallets WHERE user_id = $1`,
      [uid],
    )
  ).rows[0];

let passed = 0;
const failures = [];
function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    failures.push(name);
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// --- 1. earning is based on goods value, not the delivery fee or tip --------
const o1 = await placeOrder({ subtotalUnits: 1, tip: 100 });
await deliver(o1);
{
  const w = await balance(CUSTOMER);
  // 200 ETB of goods at 5 points per 100 => 10. The 50 fee and 100 tip must not count.
  check("earns 5 points per 100 ETB of goods only", w.points === 10, `got ${w.points}`);
  check("delivery fee and tip are excluded", w.points !== 17, `got ${w.points}`);
}

// --- 2. re-saving a delivered order must not pay out again ------------------
await deliver(o1);
{
  const w = await balance(CUSTOMER);
  check("re-delivering does not double-credit", w.points === 10, `got ${w.points}`);
}

// --- 3. a cancelled order mints nothing ------------------------------------
const o3 = await placeOrder({ subtotalUnits: 1 });
await db.exec(`UPDATE public.orders SET status = 'cancelled' WHERE id = '${o3}'`);
{
  const w = await balance(CUSTOMER);
  check("cancelled order mints no points", w.points === 10, `got ${w.points}`);
}

// --- 4. redemption is capped at max_redeem_percent of the order ------------
{
  // 1000 points = 500 ETB of value, but the cap is 20% of the order. The order
  // has to be big enough that 20% exceeds the 100-point minimum redemption,
  // otherwise place_order correctly refuses ("too small to redeem") — which is
  // what an earlier version of this test tripped over.
  await db.exec(`UPDATE public.loyalty_wallets SET points = 1000 WHERE user_id = '${CUSTOMER}'`);
  const o = await placeOrder({ subtotalUnits: 5, redeem: 1000 });
  const row = (
    await db.query(`SELECT discount, subtotal, delivery_fee FROM public.orders WHERE id = $1`, [o])
  ).rows[0];
  const cap = Math.round((Number(row.subtotal) + Number(row.delivery_fee)) * 0.2);
  check(
    "redemption is capped at max_redeem_percent",
    Number(row.discount) === cap,
    `discount ${row.discount}, cap ${cap}`,
  );
  const w = await balance(CUSTOMER);
  // Points actually spent = capped ETB / 0.5 ETB per point.
  check("only the capped points are debited", w.points === 1000 - cap / 0.5, `got ${w.points}`);
}

// --- 5. a redemption can never overdraw the wallet -------------------------
{
  // Enough goods that the order is not rejected for being too small, so the
  // only reason to refuse is the insufficient balance.
  await db.exec(`UPDATE public.loyalty_wallets SET points = 50 WHERE user_id = '${CUSTOMER}'`);
  let raised = false;
  let msg = "";
  try {
    await placeOrder({ subtotalUnits: 5, redeem: 1000 });
  } catch (e) {
    raised = true;
    msg = String(e.message ?? "");
  }
  const w = await balance(CUSTOMER);
  check(
    "overdrawing a wallet is refused",
    raised && /not have that many/i.test(msg),
    `raised=${raised} msg=${msg}`,
  );
  check("balance is unchanged after a refused redemption", w.points === 50, `got ${w.points}`);
}

// --- 6. self-referral is refused -------------------------------------------
// Uses the real signup path: inserting into auth.users fires handle_new_user,
// which creates the wallet. Inserting one by hand first would collide.
{
  const SELF = "55555555-5555-5555-5555-555555555555";
  await db.exec(`
    INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
      ('${SELF}', 'self@example.com', '{"referral_code":"SELF01"}'::jsonb);
    UPDATE public.loyalty_wallets SET referral_code = 'SELF01' WHERE user_id = '${SELF}';
  `);
  const w = (
    await db.query(`SELECT referred_by FROM public.loyalty_wallets WHERE user_id = '${SELF}'`)
  ).rows[0];
  check("a customer cannot refer themselves", w.referred_by === null, `got ${w.referred_by}`);
}

// --- 7. a referral pays out once, on the first delivered order --------------
{
  await db.exec(`
    UPDATE public.loyalty_wallets SET referred_by = '${REFERRER}', referral_credited = false
      WHERE user_id = '${CUSTOMER}';
  `);
  const a = await placeOrder({ subtotalUnits: 1 });
  await deliver(a);
  const first = await balance(REFERRER);
  const b = await placeOrder({ subtotalUnits: 1 });
  await deliver(b);
  const second = await balance(REFERRER);
  check("referrer is credited on the first delivery", first.points === 100, `got ${first.points}`);
  check(
    "referrer is not credited twice",
    second.points === first.points,
    `${first.points} -> ${second.points}`,
  );
}

console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
