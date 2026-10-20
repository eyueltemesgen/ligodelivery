/**
 * Execute the notify_order_status migration against real Postgres (PGlite) and
 * assert its authorization rules. The function is SECURITY DEFINER, so getting
 * the guard wrong would let any shop notify any customer.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION = readFileSync(
  resolve(here, "../../supabase/migrations/20261006100000_notify_order_status.sql"),
  "utf8",
);

const db = new PGlite();

// Minimal stand-ins for the real schema + helpers the migration depends on.
// `anon` / `authenticated` are Supabase roles that the migration grants to.
await db.exec(`
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('test.uid', true), '')::uuid
  $$;

  CREATE TABLE public.shops (id uuid PRIMARY KEY, owner_id uuid);
  CREATE TABLE public.orders (
    id uuid PRIMARY KEY,
    customer_id uuid,
    shop_id uuid,
    rider_id uuid
  );
  CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    body text,
    type text NOT NULL DEFAULT 'general',
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE public.user_roles (user_id uuid, role text);
  CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  $$;
  CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
  RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
    )
  $$;
  CREATE OR REPLACE FUNCTION public.owns_shop(_shop uuid)
  RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.shops WHERE id = _shop AND owner_id = auth.uid()
    )
  $$;
`);

await db.exec(MIGRATION);

const OWNER = "11111111-1111-1111-1111-111111111111";
const RIDER = "22222222-2222-2222-2222-222222222222";
const CUSTOMER = "33333333-3333-3333-3333-333333333333";
const OTHER_SHOP = "44444444-4444-4444-4444-444444444444";
const ADMIN = "55555555-5555-5555-5555-555555555555";
const SHOP = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORDER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const FOREIGN_ORDER = "cccccccc-cccc-cccc-cccc-cccccccccccc";

await db.exec(`
  INSERT INTO public.shops VALUES ('${SHOP}', '${OWNER}');
  INSERT INTO public.shops VALUES ('${OTHER_SHOP}', '${OTHER_SHOP}');
  INSERT INTO public.orders VALUES ('${ORDER}', '${CUSTOMER}', '${SHOP}', '${RIDER}');
  INSERT INTO public.orders VALUES ('${FOREIGN_ORDER}', '${CUSTOMER}', '${OTHER_SHOP}', NULL);
  INSERT INTO public.user_roles VALUES ('${ADMIN}', 'admin');
  INSERT INTO public.user_roles VALUES ('${RIDER}', 'rider');
`);

const as = (uid) => db.query(`SELECT set_config('test.uid', $1, false)`, [uid]);
const call = async (uid, orderId) => {
  await as(uid);
  try {
    await db.query(`SELECT public.notify_order_status($1, $2, $3)`, [
      orderId,
      "Order updated",
      "Preparing",
    ]);
    return "ok";
  } catch (e) {
    return e.message.includes("not allowed")
      ? "denied"
      : e.message.includes("not authenticated")
        ? "unauthenticated"
        : "err:" + e.message;
  }
};

let pass = 0;
let fail = 0;
const check = (name, got, want) => {
  const ok = got === want;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${got}, want ${want})`);
  ok ? pass++ : fail++;
};

check("shop owner can notify on own order", await call(OWNER, ORDER), "ok");
check("assigned rider can notify", await call(RIDER, ORDER), "ok");
check("admin can notify", await call(ADMIN, ORDER), "ok");
check(
  "owner of ANOTHER shop is denied on this order",
  await call(OTHER_SHOP, ORDER),
  "denied",
);
check("the customer themselves is denied", await call(CUSTOMER, ORDER), "denied");
check("signed-out caller is rejected", await call("", ORDER), "unauthenticated");
check(
  "unknown order id is refused",
  await call(OWNER, "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
  "err:order not found",
);

// A rider must actually hold the rider role, not just be named on the order.
await db.exec(`DELETE FROM public.user_roles WHERE user_id = '${RIDER}'`);
check("rider without the rider role is denied", await call(RIDER, ORDER), "denied");
await db.exec(`INSERT INTO public.user_roles VALUES ('${RIDER}', 'rider')`);

// The notification must land on the order's customer, never the caller.
await call(OWNER, ORDER);
const rows = await db.query(
  `SELECT user_id, type, order_id FROM public.notifications ORDER BY created_at`,
);
const recipients = new Set(rows.rows.map((r) => r.user_id));
check(
  "notifications only ever target the customer",
  [...recipients].join(","),
  CUSTOMER,
);
check("notification is linked to the order", rows.rows[0].order_id, ORDER);
check("notification type is order", rows.rows[0].type, "order");

// A customer_id-less order must not throw, just no-op.
await db.exec(
  `INSERT INTO public.orders VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', NULL, '${SHOP}', NULL)`,
);
check(
  "order with no customer is a silent no-op",
  await call(OWNER, "dddddddd-dddd-dddd-dddd-dddddddddddd"),
  "ok",
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
