import { r as supabase } from "./client-D2C38fHY.mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { _ as Navigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { H as Clock, f as Store, v as ShieldAlert } from "../_libs/lucide-react.mjs";
import { _ as Button } from "./router-D937WmAP.mjs";
import { j as useAuth } from "./router-D937WmAP2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/guards-BJ4lUOJX.js
var import_jsx_runtime = require_jsx_runtime();
function Loading() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "container-ligo py-16 text-muted-foreground",
		children: "Loading…"
	});
}
function Message({ icon: Icon, title, body, action }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "container-ligo py-16 text-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-md rounded-xl border border-border bg-card p-8 shadow-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "mx-auto h-8 w-8 text-muted-foreground" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-4 font-display text-2xl font-extrabold",
					children: title
				}),
				body && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: body
				}),
				action && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: action
				})
			]
		})
	});
}
/** /admin/* — admin role in user_roles only. */
function AdminGate({ children }) {
	const { user, loading, isAdmin } = useAuth();
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Loading, {});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/admin/login" });
	if (!isAdmin) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Message, {
		icon: ShieldAlert,
		title: "Admins only",
		body: "This area is restricted to Ligo operations staff.",
		action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			asChild: true,
			variant: "outline",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				children: "Back to the app"
			})
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
/** /rider/* — rider role; approved riders see the portal, others see their verification state. */
function RiderGate({ children }) {
	const { user, loading, isRider } = useAuth();
	const { data: rider, isLoading } = useQuery({
		queryKey: ["rider-me", user?.id],
		enabled: !!user && isRider,
		queryFn: async () => {
			const { data } = await supabase.from("riders").select("*").eq("id", user.id).maybeSingle();
			return data;
		}
	});
	if (loading || isRider && isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Loading, {});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/rider/login" });
	if (!isRider) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Message, {
		icon: ShieldAlert,
		title: "You're not registered as a rider",
		action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/register",
				search: { role: "rider" },
				children: "Apply to become a rider"
			})
		})
	});
	if (!rider?.is_approved) {
		const rejected = rider?.verification_status === "rejected";
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Message, {
			icon: Clock,
			title: rejected ? "Application needs attention" : "Approval pending",
			body: rejected ? `Our team reviewed your application: ${rider?.review_notes ?? "please update your details and resubmit."}` : "Your rider account is under review. You'll be able to go online as soon as an admin approves your documents.",
			action: rejected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/rider/join",
					children: "Update & resubmit application"
				})
			}) : void 0
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
/** /merchant/* — merchant role with an admin-verified (active) shop. */
function MerchantGate({ children }) {
	const { user, loading, isMerchant, isAdmin } = useAuth();
	const { data: shops = [], isLoading } = useQuery({
		queryKey: ["merchant-gate-shops", user?.id],
		enabled: !!user && isMerchant && !isAdmin,
		queryFn: async () => {
			const { data } = await supabase.from("shops").select("id,is_active").eq("owner_id", user.id);
			return data ?? [];
		}
	});
	if (loading || isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Loading, {});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/merchant/login" });
	if (!isMerchant && !isAdmin) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Message, {
		icon: ShieldAlert,
		title: "Merchants only",
		body: "Shop accounts are set up by the Ligo team — contact us to onboard your store.",
		action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			asChild: true,
			variant: "outline",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				children: "Back to the app"
			})
		})
	});
	if (!isAdmin) {
		if (shops.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Message, {
			icon: Store,
			title: "No shop linked to your account",
			body: "The Ligo team will link your shop after onboarding. Contact us if you think this is a mistake."
		});
		if (!shops.some((s) => s.is_active)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Message, {
			icon: Clock,
			title: "Shop verification pending",
			body: "Your shop is being reviewed by the Ligo team. You'll be able to manage it here as soon as it's verified."
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
/** Where a user lands after login, based on their verified role. */
function portalPathFor(roles) {
	if (roles.includes("admin")) return "/admin";
	if (roles.includes("rider")) return "/rider";
	if (roles.includes("merchant")) return "/merchant";
	return "/";
}
//#endregion
export { portalPathFor as i, MerchantGate as n, RiderGate as r, AdminGate as t };
