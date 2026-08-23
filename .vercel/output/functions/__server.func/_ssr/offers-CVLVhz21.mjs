import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { d as formatDate, m as StorageImage } from "./router-D937WmAP.mjs";
import { r as offersQuery } from "./queries-DB3Dy3Ev.mjs";
import { t as BannerSlot } from "./BannerSlot-CZu2cYv7.mjs";
import { r as ShopGridSkeleton } from "./Skeletons-D2wOZi3v.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/offers-CVLVhz21.js
var import_jsx_runtime = require_jsx_runtime();
function OffersPage() {
	const { data = [], isLoading } = useQuery(offersQuery);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-ligo py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BannerSlot, {
				placement: "offers",
				className: "px-0 py-4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl font-extrabold",
				children: "Offers"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-muted-foreground",
				children: "Deals running right now in Bishoftu."
			}),
			isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShopGridSkeleton, {})
			}) : data.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-8 text-sm text-muted-foreground",
				children: "No active offers right now — check back soon."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
				children: data.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
						path: o.image_url,
						alt: o.title,
						className: "h-32 w-full object-cover"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1 p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "inline-flex rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground",
								children: o.discount_type === "percent" ? `${o.discount_value}% off` : `${o.discount_value} ETB off`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-display text-lg font-bold",
								children: o.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted-foreground",
								children: o.description
							}),
							o.ends_at && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted-foreground",
								children: ["Ends ", formatDate(o.ends_at)]
							})
						]
					})]
				}, o.id))
			})
		]
	});
}
//#endregion
export { OffersPage as component };
