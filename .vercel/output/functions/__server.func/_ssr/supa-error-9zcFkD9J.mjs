//#region node_modules/.nitro/vite/services/ssr/assets/supa-error-9zcFkD9J.js
/** Extract the full PostgREST error detail (message + details + hint + code). */
function supabaseErrorMessage(err) {
	if (!err || typeof err !== "object") return "Request failed";
	const e = err;
	const parts = [e.message];
	if (e.details) parts.push(`(${e.details}${e.hint ? ` — hint: ${e.hint}` : ""}${e.code ? ` [${e.code}]` : ""})`);
	return parts.filter(Boolean).join(" ");
}
/** True when an RPC endpoint is missing from the live project (404). */
function isMissingRpc(err) {
	if (!err || typeof err !== "object") return false;
	const e = err;
	return e.code === "PGRST202" || e.status === 404 || /not found|Could not find the function|does not exist/i.test(e.message ?? "");
}
//#endregion
export { supabaseErrorMessage as n, isMissingRpc as t };
