import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { _ as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { y as Route$23 } from "./router-D937WmAP2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-TiIx8AsQ.js
var import_jsx_runtime = require_jsx_runtime();
function AuthRedirect() {
	const { mode, role } = Route$23.useSearch();
	if (mode === "register") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, {
		to: "/register",
		search: { role },
		replace: true
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, {
		to: "/login",
		replace: true
	});
}
//#endregion
export { AuthRedirect as component };
