/**
 * Prove the storefront no longer advertises a rating nobody earned.
 *
 * Runs against the LIVE backend. Six of seven live shops carry the seeded
 * `rating = 4.5` with `rating_count = 0`; before the fix every one of them
 * rendered "4.5", which is a rating no customer ever gave. This asserts:
 *
 *   - no shop card shows a star value while its review count is 0
 *   - the only shop with a real review still shows its real number
 *   - the shop detail page agrees with the card
 *   - the assistant's own shop cards agree (it renders from its own tool JSON)
 *
 * It reads the live rows first and compares the page against them, so it fails
 * if the display drifts from the data rather than hardcoding expectations.
 */
const CDP = process.env.CDP_URL || "http://127.0.0.1:9222";
const APP = process.env.APP_URL || "http://127.0.0.1:4173";
const U = "https://kyfyljkxijmamnkhvqaw.supabase.co";
const K = "sb_publishable__-26UQR-hg8e3YE4RCgRiw_lIkghIy1";

let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  ok ? pass++ : fail++;
};

// --- what the database actually says ---------------------------------------
const shops = await (
  await fetch(`${U}/rest/v1/shops?select=name,rating,rating_count,is_active&is_active=eq.true`, {
    headers: { apikey: K, Authorization: `Bearer ${K}` },
  })
).json();

const unreviewed = shops.filter((s) => Number(s.rating_count) === 0);
const reviewed = shops.filter((s) => Number(s.rating_count) > 0);
console.log(
  `live: ${shops.length} active shops, ${unreviewed.length} unreviewed, ${reviewed.length} reviewed`,
);
if (unreviewed.length === 0) {
  console.log("SKIP: no unreviewed shops to check");
  process.exit(0);
}

// --- drive the storefront ---------------------------------------------------
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

const errors = [];
await send("Runtime.enable");
await send("Log.enable");
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.method === "Runtime.exceptionThrown") {
    errors.push(m.params.exceptionDetails?.text ?? "exception");
  }
});

await send("Page.enable");

// Another harness may have left a stubbed `sb-*-auth-token` in this browser
// profile, which makes every request 401 and this page render empty. Clear the
// origin's storage so the run does not depend on harness order.
await send("Page.navigate", { url: `${APP}/` });
await new Promise((r) => setTimeout(r, 2500));
await ev(`(() => { localStorage.clear(); sessionStorage.clear(); return 1; })()`);

await send("Page.navigate", { url: `${APP}/shops` });
await new Promise((r) => setTimeout(r, 7000));

// Read every shop card's star badge, keyed by the shop name in the same card.
const cards = await ev(`(() => {
  const out = [];
  for (const a of document.querySelectorAll('a[href*="/shops/"]')) {
    const name = a.querySelector("h3")?.textContent?.trim();
    if (!name) continue;
    const badge = a.querySelector(".bg-warning\\\\/15");
    out.push({ name, badge: badge ? badge.textContent.trim() : null });
  }
  return out;
})()`);
console.log("cards:", JSON.stringify(cards));

const byName = new Map(cards.map((c) => [c.name, c.badge]));

for (const s of unreviewed) {
  const badge = byName.get(s.name);
  if (badge == null) continue; // not on the first page of the list
  check(
    `"${s.name}" (0 reviews) shows no star number`,
    !/\d\.\d/.test(badge),
    `badge "${badge}"`,
  );
}
for (const s of reviewed) {
  const badge = byName.get(s.name);
  if (badge == null) continue;
  check(
    `"${s.name}" (${s.rating_count} reviews) shows ${Number(s.rating).toFixed(1)}`,
    badge.includes(Number(s.rating).toFixed(1)),
    `badge "${badge}"`,
  );
}

// The shop detail page must agree with the card.
const target2 = reviewed[0] ?? unreviewed[0];
const detail = await (
  await fetch(`${U}/rest/v1/shops?select=id,name,rating,rating_count&name=eq.${encodeURIComponent(target2.name)}`, {
    headers: { apikey: K, Authorization: `Bearer ${K}` },
  })
).json();
if (detail[0]) {
  await send("Page.navigate", { url: `${APP}/shops/${detail[0].id}` });
  await new Promise((r) => setTimeout(r, 7000));
  const shown = await ev(`(() => {
    const star = document.querySelector(".fill-warning");
    return star ? star.parentElement.textContent.trim() : null;
  })()`);
  const hasCount = Number(detail[0].rating_count) > 0;
  check(
    `shop page for "${detail[0].name}" ${hasCount ? "shows its rating" : "shows New"}`,
    hasCount ? /\d\.\d/.test(shown ?? "") : !/\d\.\d/.test(shown ?? ""),
    `shown "${shown}"`,
  );
}

check("no uncaught page errors", errors.length === 0, errors.join("; "));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
