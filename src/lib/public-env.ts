/**
 * Single source of truth for the **public** backend coordinates.
 *
 * These two values are browser-safe by design: `vite.config.ts` bakes them into
 * the client bundle as a fallback, because published builds have shipped
 * without the `VITE_*` env vars and blanked the site. The assistant's server
 * middleware needs the same pair under different names (`SUPABASE_URL` /
 * `SUPABASE_PUBLISHABLE_KEY`), so a host that configures neither — e.g. a
 * Vercel deployment that only sets the `VITE_*` pair, or none at all — used to
 * get `supabase: null` and an assistant that returned nothing.
 *
 * Sharing the fallback here keeps the client and server from diverging, and it
 * exposes nothing new: the publishable key is already sent to every visitor.
 * It is **not** a service-role key, and the middleware still builds an
 * RLS-enforced client from it, so an anonymous caller cannot read or write
 * anything a signed-out browser could not.
 *
 * A real secret (the model key) must never be added here — see
 * `assistant-config.ts`, which reads the credential at call time.
 */

/** Browser-safe Supabase project URL. */
export const PUBLIC_SUPABASE_URL =
  process.env["VITE_SUPABASE_URL"] ||
  process.env["SUPABASE_URL"] ||
  "https://kyfyljkxijmamnkhvqaw.supabase.co";

/** Browser-safe Supabase publishable (anon) key. Never a service-role key. */
export const PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  process.env["SUPABASE_PUBLISHABLE_KEY"] ||
  "sb_publishable__-26UQR-hg8e3YE4RCgRiw_lIkghIy1";
