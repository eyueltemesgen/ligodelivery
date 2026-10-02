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

/**
 * True when PostgREST rejects a write because a column isn't in the live
 * schema cache yet (e.g. an additive migration still rolling out).
 */
export function isMissingColumn(err: unknown, column?: string): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { message?: string; code?: string };
  if (e.code !== "PGRST204" && e.code !== "42703") return false;
  const msg = e.message ?? "";
  return column ? msg.toLowerCase().includes(column.toLowerCase()) : true;
}

/**
 * True when a table or view is absent from the live project, so callers can
 * degrade gracefully while an additive migration is still rolling out.
 */
export function isMissingTable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { message?: string; code?: string };
  return (
    e.code === "PGRST205" ||
    e.code === "42P01" ||
    /Could not find the table|relation .* does not exist/i.test(e.message ?? "")
  );
}
