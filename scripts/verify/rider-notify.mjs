/**
 * Prove the rider portal notifies the customer. Signs in a rider, stubs one
 * on-the-way order, clicks the advance control, and asserts a POST to
 * /rest/v1/rpc/notify_order_status carrying that order id.
 */
const CDP = process.env.CDP_URL || "http://127.0.0.1:9222";
const APP = process.env.APP_URL || "http://127.0.0.1:4173";
const REF = "kyfyljkxijmamnkhvqaw";
const UID = "22222222-2222-2222-2222-222222222222";
const ORDER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const USER = {
  id: UID,
  aud: "authenticated",
  role: "authenticated",
  email: "rider@example.com",
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
};

const ORDER_ROW = {
  id: ORDER,
  order_code: "YG-2002",
  status: "accepted",
  total: 340,
  delivery_fee: 40,
  rider_payout: 60,
  tip: 0,
  payment_method: "cash",
  payment_status: "unpaid",
  customer_id: "33333333-3333-3333-3333-333333333333",
  customer_name: "Test Customer",
  customer_phone: "+251900000000",
  delivery_address: "Bishoftu",
  delivery_instructions: null,
  delivery_pin: "4321",
  lat: 8.75,
  lng: 38.98,
  shop_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  dispatched_at: new Date().toISOString(),
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
      if (url.includes("/rest/v1/user_roles")) return json([{ role: "rider" }]);
      if (url.includes("/rest/v1/riders")) {
        return json({ id: ${JSON.stringify(UID)}, is_online: true, is_approved: true, vehicle_type: "motorcycle", phone: "+251900000000" });
      }
      if (url.includes("/rest/v1/profiles")) {
        return json({ id: ${JSON.stringify(UID)}, full_name: "Test Rider", avatar_url: null });
      }
      if (url.includes("/rest/v1/orders")) return json([${JSON.stringify(ORDER_ROW)}]);
      return json([], { "content-range": "*/0" });
    };
  `,
});

await send("Page.navigate", { url: APP + "/rider" });
await new Promise((r) => setTimeout(r, 6000));

let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  ok ? pass++ : fail++;
};

const body = await ev("document.body.innerText");
console.log("page:", JSON.stringify(body.split("\n").filter(Boolean).slice(0, 10)));

const clicked = await ev(`(() => {
  const btns = [...document.querySelectorAll("button")];
  const b = btns.find((x) => /arrived|picked|on the way|delivered|complete/i.test(x.textContent || ""));
  if (!b) return "no button: " + btns.map(x=>x.textContent.trim()).join("|").slice(0,400);
  b.click();
  return "clicked:" + b.textContent.trim();
})()`);
console.log("click result:", clicked);

await new Promise((r) => setTimeout(r, 2500));
const rpcCalls = await ev("window.__rpcCalls");
console.log("rpc calls:", JSON.stringify(rpcCalls));

const notify = (rpcCalls || []).find((c) => c.url.includes("notify_order_status"));
check("rider called notify_order_status RPC", !!notify);
check("RPC carries the order id", !!notify && notify.body.includes(ORDER));
check("RPC does not send user_id", !!notify && !notify.body.includes("user_id"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
