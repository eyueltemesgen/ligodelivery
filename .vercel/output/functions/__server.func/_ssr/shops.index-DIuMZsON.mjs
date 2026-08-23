import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { h as Route$1 } from "./router-D937WmAP2.mjs";
import { l as shopsQuery, t as categoriesQuery } from "./queries-DB3Dy3Ev.mjs";
import { t as BannerSlot } from "./BannerSlot-CZu2cYv7.mjs";
import { r as ShopGridSkeleton } from "./Skeletons-D2wOZi3v.mjs";
import { n as ShopCard } from "./Cards-DDWOxbbu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/shops.index-DIuMZsON.js
var import_jsx_runtime = require_jsx_runtime();
function ShopsPage() {
	const { category } = Route$1.useSearch();
	const { data: categories = [] } = useQuery(categoriesQuery);
	const { data: shops = [], isLoading } = useQuery(shopsQuery(category));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-ligo py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BannerSlot, {
				placement: "shops",
				className: "px-0 py-4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl font-extrabold",
				children: "Shops"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5 flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/shops",
					search: {},
					className: `rounded-full border px-3 py-1.5 text-sm ${!category ? "border-primary bg-primary text-primary-foreground" : "border-border"}`,
					children: "All"
				}), categories.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/shops",
					search: { category: c.id },
					className: `rounded-full border px-3 py-1.5 text-sm ${category === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`,
					children: c.name
				}, c.id))]
			}),
			isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShopGridSkeleton, {})
			}) : shops.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-8 text-sm text-muted-foreground",
				children: "No shops in this category yet."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
				children: shops.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShopCard, { shop: s }, s.id))
			})
		]
	});
}
//#endregion
export { ShopsPage as component };
