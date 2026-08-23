import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { m as StorageImage } from "./router-D937WmAP.mjs";
import { D as bannersQuery } from "./router-D937WmAP2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/BannerSlot-CZu2cYv7.js
var import_jsx_runtime = require_jsx_runtime();
function BannerSlot({ placement, className }) {
	const { data: banners = [] } = useQuery(bannersQuery(placement));
	if (banners.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: className ?? "container-ligo py-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
			children: banners.map((b) => {
				const inner = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-pop",
					children: [b.image_url && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
						path: b.image_url,
						alt: b.title,
						className: "h-40 w-full object-cover"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-lg font-bold",
								children: b.title
							}),
							b.subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted-foreground",
								children: b.subtitle
							}),
							b.cta_label && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-sm font-semibold text-primary",
								children: b.cta_label
							})
						]
					})]
				});
				return b.link_url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: b.link_url,
					className: "block",
					children: inner
				}, b.id) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: inner }, b.id);
			})
		})
	});
}
//#endregion
export { BannerSlot as t };
