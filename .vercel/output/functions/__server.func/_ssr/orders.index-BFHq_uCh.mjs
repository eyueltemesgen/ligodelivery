import { r as supabase } from "./client-D2C38fHY.mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { _ as Button, d as formatDate, i as STATUS_LABEL, l as ETB, s as statusTone } from "./router-D937WmAP.mjs";
import { j as useAuth } from "./router-D937WmAP2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/orders.index-BFHq_uCh.js
var import_jsx_runtime = require_jsx_runtime();
function OrdersPage() {
	const { user, loading } = useAuth();
	const { data = [] } = useQuery({
		queryKey: ["orders", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
			return data ?? [];
		}
	});
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "container-ligo py-16 text-muted-foreground",
		children: "Loading…"
	});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-ligo py-16 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-2xl font-extrabold",
			children: "Sign in to track your orders"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			asChild: true,
			className: "mt-6",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/login",
				children: "Sign in"
			})
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-ligo max-w-3xl py-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-3xl font-extrabold",
			children: "My orders"
		}), data.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-8 text-sm text-muted-foreground",
			children: "No orders yet."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-6 space-y-3",
			children: data.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/orders/$orderId",
				params: { orderId: o.id },
				className: "flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-pop",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display font-bold",
					children: o.order_code
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: formatDate(o.created_at)
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-right",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `rounded-full px-2 py-1 text-xs font-semibold ${statusTone(o.status)}`,
						children: STATUS_LABEL[o.status] ?? o.status
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm font-semibold",
						children: ETB(o.total)
					})]
				})]
			}) }, o.id))
		})]
	});
}
//#endregion
export { OrdersPage as component };
