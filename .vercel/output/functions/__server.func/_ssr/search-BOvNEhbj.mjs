import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { _ as Route$14 } from "./router-D937WmAP2.mjs";
import { a as searchQuery } from "./queries-DB3Dy3Ev.mjs";
import { n as ProductGridSkeleton, r as ShopGridSkeleton } from "./Skeletons-D2wOZi3v.mjs";
import { n as ShopCard, t as ProductCard } from "./Cards-DDWOxbbu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/search-BOvNEhbj.js
var import_jsx_runtime = require_jsx_runtime();
function SearchPage() {
	const { q } = Route$14.useSearch();
	const { data, isLoading } = useQuery(searchQuery(q));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-ligo py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl font-extrabold",
				children: "Search results"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-muted-foreground",
				children: q ? `Showing matches for “${q}”` : "Type something in the search bar above."
			}),
			isLoading && q && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 space-y-10",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShopGridSkeleton, { count: 3 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductGridSkeleton, { count: 4 })]
			}),
			data && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				data.shops.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "mt-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-xl font-bold",
						children: "Shops"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
						children: data.shops.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShopCard, { shop: s }, s.id))
					})]
				}),
				data.products.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "mt-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-xl font-bold",
						children: "Products"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
						children: data.products.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductCard, { product: p }, p.id))
					})]
				}),
				q && data.shops.length === 0 && data.products.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-8 text-sm text-muted-foreground",
					children: "Nothing matched your search."
				})
			] })
		]
	});
}
//#endregion
export { SearchPage as component };
