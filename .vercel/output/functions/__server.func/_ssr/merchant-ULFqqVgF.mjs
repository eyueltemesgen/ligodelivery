import { i as __toESM } from "../_runtime.mjs";
import { r as supabase } from "./client-D2C38fHY.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { E as PackageCheck, f as Store, rt as BellRing } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as Button, i as STATUS_LABEL, l as ETB } from "./router-D937WmAP.mjs";
import { d as Input, j as useAuth } from "./router-D937WmAP2.mjs";
import { n as MerchantGate } from "./guards-BJ4lUOJX.mjs";
import { t as Switch } from "./switch-Cn1w-cIH.mjs";
import { r as isShopOpenNow } from "./hours-DAwDABcJ.mjs";
import { a as TabsTrigger, i as TabsList, n as Tabs, r as TabsContent, t as ShopHoursEditor } from "./tabs-DzaIlufi.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/merchant-ULFqqVgF.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function MerchantPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MerchantGate, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MerchantPortal, {}) });
}
var NEXT_STATUS = {
	confirmed: {
		to: "preparing",
		label: "Accept & start preparing"
	},
	preparing: {
		to: "ready_for_pickup",
		label: "Mark ready for pickup"
	},
	pending_payment: {
		to: "preparing",
		label: "Accept & start preparing"
	},
	pending: {
		to: "preparing",
		label: "Accept & start preparing"
	},
	payment_verification: {
		to: "preparing",
		label: "Accept & start preparing"
	}
};
function MerchantPortal() {
	const { user, isMerchant, isAdmin, loading } = useAuth();
	const qc = useQueryClient();
	const { data: shops = [] } = useQuery({
		queryKey: [
			"merchant-shops",
			user?.id,
			isAdmin
		],
		enabled: !!user && (isMerchant || isAdmin),
		queryFn: async () => {
			let q = supabase.from("shops").select("*").order("name");
			if (!isAdmin) q = q.eq("owner_id", user.id);
			const { data } = await q;
			return data ?? [];
		}
	});
	const shopIds = shops.map((s) => s.id);
	const { data: orders = [] } = useQuery({
		queryKey: ["merchant-orders", shopIds],
		enabled: shopIds.length > 0,
		refetchInterval: 15e3,
		queryFn: async () => {
			const { data } = await supabase.from("orders").select("id,order_code,status,total,subtotal,tip,delivery_fee,customer_name,customer_phone,created_at").in("shop_id", shopIds).not("status", "in", "(\"delivered\",\"cancelled\")").order("created_at", { ascending: false });
			return data ?? [];
		}
	});
	(0, import_react.useEffect)(() => {
		if (shopIds.length === 0) return;
		const channel = supabase.channel("merchant-orders-live").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "orders"
		}, () => {
			qc.invalidateQueries({ queryKey: ["merchant-orders"] });
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [qc, shopIds.length]);
	const { data: products = [] } = useQuery({
		queryKey: ["merchant-products", shopIds],
		enabled: shopIds.length > 0,
		queryFn: async () => {
			const { data } = await supabase.from("products").select("*").in("shop_id", shopIds).order("name");
			return data ?? [];
		}
	});
	if (loading || !user || !isMerchant && !isAdmin) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "container-ligo py-16 text-muted-foreground",
		children: "Loading…"
	});
	const toggleOnline = async (shopId, value) => {
		const { error } = await supabase.from("shops").update({ is_online: value }).eq("id", shopId);
		if (error) {
			toast.error(error.message);
			return;
		}
		qc.invalidateQueries({ queryKey: ["merchant-shops"] });
		toast.success(value ? "Shop is online — customers can order" : "Shop is offline — checkout is locked");
	};
	const advanceOrder = async (orderId, next) => {
		const { error } = await supabase.from("orders").update({ status: next }).eq("id", orderId);
		if (error) {
			toast.error(error.message);
			return;
		}
		qc.invalidateQueries({ queryKey: ["merchant-orders"] });
		toast.success(`Order moved to ${STATUS_LABEL[next]}`);
	};
	const setStock = async (productId, inStock) => {
		const { error } = await supabase.from("products").update({ in_stock: inStock }).eq("id", productId);
		if (error) {
			toast.error(error.message);
			return;
		}
		qc.invalidateQueries({ queryKey: ["merchant-products"] });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-ligo py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl font-extrabold",
				children: "Merchant portal"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted-foreground",
				children: "Manage incoming orders, your catalog and store availability."
			}),
			shops.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "mx-auto h-8 w-8 text-muted-foreground" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 font-semibold",
						children: "No shop linked to your account yet"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted-foreground",
						children: "The Ligo team will link your shop after reviewing your registration."
					})
				]
			}),
			shops.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
				defaultValue: "orders",
				className: "mt-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
							value: "orders",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BellRing, { className: "mr-1.5 h-4 w-4" }),
								" Orders (",
								orders.length,
								")"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
							value: "catalog",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackageCheck, { className: "mr-1.5 h-4 w-4" }), " Catalog"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "store",
							children: "Store settings"
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "orders",
						className: "mt-6 space-y-4",
						children: orders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground",
							children: "No active orders right now. New orders will appear here in real time."
						}) : orders.map((o) => {
							const next = NEXT_STATUS[o.status];
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-card",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "font-display font-bold",
									children: [
										o.order_code,
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground",
											children: STATUS_LABEL[o.status] ?? o.status
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 text-xs text-muted-foreground",
									children: [
										o.customer_name ?? "Customer",
										" · ",
										o.customer_phone ?? "—",
										" ·",
										" ",
										new Date(o.created_at).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit"
										})
									]
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-display text-lg font-bold",
										children: ETB(o.total)
									}), next && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										onClick: () => void advanceOrder(o.id, next.to),
										children: next.label
									})]
								})]
							}, o.id);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "catalog",
						className: "mt-6 space-y-3",
						children: products.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground",
							children: "No products yet — the Ligo team can import your menu."
						}) : products.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CatalogRow, {
							product: p,
							onStockChange: setStock
						}, p.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "store",
						className: "mt-6 space-y-6",
						children: shops.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "rounded-xl border border-border bg-card p-5 shadow-card",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center justify-between gap-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "font-display text-xl font-bold",
										children: s.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-muted-foreground",
										children: isShopOpenNow(s) ? "Open for orders right now" : "Currently closed for orders"
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm font-medium",
											children: s.is_online ? "Online" : "Offline"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: s.is_online,
											onCheckedChange: (v) => void toggleOnline(s.id, v)
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "mt-5 font-display text-base font-bold",
									children: "Weekly opening hours"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-3",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShopHoursEditor, {
										shopId: s.id,
										fallbackOpen: s.opens_at.slice(0, 5),
										fallbackClose: s.closes_at.slice(0, 5)
									})
								})
							]
						}, s.id))
					})
				]
			})
		]
	});
}
function CatalogRow({ product, onStockChange }) {
	const qc = useQueryClient();
	const [price, setPrice] = (0, import_react.useState)(String(product.price));
	const [saving, setSaving] = (0, import_react.useState)(false);
	const savePrice = async () => {
		const value = Number(price);
		if (!Number.isFinite(value) || value < 0) {
			toast.error("Enter a valid price");
			return;
		}
		setSaving(true);
		const { error } = await supabase.from("products").update({ price: value }).eq("id", product.id);
		setSaving(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Price updated");
		qc.invalidateQueries({ queryKey: ["merchant-products"] });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "truncate text-sm font-semibold",
					children: product.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: ETB(product.price)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: price,
					onChange: (e) => setPrice(e.target.value),
					inputMode: "decimal",
					className: "h-8 w-24 text-sm",
					"aria-label": "Price"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "outline",
					disabled: saving,
					onClick: () => void savePrice(),
					children: "Save"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-center gap-2 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: product.in_stock ? "text-primary" : "text-muted-foreground",
					children: product.in_stock ? "In stock" : "Out of stock"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
					checked: product.in_stock,
					onCheckedChange: (v) => void onStockChange(product.id, v)
				})]
			})
		]
	});
}
//#endregion
export { MerchantPage as component };
