import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { f as PayoutsAdmin, u as FinancialsPanel } from "./router-D937WmAP2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.financials-DF4qQ4x1.js
var import_jsx_runtime = require_jsx_runtime();
function FinancialsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-2xl font-extrabold",
			children: "Financials & Earnings"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FinancialsPanel, {})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-lg font-bold",
			children: "Rider cashout requests"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PayoutsAdmin, {})] })]
	});
}
//#endregion
export { FinancialsPage as component };
