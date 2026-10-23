/**
 * Sweep every public route at 390x844 and report horizontal overflow.
 * Also flags elements wider than the viewport, which is the usual cause.
 */
const CDP = "http://127.0.0.1:9222";
const APP = process.env.APP_URL || "http://127.0.0.1:4173";

const ROUTES = [
  "/",
  "/shops",
  "/offers",
  "/special-moments",
  "/special-moments/search",
  "/concierge",
  "/search?q=milk",
  "/cart",
  "/checkout",
  "/merchant/join",
  "/orders",
  "/notifications",
  "/account/help",
];

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
await send("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
});

const rows = [];
for (const route of ROUTES) {
  await send("Page.navigate", { url: APP + route });
  await new Promise((r) => setTimeout(r, 3800));
  const info = await ev(`(() => {
    const de = document.documentElement;
    const overflow = de.scrollWidth - de.clientWidth;
    const vw = de.clientWidth;
    const wide = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 1 && r.height > 0) {
        const cls = (el.className && typeof el.className === "string") ? el.className.slice(0, 60) : "";
        wide.push(el.tagName + "." + cls + " w=" + Math.round(r.width));
        if (wide.length >= 3) break;
      }
    }
    return { overflow, vw, wide, text: document.body.innerText.slice(0, 60) };
  })()`);
  rows.push({ route, ...info });
  const flag = info.overflow > 1 ? "OVERFLOW" : "ok";
  console.log(`${flag.padEnd(9)} ${route.padEnd(26)} overflow=${info.overflow}px  ${info.wide[0] ?? ""}`);
}

const bad = rows.filter((r) => r.overflow > 1);
console.log(`\n${rows.length - bad.length}/${rows.length} routes have no horizontal overflow`);
if (bad.length) console.log("CHECK:", bad.map((b) => b.route).join(", "));
process.exit(0);
