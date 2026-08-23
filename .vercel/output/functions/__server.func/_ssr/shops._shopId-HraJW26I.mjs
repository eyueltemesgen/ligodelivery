import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { A as Minus, H as Clock, N as MapPin, S as Phone, p as Star, x as Plus } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as Button, l as ETB, m as StorageImage, u as discounted } from "./router-D937WmAP.mjs";
import { M as useCart, m as Route } from "./router-D937WmAP2.mjs";
import { c as shopQuery, o as shopHoursQuery, s as shopProductsQuery } from "./queries-DB3Dy3Ev.mjs";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, t as Dialog } from "./dialog-CwLzEEob.mjs";
import { n as closedReason, r as isShopOpenNow } from "./hours-DAwDABcJ.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
import { i as Skeleton, n as ProductGridSkeleton } from "./Skeletons-D2wOZi3v.mjs";
import { t as ProductCard } from "./Cards-DDWOxbbu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/shops._shopId-HraJW26I.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var DEFAULT_OPTION_GROUPS = [{
	key: "size",
	label: "Size",
	multi: false,
	choices: [
		{
			name: "Regular",
			priceDelta: 0
		},
		{
			name: "Large",
			priceDelta: 40
		},
		{
			name: "Family",
			priceDelta: 90
		}
	]
}, {
	key: "extras",
	label: "Extras",
	multi: true,
	choices: [
		{
			name: "Extra cheese",
			priceDelta: 25
		},
		{
			name: "Extra sauce",
			priceDelta: 10
		},
		{
			name: "Spicy",
			priceDelta: 0
		},
		{
			name: "Extra portion",
			priceDelta: 45
		}
	]
}];
function ProductModal({ product, shopName, open, onOpenChange }) {
	const { add } = useCart();
	const [qty, setQty] = (0, import_react.useState)(1);
	const [notes, setNotes] = (0, import_react.useState)("");
	const [picked, setPicked] = (0, import_react.useState)({});
	const price = (0, import_react.useMemo)(() => product ? discounted(Number(product.price), product.discount_percent) : 0, [product]);
	const unitPrice = price + (0, import_react.useMemo)(() => {
		let sum = 0;
		for (const g of DEFAULT_OPTION_GROUPS) for (const c of g.choices) if (picked[g.key]?.includes(c.name)) sum += c.priceDelta;
		return sum;
	}, [picked]);
	const reset = () => {
		setQty(1);
		setNotes("");
		setPicked({});
	};
	const toggle = (group, choice) => {
		setPicked((prev) => {
			const current = prev[group.key] ?? [];
			if (group.multi) return {
				...prev,
				[group.key]: current.includes(choice) ? current.filter((c) => c !== choice) : [...current, choice]
			};
			return {
				...prev,
				[group.key]: [choice]
			};
		});
	};
	const addToCart = () => {
		if (!product) return;
		const noteText = [DEFAULT_OPTION_GROUPS.flatMap((g) => (picked[g.key] ?? []).map((c) => `${g.label}: ${c}`)).join(" · "), notes.trim()].filter(Boolean).join(" — ");
		add({
			productId: product.id,
			shopId: product.shop_id,
			shopName,
			name: noteText ? `${product.name} (${noteText})` : product.name,
			imagePath: product.image_url,
			unitPrice
		}, qty);
		toast.success(`${product.name} added to cart`);
		onOpenChange(false);
		reset();
	};
	if (!product) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: (o) => {
			onOpenChange(o);
			if (!o) reset();
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-h-[90vh] overflow-y-auto sm:max-w-lg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "relative -mx-6 -mt-6 h-52 overflow-hidden sm:rounded-t-lg",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
						path: product.image_url,
						alt: product.name,
						className: "h-full w-full object-cover",
						priority: true
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: product.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "shrink-0 font-display text-lg",
						children: ETB(price)
					})]
				}), product.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: product.description
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-5 py-2",
					children: [DEFAULT_OPTION_GROUPS.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm font-bold",
						children: [g.label, g.multi && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-1 text-xs font-normal text-muted-foreground",
							children: "(optional)"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 flex flex-wrap gap-2",
						children: g.choices.map((c) => {
							const active = picked[g.key]?.includes(c.name);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => toggle(g, c.name),
								className: `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-secondary"}`,
								children: [c.name, c.priceDelta > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "ml-1",
									children: ["+", ETB(c.priceDelta)]
								})]
							}, c.name);
						})
					})] }, g.key)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-bold",
						children: "Special instructions"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
						value: notes,
						onChange: (e) => setNotes(e.target.value),
						placeholder: "e.g. no onions, extra hot…",
						className: "mt-2",
						rows: 2
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3 border-t border-border pt-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 rounded-full border border-border px-2 py-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setQty((q) => Math.max(1, q - 1)),
								"aria-label": "Decrease quantity",
								className: "rounded-full p-1 hover:bg-secondary",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "min-w-5 text-center font-bold",
								children: qty
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setQty((q) => q + 1),
								"aria-label": "Increase quantity",
								className: "rounded-full p-1 hover:bg-secondary",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" })
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "flex-1",
						onClick: addToCart,
						disabled: !product.in_stock,
						children: product.in_stock ? `Add to order · ${ETB(unitPrice * qty)}` : "Out of stock"
					})]
				})
			]
		})
	});
}
function ShopDetail() {
	const { shopId } = Route.useParams();
	const { data: shop, isLoading } = useQuery(shopQuery(shopId));
	const { data: products = [] } = useQuery(shopProductsQuery(shopId));
	const { data: hours = [] } = useQuery(shopHoursQuery(shopId));
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [activeSection, setActiveSection] = (0, import_react.useState)("all");
	const sectionRefs = (0, import_react.useRef)({});
	const sections = (0, import_react.useMemo)(() => {
		const inStock = products.filter((p) => p.in_stock);
		const popular = products.filter((p) => p.is_popular);
		const groups = [];
		if (popular.length > 0) groups.push({
			key: "popular",
			label: "⭐ Popular",
			items: popular
		});
		groups.push({
			key: "all",
			label: "Full menu",
			items: products
		});
		const rest = products.filter((p) => !p.is_popular);
		if (rest.length > 0 && popular.length > 0) groups.push({
			key: "more",
			label: "More",
			items: rest
		});
		if (popular.length > 0) groups.splice(1, 1);
		return groups.filter((g) => g.items.length > 0 && (g.key !== "all" || inStock.length >= 0));
	}, [products]);
	(0, import_react.useEffect)(() => {
		if (!shop) return;
		const onScroll = () => {
			const offset = window.scrollY + 140;
			let current = sections[0]?.key ?? "all";
			for (const s of sections) {
				const el = sectionRefs.current[s.key];
				if (el && el.offsetTop <= offset) current = s.key;
			}
			setActiveSection(current);
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, [shop, sections]);
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-56 w-full rounded-none" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-ligo -mt-10 pb-12",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-3 rounded-xl border border-border bg-card p-5 shadow-pop",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-7 w-1/3" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-2/3" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-1/2" })
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-8",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductGridSkeleton, { count: 6 })
		})]
	})] });
	if (!shop) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "container-ligo py-16",
		children: "Shop not found."
	});
	const open = isShopOpenNow(shop, hours);
	const scrollTo = (key) => {
		const el = sectionRefs.current[key];
		if (el) window.scrollTo({
			top: el.offsetTop - 110,
			behavior: "smooth"
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "relative h-56 w-full overflow-hidden bg-surface",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
				path: shop.cover_url ?? shop.image_url,
				alt: shop.name,
				className: "h-56 w-full object-cover",
				priority: true
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "container-ligo -mt-10 pb-12",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-card p-5 shadow-pop",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "font-display text-2xl font-extrabold",
								children: shop.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `rounded-full px-2 py-1 text-xs font-semibold ${open ? "bg-primary-soft text-accent-foreground" : "bg-muted text-muted-foreground"}`,
								children: open ? "Open now" : "Closed"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted-foreground",
							children: shop.description
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "h-3.5 w-3.5 fill-warning text-warning" }), shop.rating]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3.5 w-3.5" }),
										shop.delivery_time_min,
										" min · ",
										ETB(shop.delivery_fee),
										" delivery"
									]
								}),
								shop.address && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-3.5 w-3.5" }), shop.address]
								}),
								shop.phone && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "h-3.5 w-3.5" }), shop.phone]
								})
							]
						})
					]
				}),
				sections.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "sticky top-16 z-30 -mx-4 mt-6 border-y border-border bg-background/95 px-4 backdrop-blur",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: "flex gap-1 overflow-x-auto py-2",
						children: sections.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => scrollTo(s.key),
							className: `whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${activeSection === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`,
							children: s.label
						}, s.key))
					})
				}),
				!open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm",
					children: [closedReason(shop, hours), " You can browse the menu, but ordering is disabled until the shop reopens."]
				}),
				products.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted-foreground",
					children: "No items listed yet."
				}) : sections.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					ref: (el) => {
						sectionRefs.current[s.key] = el;
					},
					className: "scroll-mt-28 pt-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-xl font-bold",
						children: s.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
						children: s.items.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductCard, {
							product: p,
							shopName: shop.name,
							orderingDisabled: !open,
							onSelect: (prod) => setSelected(prod)
						}, p.id))
					})]
				}, s.key))
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductModal, {
			product: selected,
			shopName: shop.name,
			open: !!selected,
			onOpenChange: (o) => !o && setSelected(null)
		})
	] });
}
//#endregion
export { ShopDetail as component };
