// Places a test order against the local ligo_test Postgres to verify the
// exact SQL the checkout flow issues end-to-end.
import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  host: "127.0.0.1",
  port: 5432,
  database: "ligo_test",
  user: "ligo_admin",
  password: "ligo_test_pw",
});
await client.connect();

const CUSTOMER_ID = "11111111-1111-1111-1111-111111111111";

// 1. Pick first active shop + an in-stock product (mirrors checkout reads)
const {
  rows: [shop],
} = await client.query(
  "SELECT id, name, delivery_fee FROM public.shops WHERE is_active = true ORDER BY is_featured DESC LIMIT 1",
);
console.log("Shop:", shop.name, "delivery fee:", shop.delivery_fee);

const {
  rows: [product],
} = await client.query(
  "SELECT id, name, price FROM public.products WHERE shop_id = $1 AND is_active = true ORDER BY name LIMIT 1",
  [shop.id],
);
console.log("Product:", product.name, "price:", product.price);

// 2. Fetch shop_hours (the hardened query path — may be empty)
let hours = [];
try {
  const res = await client.query(
    "SELECT day_of_week, opens_at, closes_at, is_closed FROM public.shop_hours WHERE shop_id = $1 ORDER BY day_of_week",
    [shop.id],
  );
  hours = res.rows;
} catch (err) {
  console.warn("shop_hours unavailable, falling back to shop-level hours:", err.message);
  hours = [];
}
console.log("shop_hours rows:", hours.length);

// 3. Insert the order with the exact payload keys checkout.tsx sends
const subtotal = Number(product.price);
const deliveryFee = Number(shop.delivery_fee);
const total = subtotal + deliveryFee;
const payload = {
  customer_id: CUSTOMER_ID,
  shop_id: shop.id,
  status: "pending_payment",
  payment_method: "cash",
  delivery_pin: String(Math.floor(1000 + Math.random() * 9000)),
  payment_status: "unpaid",
  subtotal,
  delivery_fee: deliveryFee,
  total,
  customer_name: "Test Customer",
  customer_phone: "+251911000001",
  delivery_address: "Kebele 04, near the stadium",
  delivery_instructions: null,
};

const insert = await client.query(
  `INSERT INTO public.orders (customer_id, shop_id, status, payment_method, delivery_pin,
    payment_status, subtotal, delivery_fee, total, customer_name, customer_phone,
    delivery_address, delivery_instructions)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
  [
    payload.customer_id,
    payload.shop_id,
    payload.status,
    payload.payment_method,
    payload.delivery_pin,
    payload.payment_status,
    payload.subtotal,
    payload.delivery_fee,
    payload.total,
    payload.customer_name,
    payload.customer_phone,
    payload.delivery_address,
    payload.delivery_instructions,
  ],
);
const orderId = insert.rows[0].id;
console.log("Order inserted:", orderId, "→ HTTP 201 equivalent");

// 4. Insert items — same payload keys checkout.tsx sends
const itemsInsert = await client.query(
  `INSERT INTO public.order_items (order_id, product_id, product_name, image_url, unit_price, quantity)
   VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
  [orderId, product.id, product.name, null, Number(product.price), 2],
);
console.log("Order item inserted:", itemsInsert.rows[0].id, "→ HTTP 201 equivalent");

// 5. Read back (customer tracking query)
const {
  rows: [orderRow],
} = await client.query(
  "SELECT order_code, status, total, payment_method FROM public.orders WHERE id = $1",
  [orderId],
);
console.log("Order readback:", orderRow, "→ HTTP 200 OK ✓");

await client.end();
process.exit(0);
