/**
 * Optional Supabase auth for server functions that must also work for
 * signed-out visitors.
 *
 * `requireSupabaseAuth` throws when no bearer token is present, which is right
 * for admin-only endpoints but wrong for the public shopping assistant. This
 * middleware mirrors it exactly — same token validation, same RLS-enforced
 * client — but proceeds anonymously instead of failing, and reports
 * `userId: null` so tools can return a typed "sign in" result.
 *
 * When a token IS present it is still verified with `getClaims`, so a forged or
 * expired token degrades to anonymous rather than being trusted.
 */
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export type OptionalAuthContext = {
  /** RLS-enforced client: the caller's session when signed in, anonymous otherwise. */
  supabase: SupabaseClient<Database> | null;
  userId: string | null;
};

function readBearerToken(request: Request | undefined): string | null {
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  // Supabase JWTs are three dot-separated segments; anything else is not one.
  if (!token || token.split(".").length !== 3) return null;
  return token;
}

export const optionalSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env["SUPABASE_URL"];
    const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      // Catalogue reads are public, so an unconfigured backend is not fatal
      // here: tools fall back to their own error results.
      console.warn("[assistant] Supabase env vars missing; continuing without a client");
      return next({ context: { supabase: null, userId: null } as OptionalAuthContext });
    }

    const token = readBearerToken(getRequest());

    // Anonymous visitors still get a client, keyed with the publishable key, so
    // every catalogue read stays RLS-enforced instead of reaching for the
    // service-role client.
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: {
        fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    if (!token) {
      return next({ context: { supabase, userId: null } as OptionalAuthContext });
    }

    try {
      const { data, error } = await supabase.auth.getClaims(token);
      if (error || !data?.claims?.sub) {
        return next({ context: { supabase, userId: null } as OptionalAuthContext });
      }
      return next({
        context: { supabase, userId: data.claims.sub } as OptionalAuthContext,
      });
    } catch (err) {
      // An invalid token must never take the public endpoint down.
      console.warn("[assistant] token verification failed; continuing anonymously", err);
      return next({ context: { supabase, userId: null } as OptionalAuthContext });
    }
  },
);
