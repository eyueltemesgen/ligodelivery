import { r as supabase } from "./client-D2C38fHY.mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { _ as Button, d as formatDate } from "./router-D937WmAP.mjs";
import { j as useAuth } from "./router-D937WmAP2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/notifications-BOuVfMpi.js
var import_jsx_runtime = require_jsx_runtime();
function NotificationsPage() {
	const { user } = useAuth();
	const qc = useQueryClient();
	const { data = [] } = useQuery({
		queryKey: ["notifications", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
			return data ?? [];
		}
	});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-ligo py-16 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-2xl font-extrabold",
			children: "Sign in to see notifications"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			asChild: true,
			className: "mt-6",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/login",
				children: "Sign in"
			})
		})]
	});
	const markAll = async () => {
		await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
		qc.invalidateQueries({ queryKey: ["notifications"] });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-ligo max-w-3xl py-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl font-extrabold",
				children: "Notifications"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "outline",
				size: "sm",
				onClick: markAll,
				children: "Mark all read"
			})]
		}), data.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-8 text-sm text-muted-foreground",
			children: "Nothing here yet."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-6 space-y-3",
			children: data.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: `rounded-xl border p-4 ${n.is_read ? "border-border bg-card" : "border-primary/40 bg-primary-soft"}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-semibold",
						children: n.title
					}),
					n.body && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted-foreground",
						children: n.body
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-muted-foreground",
						children: formatDate(n.created_at)
					})
				]
			}, n.id))
		})]
	});
}
//#endregion
export { NotificationsPage as component };
