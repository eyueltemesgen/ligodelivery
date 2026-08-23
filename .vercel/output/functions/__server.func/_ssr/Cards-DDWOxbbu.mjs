import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { H as Clock, c as Truck, p as Star, x as Plus } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as Button, f as isShopOpen, l as ETB, m as StorageImage, u as discounted } from "./router-D937WmAP.mjs";
import { M as useCart } from "./router-D937WmAP2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/Cards-DDWOxbbu.js
var import_jsx_runtime = require_jsx_runtime();
/** Delivery window shown as a range, e.g. "15–25 min", with safe fallbacks. */
var deliveryWindow = (mins) => {
	const base = Math.max(Number(mins) || 25, 5);
	return `${base}–${base + 10} min`;
};
function ShopCard({ shop }) {
	const open = shop.is_online !== false && isShopOpen(shop.opens_at, shop.closes_at);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to: "/shops/$shopId",
		params: { shopId: shop.id },
		className: "group overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative aspect-[16/9] w-full overflow-hidden",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
					path: shop.cover_url ?? shop.image_url,
					alt: shop.name,
					className: "h-full w-full object-cover transition-transform group-hover:scale-105"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `absolute left-3 top-3 rounded-full px-2 py-1 text-[11px] font-semibold ${open ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`,
					children: open ? "Open now" : "Closed"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[11px] font-semibold text-foreground shadow-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3 w-3 text-primary" }), deliveryWindow(shop.delivery_time_min)]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2 p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-display text-base font-bold",
					children: shop.name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "line-clamp-1 text-sm text-muted-foreground",
					children: shop.description ?? shop.address
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "h-3 w-3 fill-warning text-warning" }), Number(shop.rating) > 0 ? Number(shop.rating).toFixed(1) : "New"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-accent-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Truck, { className: "h-3 w-3" }), Number(shop.delivery_fee) > 0 ? `${ETB(shop.delivery_fee)} fee` : "Free delivery"]
					})]
				})
			]
		})]
	});
}
function ProductCard({ product, shopName, orderingDisabled, onSelect }) {
	const { add } = useCart();
	const price = discounted(Number(product.price), product.discount_percent);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
		onClick: () => !orderingDisabled && onSelect?.(product),
		role: "button",
		tabIndex: 0,
		onKeyDown: (e) => e.key === "Enter" && !orderingDisabled && onSelect?.(product),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
			path: product.image_url,
			alt: product.name,
			className: "h-32 w-full object-cover"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-1 flex-col gap-2 p-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
					className: "line-clamp-1 text-sm font-semibold",
					children: product.name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "line-clamp-2 text-xs text-muted-foreground",
					children: product.description
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-auto flex items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-bold text-foreground",
						children: ETB(price)
					}), product.discount_percent > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-1 text-xs text-muted-foreground line-through",
						children: ETB(product.price)
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						disabled: !product.in_stock || orderingDisabled,
						onClick: (e) => {
							e.stopPropagation();
							if (onSelect) {
								onSelect(product);
								return;
							}
							add({
								productId: product.id,
								shopId: product.shop_id,
								shopName: shopName ?? "Shop",
								name: product.name,
								imagePath: product.image_url,
								unitPrice: price
							});
							toast.success(`${product.name} added to cart`);
						},
						children: orderingDisabled ? "Closed" : product.in_stock ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), " Add"] }) : "Out"
					})]
				})
			]
		})]
	});
}
//#endregion
export { ShopCard as n, ProductCard as t };
