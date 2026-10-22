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

/**
 * The original Lovable Cloud project this app was built against.
 *
 * Kept as the last-resort fallback so a published build that ships without env
 * vars still renders instead of blanking (see the header). If you move to your
 * own Supabase project, set the env vars — do **not** edit these; they exist so
 * a forgotten variable degrades to a working-but-wrong site that warns loudly
 * (see `USING_LEGACY_SUPABASE_FALLBACK`) rather than a broken one.
 */
const LEGACY_LOVABLE_SUPABASE_URL = "https://kyfyljkxijmamnkhvqaw.supabase.co";
const LEGACY_LOVABLE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable__-26UQR-hg8e3YE4RCgRiw_lIkghIy1";

/** Browser-safe Supabase project URL. */
export const PUBLIC_SUPABASE_URL =
  process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"] || LEGACY_LOVABLE_SUPABASE_URL;

/** Browser-safe Supabase publishable (anon) key. Never a service-role key. */
export const PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  process.env["SUPABASE_PUBLISHABLE_KEY"] ||
  LEGACY_LOVABLE_SUPABASE_PUBLISHABLE_KEY;

/**
 * True when neither env var pair was set and the legacy Lovable coordinates
 * above are in force.
 *
 * This is the "you think you moved but you didn't" case: a deployment that
 * forgets `VITE_SUPABASE_URL` still renders a working site, because the baked
 * values win, but every read and write goes to the **old** project. Without a
 * signal that is invisible — the app looks fine and the data silently lands in
 * the wrong database. Warn loudly so a half-finished cutover is obvious.
 */
export const USING_LEGACY_SUPABASE_FALLBACK =
  !process.env["VITE_SUPABASE_URL"] &&
  !process.env["SUPABASE_URL"] &&
  !process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] &&
  !process.env["SUPABASE_PUBLISHABLE_KEY"];

// Server-only: this module is also imported by a route, so it is in the client
// bundle too, and a browser warning on every page load would be pure noise.
if (USING_LEGACY_SUPABASE_FALLBACK && typeof window === "undefined") {
  console.warn(
    "[Supabase] No VITE_SUPABASE_URL / SUPABASE_URL configured — falling back to the " +
      "legacy baked-in project. If you have moved to your own Supabase project, set " +
      "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (plus SUPABASE_URL / " +
      "SUPABASE_PUBLISHABLE_KEY for server functions) or your data will keep going " +
      "to the old project.",
  );
}
