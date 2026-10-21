# Verification harnesses

Browser harnesses drive a headless Chromium over CDP. They are not part of the
build; run them by hand when touching the area they cover.

## Setup

```sh
npx vite dev --port 4173 --host 127.0.0.1 &
chromium --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-profile about:blank &
```

Use `vite dev`, not `vite preview`. The build targets Cloudflare and emits
`.output/server/index.mjs`; `vite preview` looks for `dist/server/server.js` and
returns 500 for every route.

Each harness opens its own tab (and, where it needs isolation, its own browser
context), so they can run in any order. Set `APP_URL` / `CDP_URL` to override the
defaults.

## Harnesses

| Script | Covers |
| --- | --- |
| `search.mjs` | Description matches, comma/paren terms, LIKE metacharacters, category chips, empty state, 390px overflow, Amharic degradation. Runs against the live DB with no stubs. |
| `mobile-overflow.mjs` | Sweeps every public route at 390x844 and reports horizontal overflow plus the offending elements. |
| `header-badge.mjs` | The unread-notification badge in the account menu (stubs the unread count at 3). |
| `merchant-notify.mjs` | Advancing an order in the merchant console calls the `notify_order_status` RPC with the right order id. |
| `rider-notify.mjs` | Advancing an order in the rider portal calls the `notify_order_status` RPC. |
| `notify-rpc-sql.mjs` | Executes `notify_order_status` on real Postgres (PGlite) and asserts its authorization: owner/rider/admin allowed, foreign shop and customer denied, recipient always the customer. Needs `@electric-sql/pglite` (`npm i -D @electric-sql/pglite`). |
| `ratings.mjs` | Against the live DB: no shop card or detail page shows a star value while its review count is 0; the one reviewed shop still shows its real number. Reads the rows first and compares the page to them. |
| `ratings-sql.mjs` | PGlite: the seeded `4.5` is cleared for unreviewed shops, a real average is kept, deleting the last review leaves 0 (not the stale value), and the migration is idempotent. |
| `locale-parity.py` | `en`/`am`/`or` have identical key sets with no duplicates. |

## Why a separate SQL harness

`notify_order_status` is `SECURITY DEFINER`, so a wrong guard would let any shop
notify any customer. PGlite runs the real migration against real Postgres, which
catches guard regressions that a stubbed browser test cannot see.
