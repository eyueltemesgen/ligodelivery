/**
 * Search regression harness. Runs against the live Supabase project with no
 * stubs, so it catches the real failure modes:
 *   - a description-only term must still be found (the original bug)
 *   - a comma or parenthesis in the term must not break the `or=` filter
 *   - the LIKE wildcards must not be interpreted (a bare `*` matches nothing)
 *   - no Supabase request may 4xx (catches malformed filters, e.g. double parens)
 *
 * Usage: start the dev server, launch Chromium with --remote-debugging-port=9222,
 * then `node scripts/verify/search.mjs`.
 */
const CDP = process.env.CDP_URL || "http://127.0.0.1:9222";
const APP = process.env.APP_URL || "http://127.0.0.1:4173";

// Isolate in a fresh incognito context: another harness may have left a stub
// auth token in this profile's localStorage, which 401s every request and
// masks the thing under test.
const browserWs = (await (await fetch(`${CDP}/json/version`)).json()).webSocketDebuggerUrl;
const bws = new WebSocket(browserWs);
let bid = 0;
const bpending = new Map();
await new Promise((r) => (bws.onopen = r));
bws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && bpending.has(m.id)) {
    bpending.get(m.id).resolve(m.result);
    bpending.delete(m.id);
  }
};
const bsend = (method, params = {}) =>
  new Promise((resolve) => {
    const i = ++bid;
    bpending.set(i, { resolve });
    bws.send(JSON.stringify({ id: i, method, params }));
  });

const { browserContextId } = await bsend("Target.createBrowserContext");
const { targetId } = await bsend("Target.createTarget", { url: "about:blank", browserContextId });
const target = { webSocketDebuggerUrl: null };
// Resolve the per-target debugger URL from the target list.
const list = await (await fetch(`${CDP}/json/list`)).json();
target.webSocketDebuggerUrl = list.find((t) => t.id === targetId).webSocketDebuggerUrl;

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
await send("Network.enable");

let failedRequests = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.method === "Network.responseReceived") {
    const { url, status } = m.params.response;
    if (url.includes("supabase.co") && status >= 400) failedRequests.push(`${status} ${url}`);
  }
});

let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  ok ? pass++ : fail++;
};

async function searchFor(term) {
  failedRequests = [];
  await send("Page.navigate", { url: `${APP}/search?q=${encodeURIComponent(term)}` });
  await new Promise((r) => setTimeout(r, 4000));
  return ev("document.body.innerText");
}

// 1. The original bug: the word only appears in the description.
const doro = await searchFor("chicken");
check("description match finds Doro Wat", doro.includes("Doro Wat"), `${doro.split("\n").length} lines`);
check("result shows the shop name", /Bishoftu|Burger|Hotel|Restaurant/i.test(doro));
check("no supabase request failed", failedRequests.length === 0, failedRequests.join(" | "));

// 2. Name match must keep working.
const milk = await searchFor("Fresh Milk");
check("name match still works (Fresh Milk 1L)", milk.includes("Fresh Milk"));

// 3. A term whose word appears in another product's description.
const milkDesc = await searchFor("milk");
check("description match also surfaces Cappuccino", /Cappuccino/i.test(milkDesc), "Cappuccino description mentions milk");

// 4. The grammar cases that used to hard-fail the filter.
const comma = await searchFor("Sambusa, 5");
check("comma in term does not break the filter", failedRequests.length === 0, failedRequests.join(" | "));
check("comma term renders without error", !/error|Something went wrong/i.test(comma));

const paren = await searchFor("Sambusa (5");
check("parenthesis in term matches Sambusa (5 pcs)", /Sambusa/i.test(paren));
check("parenthesis term made no failed request", failedRequests.length === 0, failedRequests.join(" | "));

// 5. LIKE metacharacters must be treated as literals, not wildcards.
const star = await searchFor("*");
check("bare wildcard returns nothing", !star.includes("Doro Wat") && !star.includes("Fresh Milk"));
check("wildcard term made no failed request", failedRequests.length === 0, failedRequests.join(" | "));

// 6. Category results: "Bakery" is a live category and part of the shop "lina bakery".
const cat = await searchFor("Bakery");
check("category chip rendered for 'Bakery'", cat.includes("Categories") && cat.includes("Bakery"));
check("shop matched for 'Bakery' (lina bakery)", /lina bakery/i.test(cat));
check("category term made no failed request", failedRequests.length === 0, failedRequests.join(" | "));

// 7. A genuine miss still shows the empty state.
const none = await searchFor("zzzznotathing");
check("genuine miss shows the empty message", /Nothing matched/i.test(none));

// 8. Mobile layout.
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
const mobile = await searchFor("milk");
const overflow = await ev("document.documentElement.scrollWidth - document.documentElement.clientWidth");
check("no horizontal overflow at 390px", overflow <= 1, `overflow=${overflow}px`);
check("mobile still renders results", /Fresh Milk/i.test(mobile));

// 9. Amharic input must degrade cleanly, not 4xx (the catalogue is Latin-only).
const am = await searchFor("ወተት");
check("Amharic term degrades to a clean empty state", !/error|Something went wrong/i.test(am));
check("Amharic term made no failed request", failedRequests.length === 0, failedRequests.join(" | "));

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail === 0 ? 0 : 1);
