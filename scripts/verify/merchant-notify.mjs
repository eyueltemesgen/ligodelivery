/**
 * Prove the merchant console now notifies the customer. Signs in an approved
 * merchant, stubs one 'confirmed' order, clicks the advance button, and asserts
 * a POST to /rest/v1/rpc/notify_order_status carrying that order id.
 *
 * Before this change the merchant path called the client insert() helper, which
 * RLS rejected silently — no request to the RPC and no notification.
 */
const CDP = "http://127.0.0.1:9222";
const APP = process.env.APP_URL || "http://127.0.0.1:4173";
const REF = "kyfyljkxijmamnkhvqaw";
const UID = "11111111-1111-1111-1111-111111111111";
const SHOP = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORDER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const USER = {
  id: UID,
  aud: "authenticated",
  role: "authenticated",
  email: "owner@example.com",
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
};

const ORDER_ROW = {
  id: ORDER,
  order_code: "YG-1001",
  status: "confirmed",
  payment_method: "cash",
  payment_status: "unpaid",
  subtotal: 300,
  delivery_fee: 40,
  tip: 0,
  total: 340,
  commission_amount: 30,
  merchant_net: 310,
  customer_name: "Test Customer",
  customer_phone: "+251900000000",
  delivery_address: "Bishoftu",
  rider_id: null,
  shop_id: SHOP,
  created_at: new Date().toISOString(),
  customer_id: "33333333-3333-3333-3333-333333333333",
};

const SHOP_ROW = {
  id: SHOP,
  name: "Test Shop",
  owner_id: UID,
  is_active: true,
  is_online: true,
  rating: 4.5,
  rating_count: 2,
  delivery_fee: 40,
  min_order: 0,
  description: "A test shop",
  address: "Bishoftu",
  phone: "+251900000000",
  image_url: null,
  cover_url: null,
  category_id: null,
  created_at: new Date().toISOString(),
};

const target = await (await fetch(`${CDP}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id).resolve(m.result);
    pending.delete(m.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const i = ++id;
    pending.set(i, { resolve });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const ev = async (x) =>
  (await send("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true })).result
    .value;

await send("Page.enable");
await send("Runtime.enable");

await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `
    window.__rpcCalls = [];
    localStorage.setItem(${JSON.stringify(`sb-${REF}-auth-token`)}, ${JSON.stringify(
      JSON.stringify({
        access_token: "stub-token",
        refresh_token: "stub-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: USER,
      }),
    )});
    const real = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      if (!url.includes("supabase.co")) return real(input, init);
      const json = (body, headers = {}) =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json", ...headers },
        });
      if (url.includes("/rpc/")) {
        window.__rpcCalls.push({ url, body: init && init.body ? String(init.body) : "" });
        return json(null, { "content-range": "*/0" });
      }
      if (url.includes("/auth/v1/user")) return json(${JSON.stringify(USER)});
      if (url.includes("/auth/v1/token")) {
        return json({ access_token: "stub-token", refresh_token: "stub-refresh", expires_in: 3600, token_type: "bearer", user: ${JSON.stringify(USER)} });
      }
      if (url.includes("/rest/v1/merchant_profiles")) {
        return json({ id: ${JSON.stringify(UID)}, status: "approved", business_name: "Test Shop", review_notes: null });
      }
      if (url.includes("/rest/v1/profiles")) {
        return json({ id: ${JSON.stringify(UID)}, full_name: "Shop Owner", avatar_url: null });
      }
      if (url.includes("/rest/v1/shops")) return json([${JSON.stringify(SHOP_ROW)}]);
      if (url.includes("/rest/v1/orders")) return json([${JSON.stringify(ORDER_ROW)}]);
      if (url.includes("/rest/v1/user_roles")) return json([]);
      return json([], { "content-range": "*/0" });
    };
  `,
});

await send("Page.navigate", { url: APP + "/merchant" });
await new Promise((r) => setTimeout(r, 6000));

const bodyText = await ev("document.body.innerText");
console.log("page head:", JSON.stringify(bodyText.split("\n").filter(Boolean).slice(0, 6)));

let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  ok ? pass++ : fail++;
};



// Radix tabs ignore element.click(); drive them with a real mouse event.
const tabBox = await ev(`(() => {
  const t = [...document.querySelectorAll('[role="tab"]')].find((x) => /order/i.test(x.textContent || ""));
  if (!t) return null;
  const r = t.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`);
if (tabBox) {
  for (const type of ["mousePressed", "mouseReleased"]) {
    await send("Input.dispatchMouseEvent", { type, x: tabBox.x, y: tabBox.y, button: "left", clickCount: 1 });
  }
  await new Promise((r) => setTimeout(r, 2000));
}
const ordersText = await ev("document.body.innerText");
console.log("orders tab:", JSON.stringify(ordersText.split("\n").filter(Boolean).slice(4, 14)));
check("merchant console rendered the order", ordersText.includes("YG-1001"));

// Click the advance button by its text ("Accept & prepare" or similar).
const clicked = await ev(`(() => {
  const btns = [...document.querySelectorAll("button")];
  const b = btns.find((x) => /prepare|accept|ready/i.test(x.textContent || ""));
  if (!b) return "no button: " + btns.map(x=>x.textContent.trim()).join("|").slice(0,300);
  b.click();
  return "clicked:" + b.textContent.trim();
})()`);
console.log("click result:", clicked);

await new Promise((r) => setTimeout(r, 2500));
const rpcCalls = await ev("window.__rpcCalls");
console.log("rpc calls:", JSON.stringify(rpcCalls));

const notify = (rpcCalls || []).find((c) => c.url.includes("notify_order_status"));
check("merchant called notify_order_status RPC", !!notify);
check("RPC carries the order id", !!notify && notify.body.includes(ORDER), notify ? notify.body : "no call");
check("RPC does not send user_id (server resolves it)", !!notify && !notify.body.includes("user_id"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
