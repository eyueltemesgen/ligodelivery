/*
 * የኔ Go service worker.
 *
 * The app is server-rendered, so navigations are always fetched from the
 * network first — a cached HTML shell would otherwise serve stale prices and
 * stale order status. The cache exists for two reasons only:
 *   1. an offline fallback page instead of the browser's error screen, and
 *   2. instant repeat loads of hashed build assets, which are immutable.
 *
 * Nothing here touches the API or auth. Supabase requests are cross-origin and
 * are passed straight through, so a cached response can never show one
 * customer another customer's data.
 */

const VERSION = "v1";
const OFFLINE_CACHE = `yene-offline-${VERSION}`;
const ASSET_CACHE = `yene-assets-${VERSION}`;
const KEEP = [OFFLINE_CACHE, ASSET_CACHE];

const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];

/** Never cache these, even when same-origin. */
const BYPASS = [/^\/api\//, /^\/auth\//, /\/rpc\//, /supabase\.co/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      // Individually, so one missing file cannot fail the whole install.
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => undefined),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => (KEEP.includes(name) ? undefined : caches.delete(name))),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") void self.skipWaiting();
});

function bypass(url) {
  return BYPASS.some((re) => re.test(url.pathname) || re.test(url.href));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only GET, and only same-origin. Everything else (Supabase, fonts CDN,
  // analytics) is left to the browser so we never interfere with auth.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || bypass(url)) return;

  // Navigations: network first, offline page on failure.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(OFFLINE_CACHE);
          const cached = await cache.match(OFFLINE_URL);
          return (
            cached ??
            new Response("You are offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
    return;
  }

  // Hashed build assets: serve from cache, refresh in the background.
  const dest = request.destination;
  const cacheable =
    dest === "script" || dest === "style" || dest === "font" || dest === "image";
  if (!cacheable) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          // Only store a real, complete success.
          if (response.ok && response.status === 200 && response.type === "basic") {
            void cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => undefined);

      return cached ?? (await network) ?? Response.error();
    })(),
  );
});

/*
 * Push is wired but unused until a send path exists: the payload carries only a
 * title, body and URL, never order or customer details, so nothing sensitive is
 * rendered by the worker.
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === "string" && data.title ? data.title : "የኔ Go";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: typeof data.url === "string" ? data.url : "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if (client.url === target && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })(),
  );
});
