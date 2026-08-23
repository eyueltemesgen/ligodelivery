import { i as __toESM } from "../_runtime.mjs";
import { r as supabase, t as __exportAll } from "./client-D2C38fHY.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, m as createFileRoute, p as lazyRouteComponent, s as Scripts, v as useNavigate, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { n as QueryClientProvider, r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { A as Minus, F as LogOut, L as LayoutDashboard, N as MapPin, P as Mail, Q as Check, S as Phone, T as Package, W as Circle, Y as ChevronRight, a as User, b as Search, d as Sun, f as Store, g as ShoppingBag, h as ShoppingCart, j as Menu, k as Moon, l as Trash2, nt as Bell, t as X, x as Plus, z as House } from "../_libs/lucide-react.mjs";
import { a as DialogOverlay, i as DialogDescription, n as DialogClose, o as DialogPortal, r as DialogContent, s as DialogTitle, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { a as Label2, c as Root2, d as SubTrigger2, f as Trigger, i as ItemIndicator2, l as Separator2, n as Content2, o as Portal2, r as Item2, s as RadioItem2, t as CheckboxItem2, u as SubContent2 } from "../_libs/@radix-ui/react-dropdown-menu+[...].mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
import { _ as Button, d as formatDate, l as ETB, m as StorageImage, n as IdentityAvatar, o as notify, v as cn } from "./router-D937WmAP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-D937WmAP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-B5uLY39H.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
	const message = error instanceof Response ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` : error instanceof Error ? error.message : String(error);
	const stack = error instanceof Error ? error.stack : void 0;
	window.__lovableReportRuntimeError?.({
		message,
		...stack !== void 0 && { stack },
		filename: window.location.pathname
	});
}
var AuthContext = (0, import_react.createContext)(null);
function AuthProvider({ children }) {
	const [session, setSession] = (0, import_react.useState)(null);
	const [profile, setProfile] = (0, import_react.useState)(null);
	const [roles, setRoles] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const load = async (uid) => {
		if (!uid) {
			setProfile(null);
			setRoles([]);
			return;
		}
		const [{ data: p }, { data: r }] = await Promise.all([supabase.from("profiles").select("id, full_name, phone, email, avatar_url").eq("id", uid).maybeSingle(), supabase.from("user_roles").select("role").eq("user_id", uid)]);
		setProfile(p ?? null);
		setRoles((r ?? []).map((x) => x.role));
	};
	(0, import_react.useEffect)(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
			setSession(next);
			setTimeout(() => {
				load(next?.user?.id);
			}, 0);
		});
		supabase.auth.getSession().then(async ({ data }) => {
			setSession(data.session);
			await load(data.session?.user?.id);
			setLoading(false);
		});
		return () => sub.subscription.unsubscribe();
	}, []);
	const value = {
		session,
		user: session?.user ?? null,
		profile,
		roles,
		loading,
		isAdmin: roles.includes("admin"),
		isRider: roles.includes("rider"),
		isMerchant: roles.includes("merchant"),
		refresh: () => load(session?.user?.id),
		signOut: async () => {
			await supabase.auth.signOut();
			setProfile(null);
			setRoles([]);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthContext.Provider, {
		value,
		children
	});
}
function useAuth() {
	const ctx = (0, import_react.useContext)(AuthContext);
	if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
	return ctx;
}
var STORAGE_KEY = "ligo-theme";
var ThemeContext = (0, import_react.createContext)(null);
function getInitialTheme() {
	if (typeof window === "undefined") return "light";
	const stored = window.localStorage.getItem(STORAGE_KEY);
	if (stored === "light" || stored === "dark") return stored;
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function ThemeProvider({ children }) {
	const [theme, setTheme] = (0, import_react.useState)(getInitialTheme);
	(0, import_react.useEffect)(() => {
		document.documentElement.classList.toggle("dark", theme === "dark");
		window.localStorage.setItem(STORAGE_KEY, theme);
	}, [theme]);
	const value = {
		theme,
		setTheme,
		toggleTheme: () => setTheme((t) => t === "dark" ? "light" : "dark")
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeContext.Provider, {
		value,
		children
	});
}
function useTheme() {
	const ctx = (0, import_react.useContext)(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
	return ctx;
}
var CartContext = (0, import_react.createContext)(null);
var KEY = "ligo.cart.v1";
function CartProvider({ children }) {
	const [items, setItems] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		try {
			const raw = localStorage.getItem(KEY);
			if (raw) setItems(JSON.parse(raw));
		} catch {}
	}, []);
	(0, import_react.useEffect)(() => {
		try {
			localStorage.setItem(KEY, JSON.stringify(items));
		} catch {}
	}, [items]);
	const value = (0, import_react.useMemo)(() => {
		const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
		return {
			items,
			subtotal,
			count: items.reduce((sum, i) => sum + i.quantity, 0),
			shopId: items[0]?.shopId ?? null,
			shopName: items[0]?.shopName ?? null,
			add: (item, qty = 1) => setItems((prev) => {
				const base = prev.length && prev[0]?.shopId !== item.shopId ? [] : prev;
				if (base.find((i) => i.productId === item.productId)) return base.map((i) => i.productId === item.productId ? {
					...i,
					quantity: i.quantity + qty
				} : i);
				return [...base, {
					...item,
					quantity: qty
				}];
			}),
			setQty: (productId, qty) => setItems((prev) => qty <= 0 ? prev.filter((i) => i.productId !== productId) : prev.map((i) => i.productId === productId ? {
				...i,
				quantity: qty
			} : i)),
			remove: (productId) => setItems((prev) => prev.filter((i) => i.productId !== productId)),
			clear: () => setItems([])
		};
	}, [items]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartContext.Provider, {
		value,
		children
	});
}
function useCart() {
	const ctx = (0, import_react.useContext)(CartContext);
	if (!ctx) throw new Error("useCart must be used inside CartProvider");
	return ctx;
}
var BANNER_PLACEMENTS = [
	{
		value: "home_top",
		label: "Home — top (above hero)"
	},
	{
		value: "home_hero",
		label: "Home — hero image"
	},
	{
		value: "home_middle",
		label: "Home — middle (after categories)"
	},
	{
		value: "home_bottom",
		label: "Home — bottom"
	},
	{
		value: "shops",
		label: "Shops page"
	},
	{
		value: "offers",
		label: "Offers page"
	},
	{
		value: "categories",
		label: "Categories page"
	}
];
var DEFAULT_CONTENT = {
	brand_name: "Ligo Delivery",
	brand_short_name: "Ligo",
	brand_tagline: "Fast. Local. Delivered.",
	logo_url: "",
	city: "Bishoftu",
	hero_badge: "Delivering across Bishoftu",
	hero_title: "Everything you need, delivered in minutes",
	hero_subtitle: "Food, groceries, pharmacy and daily essentials from your favourite Bishoftu shops — with live tracking and Telebirr, CBE, BOA or cash payment.",
	hero_primary_cta: "Order now",
	hero_secondary_cta: "Become a rider",
	categories_title: "Categories",
	offers_title: "Today's offers",
	shops_title: "Popular shops",
	trending_title: "Trending items",
	how_title: "How Ligo works",
	how_step1_title: "1. Choose",
	how_step1_text: "Browse Bishoftu shops and add items to your cart.",
	how_step2_title: "2. Pay",
	how_step2_text: "Cash on delivery or upload your Telebirr/bank receipt.",
	how_step3_title: "3. Track",
	how_step3_text: "Follow your rider live until the order arrives.",
	footer_tagline: "Ligo delivers food, groceries and essentials across Bishoftu — fast, local and reliable.",
	contact_phone: "+251942578001",
	contact_email: "hello@ligo.et",
	contact_address: "Bishoftu, Oromia",
	developer_name: "Eyuel Temesgen",
	company_name: "EYVORA Technologies"
};
var CONTENT_FIELDS = [
	{
		key: "brand_name",
		label: "Brand name"
	},
	{
		key: "brand_short_name",
		label: "Short name (header logo)"
	},
	{
		key: "brand_tagline",
		label: "Logo tagline"
	},
	{
		key: "city",
		label: "City"
	},
	{
		key: "hero_badge",
		label: "Hero badge"
	},
	{
		key: "hero_title",
		label: "Hero title",
		long: true
	},
	{
		key: "hero_subtitle",
		label: "Hero subtitle",
		long: true
	},
	{
		key: "hero_primary_cta",
		label: "Hero primary button"
	},
	{
		key: "hero_secondary_cta",
		label: "Hero secondary button"
	},
	{
		key: "categories_title",
		label: "Categories section title"
	},
	{
		key: "offers_title",
		label: "Offers section title"
	},
	{
		key: "shops_title",
		label: "Shops section title"
	},
	{
		key: "trending_title",
		label: "Trending section title"
	},
	{
		key: "how_title",
		label: "How it works title"
	},
	{
		key: "how_step1_title",
		label: "Step 1 title"
	},
	{
		key: "how_step1_text",
		label: "Step 1 text",
		long: true
	},
	{
		key: "how_step2_title",
		label: "Step 2 title"
	},
	{
		key: "how_step2_text",
		label: "Step 2 text",
		long: true
	},
	{
		key: "how_step3_title",
		label: "Step 3 title"
	},
	{
		key: "how_step3_text",
		label: "Step 3 text",
		long: true
	},
	{
		key: "footer_tagline",
		label: "Footer tagline",
		long: true
	},
	{
		key: "contact_phone",
		label: "Contact phone"
	},
	{
		key: "contact_email",
		label: "Contact email"
	},
	{
		key: "contact_address",
		label: "Contact address"
	},
	{
		key: "developer_name",
		label: "Developer name"
	},
	{
		key: "company_name",
		label: "Company name"
	}
];
var siteContentQuery = {
	queryKey: ["site-content"],
	queryFn: async () => {
		const { data } = await supabase.from("settings").select("value").eq("key", "site_content").maybeSingle();
		return {
			...DEFAULT_CONTENT,
			...data?.value ?? {}
		};
	},
	placeholderData: DEFAULT_CONTENT
};
var bannersQuery = (placement) => ({
	queryKey: ["banners", placement ?? "all"],
	queryFn: async () => {
		let q = supabase.from("banners").select("*").eq("is_active", true).order("sort_order");
		if (placement) q = q.eq("placement", placement);
		const { data } = await q;
		return data ?? [];
	}
});
function Logo({ compact = false }) {
	const { data: c } = useQuery(siteContentQuery);
	const short = c?.brand_short_name || c?.brand_name || "Ligo";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to: "/",
		className: "flex items-center gap-2",
		children: [c?.logo_url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
			path: c.logo_url,
			alt: short,
			className: "h-9 w-9 rounded-lg object-cover"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "grid h-9 w-9 place-items-center rounded-lg bg-primary font-display text-lg font-extrabold text-primary-foreground",
			children: short.charAt(0).toUpperCase()
		}), !compact && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "leading-none",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block font-display text-xl font-extrabold tracking-tight",
				children: short
			}), c?.brand_tagline && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block text-[11px] font-medium text-muted-foreground",
				children: c.brand_tagline
			})]
		})]
	});
}
function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	const [mounted, setMounted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setMounted(true), []);
	const dark = mounted && theme === "dark";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: toggleTheme,
		"aria-label": dark ? "Switch to light mode" : "Switch to dark mode",
		className: "relative grid h-9 w-9 place-items-center rounded-md transition-all duration-100 hover:bg-secondary active:scale-95",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: `h-5 w-5 transition-all duration-300 ${dark ? "absolute scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: `h-5 w-5 transition-all duration-300 ${dark ? "scale-100 rotate-0 opacity-100" : "absolute scale-0 rotate-90 opacity-0"}` })]
	});
}
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		className: cn("flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Input.displayName = "Input";
var Sheet = Dialog;
var SheetPortal = DialogPortal;
var SheetOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
SheetOverlay.displayName = DialogOverlay.displayName;
var sheetVariants = cva("fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out", {
	variants: { side: {
		top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
		bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
		left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
		right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
	} },
	defaultVariants: { side: "right" }
});
var SheetContent = import_react.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
	ref,
	className: cn(sheetVariants({ side }), className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Close"
		})]
	}), children]
})] }));
SheetContent.displayName = DialogContent.displayName;
var SheetHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
SheetHeader.displayName = "SheetHeader";
var SheetFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
SheetFooter.displayName = "SheetFooter";
var SheetTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
	ref,
	className: cn("text-lg font-semibold text-foreground", className),
	...props
}));
SheetTitle.displayName = DialogTitle.displayName;
var SheetDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
SheetDescription.displayName = DialogDescription.displayName;
/** Live sliding side-cart drawer, opened from the header cart button. */
function CartDrawer({ open, onOpenChange }) {
	const { items, setQty, remove, clear, count, subtotal, shopName } = useCart();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetContent, {
			side: "right",
			className: "flex w-full flex-col sm:max-w-md",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetTitle, {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingCart, { className: "h-5 w-5" }),
					"Your cart ",
					count > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-muted-foreground",
						children: [
							"(",
							count,
							")"
						]
					})
				]
			}), shopName && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted-foreground",
				children: ["from ", shopName]
			})] }), items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-1 flex-col items-center justify-center gap-3 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingCart, { className: "h-10 w-10 text-muted-foreground/40" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-semibold",
						children: "Your cart is empty"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "Add some items from a shop to get started."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						variant: "outline",
						onClick: () => onOpenChange(false),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/shops",
							children: "Browse shops"
						})
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-1 space-y-4 overflow-y-auto py-4",
				children: items.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
						path: i.imagePath,
						alt: i.name,
						className: "h-16 w-16 shrink-0 rounded-lg object-cover"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-1 flex-col",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-semibold leading-tight",
								children: i.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => remove(i.productId),
								"aria-label": `Remove ${i.name}`,
								className: "text-muted-foreground transition-colors hover:text-destructive",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-auto flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 rounded-full border border-border px-1 py-0.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setQty(i.productId, i.quantity - 1),
										"aria-label": "Decrease quantity",
										className: "rounded-full p-1 hover:bg-secondary",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "h-3.5 w-3.5" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "min-w-4 text-center text-sm font-semibold",
										children: i.quantity
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setQty(i.productId, i.quantity + 1),
										"aria-label": "Increase quantity",
										className: "rounded-full p-1 hover:bg-secondary",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5" })
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-bold",
								children: ETB(i.unitPrice * i.quantity)
							})]
						})]
					})]
				}, i.productId))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetFooter, {
				className: "border-t border-border pt-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm text-muted-foreground",
						children: "Subtotal"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-display text-lg font-bold",
						children: ETB(subtotal)
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: clear,
						className: "flex-none",
						children: "Clear"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						className: "flex-1",
						onClick: () => onOpenChange(false),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/checkout",
							children: ["Checkout · ", ETB(subtotal)]
						})
					})]
				})]
			})] })]
		})
	});
}
/** Header trigger button with a live item-count badge. */
function CartTrigger({ onOpen }) {
	const { count } = useCart();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick: onOpen,
		className: "relative rounded-md p-2 transition-all duration-100 hover:bg-secondary active:scale-95",
		"aria-label": "Open cart",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingBag, { className: "h-5 w-5" }), count > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground",
			children: count
		})]
	});
}
var DropdownMenu = Root2;
var DropdownMenuTrigger = Trigger;
var DropdownMenuSubTrigger = import_react.forwardRef(({ className, inset, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SubTrigger2, {
	ref,
	className: cn("flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", inset && "pl-8", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "ml-auto" })]
}));
DropdownMenuSubTrigger.displayName = SubTrigger2.displayName;
var DropdownMenuSubContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubContent2, {
	ref,
	className: cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)", className),
	...props
}));
DropdownMenuSubContent.displayName = SubContent2.displayName;
var DropdownMenuContent = import_react.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	sideOffset,
	className: cn("z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md", "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)", className),
	...props
}) }));
DropdownMenuContent.displayName = Content2.displayName;
var DropdownMenuItem = import_react.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0", inset && "pl-8", className),
	...props
}));
DropdownMenuItem.displayName = Item2.displayName;
var DropdownMenuCheckboxItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CheckboxItem2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemIndicator2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }) })
	}), children]
}));
DropdownMenuCheckboxItem.displayName = CheckboxItem2.displayName;
var DropdownMenuRadioItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(RadioItem2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemIndicator2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { className: "h-2 w-2 fill-current" }) })
	}), children]
}));
DropdownMenuRadioItem.displayName = RadioItem2.displayName;
var DropdownMenuLabel = import_react.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label2, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className),
	...props
}));
DropdownMenuLabel.displayName = Label2.displayName;
var DropdownMenuSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator2, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
DropdownMenuSeparator.displayName = Separator2.displayName;
var DropdownMenuShortcut = ({ className, ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("ml-auto text-xs tracking-widest opacity-60", className),
		...props
	});
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";
var NAV = [
	{
		to: "/categories",
		label: "Categories"
	},
	{
		to: "/shops",
		label: "Shops"
	},
	{
		to: "/offers",
		label: "Offers"
	},
	{
		to: "/orders",
		label: "Track order"
	}
];
function SiteHeader() {
	const { user, profile, isAdmin, isRider, isMerchant, signOut } = useAuth();
	const { data: content } = useQuery(siteContentQuery);
	const navigate = useNavigate();
	const [term, setTerm] = (0, import_react.useState)("");
	const [open, setOpen] = (0, import_react.useState)(false);
	const [cartOpen, setCartOpen] = (0, import_react.useState)(false);
	const submit = (e) => {
		e.preventDefault();
		navigate({
			to: "/search",
			search: { q: term }
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md dark:bg-zinc-950/80",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "container-ligo flex h-16 items-center gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Logo, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden items-center gap-1 text-sm text-muted-foreground lg:flex",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium text-foreground",
							children: content?.city
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: submit,
						className: "relative hidden flex-1 md:block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: term,
							onChange: (e) => setTerm(e.target.value),
							placeholder: "Search for burgers, milk, pharmacy…",
							className: "h-10 pl-9",
							"aria-label": "Search Ligo"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: "hidden items-center gap-1 lg:flex",
						children: NAV.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: n.to,
							className: "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
							children: n.label
						}, n.to))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeToggle, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartTrigger, { onOpen: () => setCartOpen(true) }),
							user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
								asChild: true,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "outline",
									size: "sm",
									className: "gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "hidden sm:inline",
										children: profile?.full_name?.split(" ")[0] || "Account"
									})]
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
								align: "end",
								className: "w-52",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuLabel, { children: profile?.full_name || user.email }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
										asChild: true,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/account",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "mr-2 h-4 w-4" }), "My account"]
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
										asChild: true,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/orders",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "mr-2 h-4 w-4" }), "My orders"]
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
										asChild: true,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/notifications",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "mr-2 h-4 w-4" }), "Notifications"]
										})
									}),
									isRider && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
										asChild: true,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/rider",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingBag, { className: "mr-2 h-4 w-4" }), "Rider portal"]
										})
									}),
									isMerchant && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
										asChild: true,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/merchant",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "mr-2 h-4 w-4" }), "Merchant portal"]
										})
									}),
									isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
										asChild: true,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/admin",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutDashboard, { className: "mr-2 h-4 w-4" }), "Admin dashboard"]
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
										onClick: () => void signOut(),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "mr-2 h-4 w-4" }), "Sign out"]
									})
								]
							})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									asChild: true,
									variant: "ghost",
									size: "sm",
									className: "hidden sm:inline-flex",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/login",
										children: "Login"
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									asChild: true,
									size: "sm",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/register",
										children: "Sign up"
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "rounded-md p-2 transition-all duration-100 hover:bg-secondary active:scale-95 lg:hidden",
								onClick: () => setOpen((o) => !o),
								"aria-label": "Menu",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "h-5 w-5" })
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "container-ligo pb-3 md:hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: submit,
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: term,
						onChange: (e) => setTerm(e.target.value),
						placeholder: "Search Ligo",
						className: "h-10 pl-9",
						"aria-label": "Search Ligo"
					})]
				})
			}),
			open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "border-t border-border bg-background lg:hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "container-ligo grid gap-1 py-3",
					children: [NAV.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: n.to,
						onClick: () => setOpen(false),
						className: "rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary",
						children: n.label
					}, n.to)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/rider/join",
						onClick: () => setOpen(false),
						className: "rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary",
						children: "Become a rider"
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartDrawer, {
				open: cartOpen,
				onOpenChange: setCartOpen
			})
		]
	});
}
function MobileTabBar() {
	const { count } = useCart();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		className: "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:hidden",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "grid grid-cols-5",
			children: [
				{
					to: "/",
					label: "Home",
					icon: House
				},
				{
					to: "/shops",
					label: "Shops",
					icon: Store
				},
				{
					to: "/cart",
					label: "Cart",
					icon: ShoppingCart,
					badge: count
				},
				{
					to: "/orders",
					label: "Orders",
					icon: Package
				},
				{
					to: "/account",
					label: "Account",
					icon: User
				}
			].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: t.to,
				className: "flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground",
				activeProps: { className: "text-primary" },
				activeOptions: { exact: t.to === "/" },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(t.icon, { className: "h-5 w-5" }), !!t.badge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground",
						children: t.badge
					})]
				}), t.label]
			}) }, t.to))
		})
	});
}
function SiteFooter() {
	const { data: c } = useQuery(siteContentQuery);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
		className: "mt-16 border-t border-border bg-surface",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "container-ligo grid gap-8 py-12 md:grid-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Logo, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: c?.footer_tagline
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-3 font-display text-sm font-bold uppercase tracking-wide",
					children: "Explore"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "space-y-2 text-sm text-muted-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/shops",
							className: "hover:text-foreground",
							children: "Shops"
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/categories",
							className: "hover:text-foreground",
							children: "Categories"
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/offers",
							className: "hover:text-foreground",
							children: "Offers"
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/orders",
							className: "hover:text-foreground",
							children: "Track order"
						}) })
					]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-3 font-display text-sm font-bold uppercase tracking-wide",
					children: "Work with us"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "space-y-2 text-sm text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/rider/join",
						className: "hover:text-foreground",
						children: "Become a rider"
					}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/account",
						className: "hover:text-foreground",
						children: "My account"
					}) })]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mb-3 font-display text-sm font-bold uppercase tracking-wide",
					children: "Contact"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "space-y-2 text-sm text-muted-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-4 w-4 text-primary" }), c?.contact_address]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: `tel:${(c?.contact_phone ?? "").replace(/\s/g, "")}`,
								className: "hover:text-foreground",
								children: c?.contact_phone
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: `mailto:${c?.contact_email ?? ""}`,
								className: "hover:text-foreground",
								children: c?.contact_email
							})]
						})
					]
				})] })
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-1 border-t border-border py-4 text-center text-xs text-muted-foreground",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
				"© ",
				(/* @__PURE__ */ new Date()).getFullYear(),
				" ",
				c?.brand_name,
				". All rights reserved."
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
				"Developed by ",
				c?.developer_name,
				" · ",
				c?.company_name
			] })]
		})]
	});
}
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$27 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Ligo Delivery — Bishoftu food & grocery delivery" },
			{
				name: "description",
				content: "Order food, groceries and essentials from Bishoftu shops with fast local delivery."
			},
			{
				name: "author",
				content: "Ligo Delivery"
			},
			{
				property: "og:title",
				content: "Ligo Delivery — Bishoftu"
			},
			{
				property: "og:description",
				content: "Fast local delivery across Bishoftu."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:site",
				content: "@Lovable"
			}
		],
		links: [{
			rel: "stylesheet",
			href: styles_default
		}, {
			rel: "icon",
			href: "/favicon.ico",
			type: "image/x-icon"
		}],
		scripts: [{ children: `(function(){try{var t=localStorage.getItem("ligo-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.classList.toggle("dark",t==="dark");}catch(e){}})();` }]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$27.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CartProvider, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-h-screen flex-col pb-16 md:pb-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: "flex-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobileTabBar, {})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, {
			position: "top-center",
			richColors: true
		})] }) }) })
	});
}
var $$splitComponentImporter$26 = () => import("./routes-CZdF9muP.mjs");
var Route$26 = createFileRoute("/")({
	head: () => ({ meta: [
		{ title: "Ligo Delivery — Food & grocery delivery in Bishoftu" },
		{
			name: "description",
			content: "Order food, groceries, pharmacy items and more from Bishoftu shops. Fast local delivery, live tracking and Telebirr, CBE or cash payment."
		},
		{
			property: "og:title",
			content: "Ligo Delivery — Bishoftu food & grocery delivery"
		},
		{
			property: "og:description",
			content: "Fast local delivery across Bishoftu with live order tracking."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$26, "component")
});
var $$splitComponentImporter$25 = () => import("./account-DAR6wCrd.mjs");
var Route$25 = createFileRoute("/account")({
	head: () => ({ meta: [
		{ title: "My account — Ligo Delivery" },
		{
			name: "description",
			content: "Manage your Ligo profile, phone number and delivery details."
		},
		{
			property: "og:title",
			content: "My account — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Manage your Ligo Delivery profile."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$25, "component")
});
var $$splitComponentImporter$24 = () => import("./admin-XYa_wfb9.mjs");
var Route$24 = createFileRoute("/admin")({
	head: () => ({ meta: [
		{ title: "Admin — LIGO Delivery" },
		{
			name: "description",
			content: "Operations control center for LIGO Delivery."
		},
		{
			property: "og:title",
			content: "Admin — LIGO Delivery"
		},
		{
			property: "og:description",
			content: "Operations control center for LIGO Delivery."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$24, "component")
});
var $$splitComponentImporter$23 = () => import("./auth-TiIx8AsQ.mjs");
var Route$23 = createFileRoute("/auth")({
	validateSearch: (s) => ({
		mode: s["mode"] === "register" ? "register" : "login",
		role: ["customer", "rider"].includes(String(s["role"])) ? s["role"] : "customer"
	}),
	component: lazyRouteComponent($$splitComponentImporter$23, "component")
});
var $$splitComponentImporter$22 = () => import("./cart-B-GTRFdN.mjs");
var Route$22 = createFileRoute("/cart")({
	head: () => ({ meta: [
		{ title: "Your cart — Ligo Delivery" },
		{
			name: "description",
			content: "Review the items in your Ligo delivery cart before checkout."
		},
		{
			property: "og:title",
			content: "Your cart — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Review your Ligo order before checkout."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$22, "component")
});
var $$splitComponentImporter$21 = () => import("./categories-CTfTCfkQ.mjs");
var Route$21 = createFileRoute("/categories")({
	head: () => ({ meta: [
		{ title: "Browse categories — Ligo Delivery Bishoftu" },
		{
			name: "description",
			content: "Restaurants, groceries, pharmacy, bakery and more — browse every Ligo delivery category in Bishoftu."
		},
		{
			property: "og:title",
			content: "Browse categories — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Every Ligo delivery category in Bishoftu."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$21, "component")
});
var $$splitComponentImporter$20 = () => import("./checkout-D3o342OD.mjs");
var Route$20 = createFileRoute("/checkout")({
	head: () => ({ meta: [
		{ title: "Checkout — Ligo Delivery Bishoftu" },
		{
			name: "description",
			content: "Confirm your delivery address and payment method to place your Ligo order."
		},
		{
			property: "og:title",
			content: "Checkout — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Place your Ligo Delivery order in Bishoftu."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$20, "component")
});
var $$splitComponentImporter$19 = () => import("./login-Db3Vo_9Y.mjs");
var Route$19 = createFileRoute("/login")({
	validateSearch: (s) => {
		const out = {};
		if (typeof s["redirect"] === "string") out.redirect = s["redirect"];
		return out;
	},
	head: () => ({ meta: [
		{ title: "Sign in — Ligo Delivery" },
		{
			name: "description",
			content: "Sign in to your Ligo Delivery customer account to order in Bishoftu."
		},
		{
			property: "og:title",
			content: "Sign in — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Access your Ligo Delivery customer account."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$19, "component")
});
var $$splitComponentImporter$18 = () => import("./merchant-ULFqqVgF.mjs");
var Route$18 = createFileRoute("/merchant")({
	head: () => ({ meta: [
		{ title: "Merchant portal — Ligo Delivery" },
		{
			name: "description",
			content: "Manage your shop's orders, catalog, hours and availability on Ligo."
		},
		{
			property: "og:title",
			content: "Merchant portal — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Run your Ligo store."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$18, "component")
});
var $$splitComponentImporter$17 = () => import("./notifications-BOuVfMpi.mjs");
var Route$17 = createFileRoute("/notifications")({
	head: () => ({ meta: [
		{ title: "Notifications — Ligo Delivery" },
		{
			name: "description",
			content: "Order updates, delivery alerts and payment confirmations from Ligo."
		},
		{
			property: "og:title",
			content: "Notifications — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Your Ligo order and delivery updates."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$17, "component")
});
var $$splitComponentImporter$16 = () => import("./offers-CVLVhz21.mjs");
var Route$16 = createFileRoute("/offers")({
	head: () => ({ meta: [
		{ title: "Offers & discounts — Ligo Delivery Bishoftu" },
		{
			name: "description",
			content: "Live discounts and promotions from Bishoftu restaurants and shops on Ligo Delivery."
		},
		{
			property: "og:title",
			content: "Offers & discounts — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Live promotions from Bishoftu shops."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$16, "component")
});
var $$splitComponentImporter$15 = () => import("./register-DLYteZDK.mjs");
/** Friendly messages for the common Supabase OTP failure modes. */
var Route$15 = createFileRoute("/register")({
	validateSearch: (s) => {
		const out = {};
		if (["customer", "rider"].includes(String(s["role"]))) out.role = s["role"];
		return out;
	},
	head: () => ({ meta: [
		{ title: "Create your account — Ligo Delivery" },
		{
			name: "description",
			content: "Join Ligo as a customer or rider in Bishoftu."
		},
		{
			property: "og:title",
			content: "Create your account — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Join Ligo as a customer or rider."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$15, "component")
});
var $$splitComponentImporter$14 = () => import("./search-BOvNEhbj.mjs");
var Route$14 = createFileRoute("/search")({
	validateSearch: (s) => ({ q: typeof s["q"] === "string" ? s["q"] : "" }),
	head: () => ({ meta: [
		{ title: "Search — Ligo Delivery Bishoftu" },
		{
			name: "description",
			content: "Search shops and products available for delivery in Bishoftu."
		},
		{
			property: "og:title",
			content: "Search — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Find shops and products in Bishoftu."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$14, "component")
});
var RANGES = [
	{
		key: "today",
		label: "Today",
		days: 1,
		prevLabel: "vs yesterday"
	},
	{
		key: "7d",
		label: "Last 7 days",
		days: 7,
		prevLabel: "vs prior 7 days"
	},
	{
		key: "30d",
		label: "Last 30 days",
		days: 30,
		prevLabel: "vs prior 30 days"
	}
];
var $$splitComponentImporter$13 = () => import("./admin.index-Bz2MTaiq.mjs");
var Route$13 = createFileRoute("/admin/")({
	validateSearch: (s) => {
		const out = {};
		if (RANGES.some((r) => r.key === s["range"])) out.range = s["range"];
		return out;
	},
	head: () => ({ meta: [
		{ title: "Dashboard — Ligo Admin" },
		{
			name: "description",
			content: "LIGO operations dashboard: revenue, orders, riders and merchants."
		},
		{
			property: "og:title",
			content: "Dashboard — Ligo Admin"
		},
		{
			property: "og:description",
			content: "LIGO operations dashboard."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$13, "component")
});
var $$splitComponentImporter$12 = () => import("./admin.financials-DF4qQ4x1.mjs");
var Route$12 = createFileRoute("/admin/financials")({
	head: () => ({ meta: [
		{ title: "Financials & Earnings — Ligo Admin" },
		{
			name: "description",
			content: "LIGO revenue ledger, commissions and payout management."
		},
		{
			property: "og:title",
			content: "Financials & Earnings — Ligo Admin"
		},
		{
			property: "og:description",
			content: "LIGO financial ledger."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
var $$splitComponentImporter$11 = () => import("./admin.login-Ok94TWYA.mjs");
var Route$11 = createFileRoute("/admin/login")({
	head: () => ({ meta: [
		{ title: "Admin sign-in — Ligo Delivery" },
		{
			name: "description",
			content: "Restricted administrative access."
		},
		{
			name: "robots",
			content: "noindex, nofollow"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
var $$splitComponentImporter$10 = () => import("./admin.map-Dq0tSD4n.mjs");
var Route$10 = createFileRoute("/admin/map")({
	head: () => ({ meta: [
		{ title: "Live Delivery Map — Ligo Admin" },
		{
			name: "description",
			content: "Real-time rider, merchant and delivery tracking for LIGO dispatch."
		},
		{
			property: "og:title",
			content: "Live Delivery Map — Ligo Admin"
		},
		{
			property: "og:description",
			content: "Real-time dispatch tracking."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("./admin.ops-voFZXlcD.mjs");
var OPS_TABS = [
	"orders",
	"payments",
	"payouts",
	"shops",
	"customers",
	"products",
	"categories",
	"offers",
	"banners",
	"content",
	"financials",
	"settings",
	"system"
];
var Route$9 = createFileRoute("/admin/ops")({
	validateSearch: (s) => {
		const out = {};
		if (OPS_TABS.includes(s["tab"])) out.tab = s["tab"];
		return out;
	},
	head: () => ({ meta: [
		{ title: "Operations — Ligo Admin" },
		{
			name: "description",
			content: "Manage Ligo orders, payments, riders, shops, products and offers."
		},
		{
			property: "og:title",
			content: "Operations — Ligo Admin"
		},
		{
			property: "og:description",
			content: "Operations console for Ligo Delivery."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
function Card({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-card p-4 shadow-card",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs uppercase tracking-wide text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 font-display text-2xl font-extrabold",
			children: value
		})]
	});
}
function FinancialsPanel() {
	const { data } = useQuery({
		queryKey: ["admin-financials"],
		queryFn: async () => {
			const [{ data: orders }, { data: payouts }, { data: platformRow }] = await Promise.all([
				supabase.from("orders").select("status,total,delivery_fee,payment_status,payment_method"),
				supabase.from("payout_requests").select("amount,status"),
				supabase.from("settings").select("value").eq("key", "platform").maybeSingle()
			]);
			const commissionPct = Number((platformRow?.value)?.commission_percent ?? 15);
			const delivered = (orders ?? []).filter((o) => o.status === "delivered");
			const gross = delivered.reduce((s, o) => s + Number(o.total), 0);
			const deliveryFees = delivered.reduce((s, o) => s + Number(o.delivery_fee), 0);
			const commission = (gross - deliveryFees) * (commissionPct / 100);
			return {
				gross,
				deliveryFees,
				commission,
				merchantPayouts: gross - deliveryFees - commission,
				paidOut: (payouts ?? []).filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0),
				requested: (payouts ?? []).filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0),
				byMethod: Object.entries((orders ?? []).reduce((acc, o) => {
					acc[o.payment_method] = (acc[o.payment_method] ?? 0) + Number(o.total);
					return acc;
				}, {}))
			};
		}
	});
	if (!data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-6 text-sm text-muted-foreground",
		children: "Loading…"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					label: "Platform gross revenue",
					value: ETB(data.gross)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					label: "Platform commission",
					value: ETB(data.commission)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					label: "Delivery fees",
					value: ETB(data.deliveryFees)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					label: "Merchant payouts value",
					value: ETB(data.merchantPayouts)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					label: "Rider cashouts paid",
					value: ETB(data.paidOut)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					label: "Cashout requests pending",
					value: ETB(data.requested)
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-xl border border-border bg-card p-5 shadow-card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-display font-bold",
				children: "Volume by payment gateway"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 space-y-1.5 text-sm",
				children: data.byMethod.map(([method, total]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex justify-between border-b border-border pb-1.5 last:border-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "uppercase text-muted-foreground",
						children: method
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold",
						children: ETB(total)
					})]
				}, method))
			})]
		})]
	});
}
/**
* Dispatch via the approve_and_dispatch RPC; if the function is missing from
* the live project (404/PGRST202), fall back to a direct status update so
* admin dispatch never blocks.
*/
function PayoutsAdmin() {
	const qc = useQueryClient();
	const { data: payouts = [] } = useQuery({
		queryKey: ["admin-payouts"],
		queryFn: async () => {
			const { data } = await supabase.from("payout_requests").select("*").order("created_at", { ascending: false });
			const ids = [...new Set((data ?? []).map((p) => p.rider_id))];
			const [{ data: profiles }, { data: riderRows }] = ids.length ? await Promise.all([supabase.from("profiles").select("id,full_name,phone,avatar_url").in("id", ids), supabase.from("riders").select("id,payout_method,payout_account,payout_account_name").in("id", ids)]) : [{ data: [] }, { data: [] }];
			return (data ?? []).map((p) => {
				const riderRow = (riderRows ?? []).find((x) => x.id === p.rider_id);
				const riderProfile = profiles?.find((x) => x.id === p.rider_id);
				return {
					...p,
					riderName: riderProfile?.full_name || "Rider",
					riderPhone: riderProfile?.phone ?? "",
					riderAvatar: riderProfile?.avatar_url ?? null,
					payoutDetails: riderRow ? `${riderRow.payout_method === "telebirr" ? "Telebirr" : "Bank"}: ${riderRow.payout_account ?? "—"} (${riderRow.payout_account_name ?? "—"})` : ""
				};
			});
		}
	});
	(0, import_react.useEffect)(() => {
		const channel = supabase.channel("admin-payouts-rt").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "payout_requests"
		}, () => {
			qc.invalidateQueries({ queryKey: ["admin-payouts"] });
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [qc]);
	const process = async (id, riderId, amount, status) => {
		const { error } = await supabase.from("payout_requests").update({
			status,
			processed_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("id", id).eq("status", "pending");
		if (error) {
			toast.error(error.message);
			return;
		}
		if (status === "paid") await supabase.from("rider_earnings").update({ status: "paid" }).eq("payout_request_id", id);
		else await supabase.from("rider_earnings").update({
			status: "pending",
			payout_request_id: null
		}).eq("payout_request_id", id);
		await notify(riderId, status === "paid" ? "Payout sent" : "Payout rejected", status === "paid" ? `${ETB(amount)} has been paid out to you.` : "Your payout request was rejected. Contact the Ligo team.", "payout");
		qc.invalidateQueries({ queryKey: ["admin-payouts"] });
		toast.success(`Payout ${status}`);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 space-y-3",
		children: [payouts.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted-foreground",
			children: "No payout requests yet."
		}), payouts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IdentityAvatar, {
					path: p.riderAvatar,
					name: p.riderName,
					className: "h-9 w-9 text-xs"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-semibold",
					children: [
						p.riderName,
						" · ",
						ETB(p.amount)
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-muted-foreground",
					children: [
						formatDate(p.created_at),
						" · ",
						p.riderPhone,
						p.payoutDetails ? ` · ${p.payoutDetails}` : "",
						p.note ? ` · ${p.note}` : ""
					]
				})] })]
			}), p.status === "pending" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					onClick: () => void process(p.id, p.rider_id, Number(p.amount), "paid"),
					children: "Mark paid"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "outline",
					onClick: () => void process(p.id, p.rider_id, Number(p.amount), "rejected"),
					children: "Reject"
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `rounded-full px-2 py-1 text-xs font-semibold ${p.status === "paid" ? "bg-primary-soft text-accent-foreground" : "bg-destructive/10 text-destructive"}`,
				children: p.status
			})]
		}, p.id))]
	});
}
var $$splitComponentImporter$8 = () => import("./admin.riders-BPfJfCpQ.mjs");
var Route$8 = createFileRoute("/admin/riders")({
	head: () => ({ meta: [
		{ title: "Rider approvals — Ligo Delivery" },
		{
			name: "description",
			content: "Review rider applications, verify documents and approve riders."
		},
		{
			property: "og:title",
			content: "Rider approvals — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Rider verification queue for Ligo admins."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./merchant.login-KZykWWx7.mjs");
var Route$7 = createFileRoute("/merchant/login")({
	head: () => ({ meta: [
		{ title: "Store Partner sign-in — Ligo Delivery" },
		{
			name: "description",
			content: "Sign in to your Ligo Store Partner portal."
		},
		{
			property: "og:title",
			content: "Store Partner sign-in — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Manage your Ligo store, orders and menu."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
var $$splitComponentImporter$6 = () => import("./orders.index-BFHq_uCh.mjs");
var Route$6 = createFileRoute("/orders/")({
	head: () => ({ meta: [
		{ title: "My orders — Ligo Delivery" },
		{
			name: "description",
			content: "Track your current and past Ligo deliveries in Bishoftu."
		},
		{
			property: "og:title",
			content: "My orders — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Track your Ligo deliveries."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./orders._orderId-NH9_-7uH.mjs");
var Route$5 = createFileRoute("/orders/$orderId")({
	head: () => ({ meta: [
		{ title: "Order tracking — Ligo Delivery" },
		{
			name: "description",
			content: "Live tracking, delivery timeline and payment status for your Ligo order."
		},
		{
			property: "og:title",
			content: "Order tracking — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Track your Ligo order in real time."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./rider.index-B344n6Zb.mjs");
var Route$4 = createFileRoute("/rider/")({
	head: () => ({ meta: [
		{ title: "Rider — LIGO Delivery" },
		{
			name: "description",
			content: "LIGO rider operations: dispatch, deliveries and earnings."
		},
		{
			property: "og:title",
			content: "Rider — LIGO Delivery"
		},
		{
			property: "og:description",
			content: "LIGO rider operations."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./rider.join-CE0-P-fz.mjs");
var Route$3 = createFileRoute("/rider/join")({
	head: () => ({ meta: [
		{ title: "Become a Ligo rider in Bishoftu" },
		{
			name: "description",
			content: "Earn with Ligo — deliver food and groceries around Bishoftu on your own schedule."
		},
		{
			property: "og:title",
			content: "Become a Ligo rider"
		},
		{
			property: "og:description",
			content: "Deliver with Ligo in Bishoftu and earn on your schedule."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./rider.login-C309iM8G.mjs");
var Route$2 = createFileRoute("/rider/login")({
	head: () => ({ meta: [
		{ title: "Driver sign-in — Ligo Delivery" },
		{
			name: "description",
			content: "Sign in to your Ligo Driver portal to go online."
		},
		{
			property: "og:title",
			content: "Driver sign-in — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Go online and deliver with Ligo."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./shops.index-DIuMZsON.mjs");
var Route$1 = createFileRoute("/shops/")({
	validateSearch: (s) => typeof s["category"] === "string" ? { category: s["category"] } : {},
	head: () => ({ meta: [
		{ title: "Shops in Bishoftu — Ligo Delivery" },
		{
			name: "description",
			content: "Order from restaurants, supermarkets, bakeries and pharmacies across Bishoftu with Ligo delivery."
		},
		{
			property: "og:title",
			content: "Shops in Bishoftu — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Browse local shops delivering across Bishoftu."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./shops._shopId-HraJW26I.mjs");
var Route = createFileRoute("/shops/$shopId")({
	head: () => ({ meta: [
		{ title: "Shop menu — Ligo Delivery Bishoftu" },
		{
			name: "description",
			content: "Browse the menu and order delivery from this Bishoftu shop on Ligo."
		},
		{
			property: "og:title",
			content: "Shop menu — Ligo Delivery"
		},
		{
			property: "og:description",
			content: "Order delivery from this Bishoftu shop."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var IndexRoute = Route$26.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$27
});
var AccountRoute = Route$25.update({
	id: "/account",
	path: "/account",
	getParentRoute: () => Route$27
});
var AdminRoute = Route$24.update({
	id: "/admin",
	path: "/admin",
	getParentRoute: () => Route$27
});
var AuthRoute = Route$23.update({
	id: "/auth",
	path: "/auth",
	getParentRoute: () => Route$27
});
var CartRoute = Route$22.update({
	id: "/cart",
	path: "/cart",
	getParentRoute: () => Route$27
});
var CategoriesRoute = Route$21.update({
	id: "/categories",
	path: "/categories",
	getParentRoute: () => Route$27
});
var CheckoutRoute = Route$20.update({
	id: "/checkout",
	path: "/checkout",
	getParentRoute: () => Route$27
});
var LoginRoute = Route$19.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => Route$27
});
var MerchantRoute = Route$18.update({
	id: "/merchant",
	path: "/merchant",
	getParentRoute: () => Route$27
});
var NotificationsRoute = Route$17.update({
	id: "/notifications",
	path: "/notifications",
	getParentRoute: () => Route$27
});
var OffersRoute = Route$16.update({
	id: "/offers",
	path: "/offers",
	getParentRoute: () => Route$27
});
var RegisterRoute = Route$15.update({
	id: "/register",
	path: "/register",
	getParentRoute: () => Route$27
});
var SearchRoute = Route$14.update({
	id: "/search",
	path: "/search",
	getParentRoute: () => Route$27
});
var AdminIndexRoute = Route$13.update({
	id: "/",
	path: "/",
	getParentRoute: () => AdminRoute
});
var AdminFinancialsRoute = Route$12.update({
	id: "/financials",
	path: "/financials",
	getParentRoute: () => AdminRoute
});
var AdminLoginRoute = Route$11.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => AdminRoute
});
var AdminMapRoute = Route$10.update({
	id: "/map",
	path: "/map",
	getParentRoute: () => AdminRoute
});
var AdminOpsRoute = Route$9.update({
	id: "/ops",
	path: "/ops",
	getParentRoute: () => AdminRoute
});
var AdminRidersRoute = Route$8.update({
	id: "/riders",
	path: "/riders",
	getParentRoute: () => AdminRoute
});
var MerchantLoginRoute = Route$7.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => MerchantRoute
});
var OrdersIndexRoute = Route$6.update({
	id: "/orders/",
	path: "/orders/",
	getParentRoute: () => Route$27
});
var OrdersOrderIdRoute = Route$5.update({
	id: "/orders/$orderId",
	path: "/orders/$orderId",
	getParentRoute: () => Route$27
});
var RiderIndexRoute = Route$4.update({
	id: "/rider/",
	path: "/rider/",
	getParentRoute: () => Route$27
});
var RiderJoinRoute = Route$3.update({
	id: "/rider/join",
	path: "/rider/join",
	getParentRoute: () => Route$27
});
var RiderLoginRoute = Route$2.update({
	id: "/rider/login",
	path: "/rider/login",
	getParentRoute: () => Route$27
});
var ShopsIndexRoute = Route$1.update({
	id: "/shops/",
	path: "/shops/",
	getParentRoute: () => Route$27
});
var ShopsShopIdRoute = Route.update({
	id: "/shops/$shopId",
	path: "/shops/$shopId",
	getParentRoute: () => Route$27
});
var AdminRouteChildren = {
	AdminFinancialsRoute,
	AdminLoginRoute,
	AdminMapRoute,
	AdminOpsRoute,
	AdminRidersRoute,
	AdminIndexRoute
};
var AdminRouteWithChildren = AdminRoute._addFileChildren(AdminRouteChildren);
var MerchantRouteChildren = { MerchantLoginRoute };
var rootRouteChildren = {
	IndexRoute,
	AccountRoute,
	AdminRoute: AdminRouteWithChildren,
	AuthRoute,
	CartRoute,
	CategoriesRoute,
	CheckoutRoute,
	LoginRoute,
	MerchantRoute: MerchantRoute._addFileChildren(MerchantRouteChildren),
	NotificationsRoute,
	OffersRoute,
	RegisterRoute,
	SearchRoute,
	OrdersOrderIdRoute,
	RiderJoinRoute,
	RiderLoginRoute,
	ShopsShopIdRoute,
	OrdersIndexRoute,
	RiderIndexRoute,
	ShopsIndexRoute
};
var routeTree = Route$27._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { siteContentQuery as A, SheetContent as C, bannersQuery as D, SheetTitle as E, useCart as M, getRouter as O, Sheet as S, SheetHeader as T, Route$14 as _, DropdownMenuContent as a, Route$5 as b, DropdownMenuSeparator as c, Input as d, PayoutsAdmin as f, Route$13 as g, Route$1 as h, DropdownMenu as i, useAuth as j, router_exports as k, DropdownMenuTrigger as l, Route as m, CONTENT_FIELDS as n, DropdownMenuItem as o, RANGES as p, DEFAULT_CONTENT as r, DropdownMenuLabel as s, BANNER_PLACEMENTS as t, FinancialsPanel as u, Route$15 as v, SheetDescription as w, Route$9 as x, Route$23 as y };
