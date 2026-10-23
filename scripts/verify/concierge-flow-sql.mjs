/**
 * End-to-end check that a concierge job (errand / bill / parcel) can actually be
 * ordered, since those services have no shop_id.
 *
 * `place_service_order` inserts `orders.shop_id = v_svc.shop_id`, and every
 * concierge service deliberately has no shop. That makes this the one genuinely
 * new risk in the feature: if orders.shop_id were NOT NULL, or the fee fallback
 * did not exist, every errand and bill payment would fail at payment — after the
 * customer had already gone through the request and quote flow.
 *
 * The whole path is exercised: request -> admin quote -> accept -> order.
 *
 *   node scripts/verify/concierge-flow-sql.mjs
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

// --- the seed landed as intended --------------------------------------------
const cats = (
  await db.query(`SELECT slug FROM public.service_categories ORDER BY sort_order`)
).rows.map((r) => r.slug);
for (const slug of ["errands", "bill-payments", "parcels"]) {
  check(`category ${slug} exists`, cats.includes(slug));
}

const perCat = (
  await db.query(`
    SELECT c.slug, count(*)::int AS n
    FROM public.services s JOIN public.service_categories c ON c.id = s.service_category_id
    WHERE c.slug IN ('errands','bill-payments','parcels')
    GROUP BY c.slug ORDER BY c.slug`)
).rows;
check(
  "each concierge category has services to order",
  perCat.length === 3 && perCat.every((r) => r.n > 0),
  JSON.stringify(perCat),
);

const shopless = (
  await db.query(`
    SELECT count(*)::int AS n FROM public.services s
    JOIN public.service_categories c ON c.id = s.service_category_id
    WHERE c.slug IN ('errands','bill-payments','parcels') AND s.shop_id IS NULL`)
).rows[0].n;
check("concierge services have no shop, as designed", shopless === 15, `shopless=${shopless}`);

// A fixed-price one and a quote one, to cover both pricing paths.
const fixedSvc = (await db.query(`SELECT id FROM public.services WHERE slug = 'parcel-document'`))
  .rows[0].id;
const quoteSvc = (
  await db.query(`SELECT id FROM public.services WHERE slug = 'errand-grocery-run'`)
).rows[0].id;

// --- fixtures ---------------------------------------------------------------
const CUST = "d0000000-0000-0000-0000-000000000001";
const ADMIN = "d0000000-0000-0000-0000-000000000002";
await db.exec(`
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    ('${CUST}', 'customer@example.com', '{"full_name":"Customer"}'::jsonb),
    ('${ADMIN}', 'admin@example.com', '{"full_name":"Admin"}'::jsonb);
  INSERT INTO public.user_roles (user_id, role) VALUES ('${ADMIN}', 'admin');
`);

// PGlite runs each statement in its own implicit transaction, so the claim is
// set first and the call that depends on it follows.
const withUser = async (uid, fn) => {
  await db.exec(`SET request.jwt.claim.sub = '${uid}'`);
  return fn();
};

// --- fixed-price parcel: request -> order -----------------------------------
const fixedReq = await withUser(
  CUST,
  async () =>
    (
      await db.query(
        `INSERT INTO public.service_requests
         (user_id, service_id, request_type, status, customer_name, customer_phone, location)
       VALUES ($1, $2, 'booking', 'submitted', 'Customer', '0911000000', 'Kebele 04')
       RETURNING id`,
        [CUST, fixedSvc],
      )
    ).rows[0].id,
);
check("a customer can create a parcel request", Boolean(fixedReq));

const fixedOrder = await withUser(
  CUST,
  async () =>
    (
      await db.query(
        `SELECT public.place_service_order($1, 'cash', 'Customer', '0911000000', 'Kebele 04') AS id`,
        [fixedReq],
      )
    ).rows[0].id,
);
check("a fixed-price parcel books into an order without a shop", Boolean(fixedOrder));

const fixedRow = (
  await db.query(
    `SELECT order_type, shop_id, subtotal, delivery_fee, total, payment_status FROM public.orders WHERE id = $1`,
    [fixedOrder],
  )
).rows[0];
check(
  "the parcel order is typed as a service order",
  fixedRow.order_type === "service",
  fixedRow.order_type,
);
check("the parcel order carries no shop", fixedRow.shop_id === null, String(fixedRow.shop_id));
check(
  "the parcel order charges the fixed 80 ETB service price",
  Number(fixedRow.subtotal) === 80,
  `subtotal=${fixedRow.subtotal}`,
);
check(
  "a shopless order still gets a platform delivery fee",
  Number(fixedRow.delivery_fee) > 0,
  `delivery_fee=${fixedRow.delivery_fee}`,
);
check(
  "the order total is the price plus the fee",
  Number(fixedRow.total) === Number(fixedRow.subtotal) + Number(fixedRow.delivery_fee),
  `total=${fixedRow.total}`,
);
check("the order starts unpaid, behind the payment gate", fixedRow.payment_status === "unpaid");

// --- quote errand: request -> quote -> accept -> order ----------------------
const quoteReq = await withUser(
  CUST,
  async () =>
    (
      await db.query(
        `INSERT INTO public.service_requests
         (user_id, service_id, request_type, status, customer_name, customer_phone, location)
       VALUES ($1, $2, 'quote', 'quote_requested', 'Customer', '0911000000', 'Kebele 04')
       RETURNING id`,
        [CUST, quoteSvc],
      )
    ).rows[0].id,
);

// An unquoted quote request must refuse payment — otherwise a customer could
// book a grocery run for nothing.
let refused = false;
try {
  await withUser(CUST, async () =>
    db.query(`SELECT public.place_service_order($1, 'cash') AS id`, [quoteReq]),
  );
} catch {
  refused = true;
}
check("an unquoted errand cannot be paid for", refused);

await withUser(ADMIN, async () =>
  db.query(`SELECT public.review_service_request($1, 'quoted', 350, 'Groceries plus fee')`, [
    quoteReq,
  ]),
);
const quoted = (
  await db.query(`SELECT status, quote_amount FROM public.service_requests WHERE id = $1`, [
    quoteReq,
  ])
).rows[0];
check(
  "an admin can quote the errand",
  quoted.status === "quoted" && Number(quoted.quote_amount) === 350,
  JSON.stringify(quoted),
);

await withUser(CUST, async () => db.query(`SELECT public.accept_service_quote($1)`, [quoteReq]));
const accepted = (
  await db.query(`SELECT status FROM public.service_requests WHERE id = $1`, [quoteReq])
).rows[0];
check("the customer can accept the quote", accepted.status === "accepted", accepted.status);

const quoteOrder = await withUser(
  CUST,
  async () =>
    (
      await db.query(
        `SELECT public.place_service_order($1, 'cash', 'Customer', '0911000000', 'Kebele 04') AS id`,
        [quoteReq],
      )
    ).rows[0].id,
);
const quoteRow = (
  await db.query(`SELECT subtotal, total, order_type FROM public.orders WHERE id = $1`, [
    quoteOrder,
  ])
).rows[0];
check(
  "the accepted quote becomes an order at the quoted price",
  Number(quoteRow.subtotal) === 350,
  `subtotal=${quoteRow.subtotal}`,
);
check("the quoted errand is also a service order", quoteRow.order_type === "service");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
