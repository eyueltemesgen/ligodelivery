/** Extract the full PostgREST error detail (message + details + hint + code). */
export function supabaseErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Request failed";
  const e = err as { message?: string; details?: string; hint?: string; code?: string };
  const parts = [e.message];
  if (e.details)
    parts.push(
      `(${e.details}${e.hint ? ` — hint: ${e.hint}` : ""}${e.code ? ` [${e.code}]` : ""})`,
    );
  return parts.filter(Boolean).join(" ");
}

/** True when an RPC endpoint is missing from the live project (404). */
export function isMissingRpc(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { message?: string; code?: string; status?: number };
  return (
    e.code === "PGRST202" ||
    e.status === 404 ||
    /not found|Could not find the function|does not exist/i.test(e.message ?? "")
  );
}
