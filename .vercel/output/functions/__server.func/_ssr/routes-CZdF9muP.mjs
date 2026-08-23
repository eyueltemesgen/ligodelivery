import { i as __toESM } from "../_runtime.mjs";
import { r as supabase } from "./client-D2C38fHY.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { g as Link, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { E as PackageCheck, H as Clock, Y as ChevronRight, _ as ShieldCheck, b as Search, tt as Bike } from "../_libs/lucide-react.mjs";
import { _ as Button, c as timelineIndex, i as STATUS_LABEL, m as StorageImage } from "./router-D937WmAP.mjs";
import { A as siteContentQuery, D as bannersQuery, j as useAuth } from "./router-D937WmAP2.mjs";
import { l as shopsQuery, n as featuredProductsQuery, r as offersQuery, t as categoriesQuery } from "./queries-DB3Dy3Ev.mjs";
import { t as BannerSlot } from "./BannerSlot-CZu2cYv7.mjs";
import { n as ProductGridSkeleton, r as ShopGridSkeleton, t as CategoryCardSkeleton } from "./Skeletons-D2wOZi3v.mjs";
import { n as ShopCard, t as ProductCard } from "./Cards-DDWOxbbu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CZdF9muP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var hero_rider_default = "/assets/hero-rider-Nh776J1_.jpg";
/**
* Built-in mock data used as a graceful fallback when Supabase tables are
* missing, empty, or slow. Every consumer treats these as safe defaults so the
* storefront never throws on a network or schema issue.
*/
var FALLBACK_CATEGORIES = [
	{
		id: "cat-food",
		name: "Food & Restaurants",
		slug: "food",
		image_url: null,
		sort_order: 1
	},
	{
		id: "cat-grocery",
		name: "Groceries",
		slug: "groceries",
		image_url: null,
		sort_order: 2
	},
	{
		id: "cat-pharmacy",
		name: "Pharmacy",
		slug: "pharmacy",
		image_url: null,
		sort_order: 3
	},
	{
		id: "cat-drinks",
		name: "Drinks",
		slug: "drinks",
		image_url: null,
		sort_order: 4
	},
	{
		id: "cat-bakery",
		name: "Bakery",
		slug: "bakery",
		image_url: null,
		sort_order: 5
	},
	{
		id: "cat-essentials",
		name: "Essentials",
		slug: "essentials",
		image_url: null,
		sort_order: 6
	}
];
var FALLBACK_SHOPS = [
	{
		id: "shop-1",
		name: "Ligo Burger House",
		description: "Smash burgers, fries and shakes",
		category_id: "cat-food",
		phone: "+251911000001",
		address: "Kebele 03, Bishoftu",
		image_url: null,
		cover_url: null,
		opens_at: "08:00",
		closes_at: "22:00",
		delivery_fee: 40,
		delivery_time_min: 18,
		rating: 4.8,
		is_featured: true,
		is_online: true,
		owner_id: null
	},
	{
		id: "shop-2",
		name: "Green Grocer Bishoftu",
		description: "Fresh fruit, vegetables and staples",
		category_id: "cat-grocery",
		phone: "+251911000002",
		address: "Kebele 01, Bishoftu",
		image_url: null,
		cover_url: null,
		opens_at: "07:00",
		closes_at: "21:00",
		delivery_fee: 30,
		delivery_time_min: 22,
		rating: 4.6,
		is_featured: true,
		is_online: true,
		owner_id: null
	},
	{
		id: "shop-3",
		name: "City Pharmacy",
		description: "Medicine, wellness and personal care",
		category_id: "cat-pharmacy",
		phone: "+251911000003",
		address: "Kebele 05, Bishoftu",
		image_url: null,
		cover_url: null,
		opens_at: "08:30",
		closes_at: "20:00",
		delivery_fee: 50,
		delivery_time_min: 15,
		rating: 4.9,
		is_featured: false,
		is_online: true,
		owner_id: null
	}
];
var FALLBACK_PRODUCTS = [
	{
		id: "prod-1",
		shop_id: "shop-1",
		category_id: "cat-food",
		name: "Classic Smash Burger",
		description: "Beef patty, cheese, house sauce",
		price: 220,
		discount_percent: 0,
		image_url: null,
		in_stock: true,
		is_featured: true,
		is_popular: true
	},
	{
		id: "prod-2",
		shop_id: "shop-1",
		category_id: "cat-food",
		name: "Crispy Fries",
		description: "Golden fries with sea salt",
		price: 90,
		discount_percent: 0,
		image_url: null,
		in_stock: true,
		is_featured: false,
		is_popular: true
	},
	{
		id: "prod-3",
		shop_id: "shop-2",
		category_id: "cat-grocery",
		name: "Fresh Avocado (1kg)",
		description: "Locally sourced, ripe today",
		price: 180,
		discount_percent: 10,
		image_url: null,
		in_stock: true,
		is_featured: true,
		is_popular: true
	}
];
/** Run a Supabase query, falling back to mock data on any error or empty result. */
async function withFallback(run, fallback) {
	try {
		const data = await run();
		return Array.isArray(data) && data.length > 0 ? data : fallback;
	} catch (err) {
		console.warn("[fallback] query failed, using built-in mock data", err);
		return fallback;
	}
}
var ACTIVE_STEPS = [
	{
		key: "pending_payment",
		label: "Placed"
	},
	{
		key: "preparing",
		label: "Preparing"
	},
	{
		key: "picked_up",
		label: "On the way"
	},
	{
		key: "delivered",
		label: "Delivered"
	}
];
/** Home-page banner tracking the customer's most recent in-flight order. */
function ActiveOrderBanner() {
	const { user } = useAuth();
	const qc = useQueryClient();
	const { data: order } = useQuery({
		queryKey: ["active-order-banner", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const { data } = await supabase.from("orders").select("id,order_code,status,total").eq("customer_id", user.id).not("status", "in", "(\"delivered\",\"cancelled\")").order("created_at", { ascending: false }).limit(1).maybeSingle();
			return data;
		}
	});
	(0, import_react.useEffect)(() => {
		if (!user) return;
		const channel = supabase.channel(`active-order-banner-${user.id}`).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "orders",
			filter: `customer_id=eq.${user.id}`
		}, () => {
			qc.invalidateQueries({ queryKey: ["active-order-banner"] });
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [user, qc]);
	if (!order) return null;
	const idx = Math.min(timelineIndex(order.status) >= 7 ? 2 : timelineIndex(order.status) >= 2 ? 1 : 0, 2);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to: "/orders/$orderId",
		params: { orderId: order.id },
		className: "block rounded-2xl border border-primary/30 bg-primary-soft p-4 shadow-card transition-shadow hover:shadow-pop",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackageCheck, { className: "h-5 w-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm font-bold text-accent-foreground",
					children: [
						"Order ",
						order.order_code,
						" is",
						" ",
						STATUS_LABEL[order.status] ?? order.status
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-accent-foreground/80",
					children: "Tap to track your delivery live"
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-5 w-5 shrink-0 text-accent-foreground" })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "mt-3 flex items-center gap-1.5",
			children: ACTIVE_STEPS.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex flex-1 flex-col gap-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `h-1.5 rounded-full ${i <= idx ? "bg-primary" : "bg-primary/20"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `text-[10px] font-medium ${i <= idx ? "text-accent-foreground" : "text-accent-foreground/60"}`,
					children: s.label
				})]
			}, s.key))
		})]
	});
}
function Home() {
	const navigate = useNavigate();
	const [quickCategory, setQuickCategory] = (0, import_react.useState)(null);
	const { data: categories = [], isLoading: categoriesLoading } = useQuery({
		...categoriesQuery,
		queryFn: () => withFallback(() => categoriesQuery.queryFn(), FALLBACK_CATEGORIES)
	});
	const { data: shops = [], isLoading: shopsLoading } = useQuery({
		...shopsQuery(),
		queryFn: () => withFallback(() => shopsQuery().queryFn(), FALLBACK_SHOPS)
	});
	const { data: popular = [], isLoading: popularLoading } = useQuery({
		...featuredProductsQuery,
		queryFn: () => withFallback(() => featuredProductsQuery.queryFn(), FALLBACK_PRODUCTS)
	});
	const { data: offers = [] } = useQuery(offersQuery);
	const { data: c } = useQuery(siteContentQuery);
	const { data: heroBanners = [] } = useQuery(bannersQuery("home_hero"));
	const heroBanner = heroBanners[0];
	const featuredShops = (quickCategory ? shops.filter((s) => s.category_id === quickCategory) : shops).slice(0, 6);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "container-ligo pt-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActiveOrderBanner, {})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BannerSlot, { placement: "home_top" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "border-b border-border bg-surface",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "container-ligo grid items-center gap-8 py-12 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-accent-foreground",
						children: c?.hero_badge
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-4 font-display text-4xl font-extrabold leading-tight md:text-5xl",
						children: c?.hero_title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 max-w-lg text-muted-foreground",
						children: c?.hero_subtitle
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 flex flex-wrap gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							size: "lg",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/shops",
								children: c?.hero_primary_cta
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							size: "lg",
							variant: "outline",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/rider/join",
								children: c?.hero_secondary_cta
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-8 grid gap-4 sm:grid-cols-3",
						children: [
							{
								icon: Clock,
								t: "30 min average"
							},
							{
								icon: Bike,
								t: "Local riders"
							},
							{
								icon: ShieldCheck,
								t: "Verified payments"
							}
						].map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 text-sm font-medium",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(f.icon, { className: "h-4 w-4 text-primary" }), f.t]
						}, f.t))
					})
				] }), heroBanner?.image_url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
					path: heroBanner.image_url,
					alt: heroBanner.title || "Ligo hero banner",
					priority: true,
					className: "h-72 w-full rounded-2xl object-cover shadow-pop lg:h-96"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: hero_rider_default,
					alt: "Ligo rider delivering an order in Bishoftu",
					loading: "eager",
					fetchPriority: "high",
					decoding: "async",
					width: 800,
					height: 600,
					className: "h-72 w-full rounded-2xl object-cover shadow-pop lg:h-96"
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "container-ligo py-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-end justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl font-bold",
						children: c?.categories_title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/categories",
						className: "text-sm font-medium text-primary",
						children: "See all"
					})]
				}),
				categoriesLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6",
					children: Array.from({ length: 6 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CategoryCardSkeleton, {}, i))
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6",
					children: categories.slice(0, 12).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/shops",
						search: { category: c.id },
						className: "overflow-hidden rounded-xl border border-border bg-card text-center shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
							path: c.image_url,
							alt: c.name,
							className: "h-20 w-full object-cover"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "p-2 text-xs font-semibold",
							children: c.name
						})]
					}, c.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap gap-2",
					role: "group",
					"aria-label": "Quick category filter",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setQuickCategory(null),
							className: `rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${!quickCategory ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`,
							children: "All"
						}),
						categories.slice(0, 8).map((cat) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setQuickCategory((cur) => cur === cat.id ? null : cat.id),
							className: `rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${quickCategory === cat.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`,
							children: cat.name
						}, cat.id)),
						quickCategory && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => void navigate({
								to: "/shops",
								search: { category: quickCategory }
							}),
							className: "rounded-full border border-primary/40 bg-primary-soft px-3.5 py-1.5 text-sm font-semibold text-accent-foreground",
							children: [
								"View all in ",
								categories.find((x) => x.id === quickCategory)?.name ?? "category",
								" →"
							]
						})
					]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BannerSlot, { placement: "home_middle" }),
		offers.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "container-ligo py-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-end justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl font-bold",
					children: c?.offers_title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/offers",
					className: "text-sm font-medium text-primary",
					children: "See all"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
				children: offers.slice(0, 3).map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
						path: o.image_url,
						alt: o.title,
						className: "h-28 w-full object-cover"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display font-bold",
							children: o.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: o.description
						})]
					})]
				}, o.id))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "container-ligo py-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-end justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl font-bold",
						children: c?.shops_title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/shops",
						className: "text-sm font-medium text-primary",
						children: "See all"
					})]
				}),
				shopsLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShopGridSkeleton, {})
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
					children: featuredShops.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShopCard, { shop: s }, s.id))
				}),
				!shopsLoading && featuredShops.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-5 text-sm text-muted-foreground",
					children: "No shops in this category yet — try another one."
				})
			]
		}),
		popularLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "container-ligo pb-12",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl font-bold",
				children: c?.trending_title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductGridSkeleton, { count: 4 })
			})]
		}) : popular.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "container-ligo pb-12",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl font-bold",
				children: c?.trending_title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
				children: popular.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductCard, { product: p }, p.id))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BannerSlot, { placement: "home_bottom" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "container-ligo pb-16",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl bg-primary p-8 text-primary-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl font-bold",
					children: c?.how_title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 grid gap-6 sm:grid-cols-3",
					children: [
						{
							icon: Search,
							t: c?.how_step1_title,
							d: c?.how_step1_text
						},
						{
							icon: ShieldCheck,
							t: c?.how_step2_title,
							d: c?.how_step2_text
						},
						{
							icon: Bike,
							t: c?.how_step3_title,
							d: c?.how_step3_text
						}
					].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(s.icon, { className: "h-6 w-6" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 font-display font-bold",
							children: s.t
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm opacity-90",
							children: s.d
						})
					] }, s.t))
				})]
			})
		})
	] });
}
//#endregion
export { Home as component };
