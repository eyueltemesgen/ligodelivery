/**
 * Verify the header notification badge. Signs in a fake session and stubs the
 * unread count at 3, then opens the account dropdown and looks for the badge.
 */
const CDP = "http://127.0.0.1:9222";
const APP = process.env.APP_URL || "http://127.0.0.1:4173";
const REF = "kyfyljkxijmamnkhvqaw";
const USER = {
  id: "33333333-3333-3333-3333-333333333333",
  aud: "authenticated",
  role: "authenticated",
  email: "shopper@example.com",
  app_metadata: {},
  user_metadata: {},
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
const consoleErrors = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    consoleErrors.push((m.params.args || []).map((a) => a.value ?? a.description).join(" "));
  }
});

// Stub Supabase so the app sees a signed-in customer with 3 unread notifications.
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `
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
      if (url.includes("/auth/v1/user")) return json(${JSON.stringify(USER)});
      if (url.includes("/auth/v1/token")) {
        return json({
          access_token: "stub-token",
          refresh_token: "stub-refresh",
          expires_in: 3600,
          token_type: "bearer",
          user: ${JSON.stringify(USER)},
        });
      }
      if (url.includes("/rest/v1/profiles")) {
        return json({ id: ${JSON.stringify(USER.id)}, full_name: "Test User", avatar_url: null });
      }
      // The unread count is read with head:true + Prefer count=exact, so the
      // number comes from content-range, not the body.
      if (url.includes("/rest/v1/notifications") && url.includes("is_read=eq.false")) {
        return json(null, { "content-range": "0-2/3" });
      }
      if (url.includes("/rest/v1/notifications")) return json([]);
      return json([], { "content-range": "*/0" });
    };
  `,
});

await send("Page.navigate", { url: APP + "/" });
await new Promise((r) => setTimeout(r, 5000));

// Open the account dropdown with a real mouse event (Radix listens for pointerdown).
const box = await ev(`(() => {
  const btns = [...document.querySelectorAll("header button")];
  const b = btns.find((x) => /Test|Account|shopper/i.test(x.textContent || ""));
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`);

if (!box) {
  console.log("FAIL  could not find the account menu trigger");
  console.log("header buttons:", await ev(`[...document.querySelectorAll("header button")].map(b=>b.textContent.trim()).join(" | ")`));
  process.exit(1);
}

for (const type of ["mousePressed", "mouseReleased"]) {
  await send("Input.dispatchMouseEvent", {
    type, x: box.x, y: box.y, button: "left", clickCount: 1,
  });
}
await new Promise((r) => setTimeout(r, 1200));

const menuText = await ev(`(() => {
  const m = document.querySelector('[role="menu"]');
  return m ? m.innerText : "(no menu)";
})()`);

let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  ok ? pass++ : fail++;
};

check("account dropdown opened", !menuText.includes("(no menu)"), menuText.split("\n")[0]);
check("unread badge shows the count", menuText.includes("3"), JSON.stringify(menuText.split("\n").join(" / ")));
check("badge has an accessible unread label", menuText.includes("3 unread notifications"));
check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 2).join(" | "));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
