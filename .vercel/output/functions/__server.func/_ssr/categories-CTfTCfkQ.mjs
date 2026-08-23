import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { m as StorageImage } from "./router-D937WmAP.mjs";
import { t as categoriesQuery } from "./queries-DB3Dy3Ev.mjs";
import { t as BannerSlot } from "./BannerSlot-CZu2cYv7.mjs";
import { t as CategoryCardSkeleton } from "./Skeletons-D2wOZi3v.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/categories-CTfTCfkQ.js
var import_jsx_runtime = require_jsx_runtime();
function CategoriesPage() {
	const { data = [], isLoading } = useQuery(categoriesQuery);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-ligo py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BannerSlot, {
				placement: "categories",
				className: "px-0 py-4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl font-extrabold",
				children: "Categories"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-muted-foreground",
				children: "Pick what you need delivered today."
			}),
			isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4",
				children: Array.from({ length: 8 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CategoryCardSkeleton, {}, i))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4",
				children: data.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/shops",
					search: { category: c.id },
					className: "overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
						path: c.image_url,
						alt: c.name,
						className: "h-28 w-full object-cover"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-3 text-sm font-semibold",
						children: c.name
					})]
				}, c.id))
			})
		]
	});
}
//#endregion
export { CategoriesPage as component };
