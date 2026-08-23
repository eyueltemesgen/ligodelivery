import { i as __toESM } from "../_runtime.mjs";
import { r as supabase } from "./client-D2C38fHY.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as Button, d as formatDate, h as uploadImage, i as STATUS_LABEL, l as ETB, m as StorageImage, n as IdentityAvatar, o as notify, p as PROOF_BUCKET, r as ORDER_STATUSES, s as statusTone } from "./router-D937WmAP.mjs";
import { d as Input, n as CONTENT_FIELDS, r as DEFAULT_CONTENT, t as BANNER_PLACEMENTS, x as Route$9 } from "./router-D937WmAP2.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { n as supabaseErrorMessage, t as isMissingRpc } from "./supa-error-9zcFkD9J.mjs";
import { t as Switch } from "./switch-Cn1w-cIH.mjs";
import { a as TabsTrigger, i as TabsList, n as Tabs, r as TabsContent, t as ShopHoursEditor } from "./tabs-DzaIlufi.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.ops-voFZXlcD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AdminPage() {
	const { tab } = Route$9.useSearch();
	const navigate = Route$9.useNavigate();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stats, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
		value: tab ?? "orders",
		onValueChange: (v) => void navigate({ search: { tab: v } }),
		className: "mt-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
				className: "flex flex-wrap",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "orders",
						children: "Orders"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "payments",
						children: "Payments"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "payouts",
						children: "Payouts"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "customers",
						children: "Customers"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "shops",
						children: "Shops"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "products",
						children: "Products"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "categories",
						children: "Categories"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "offers",
						children: "Offers"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "banners",
						children: "Banners"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "content",
						children: "Content"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "financials",
						children: "Financials"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "settings",
						children: "Settings"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "system",
						children: "System"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
				value: "orders",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrdersAdmin, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
				value: "payments",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PaymentsAdmin, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
				value: "payouts",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PayoutsAdmin, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
				value: "customers",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CustomersAdmin, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
				value: "shops",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShopsAdmin, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
				value: "products",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductsAdmin, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
				value: "categories",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CategoriesAdmin, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
				value: "offers",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OffersAdmin, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
				value: "banners",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BannersAdmin, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
				value: "content",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContentAdmin, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
				value: "financials",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FinancialsPanel, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
				value: "settings",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsAdmin, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
				value: "system",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SystemAdmin, {})
			})
		]
	})] });
}
var DEFAULT_PLATFORM = {
	commission_percent: 15,
	base_delivery_fee: 50,
	surge_multiplier: 1,
	dispatch_paused: false
};
function SystemAdmin() {
	const qc = useQueryClient();
	const [draft, setDraft] = (0, import_react.useState)(null);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const { data } = useQuery({
		queryKey: ["admin-platform-settings"],
		queryFn: async () => {
			const { data: row } = await supabase.from("settings").select("value").eq("key", "platform").maybeSingle();
			return {
				...DEFAULT_PLATFORM,
				...row?.value ?? {}
			};
		}
	});
	const value = draft ?? data ?? DEFAULT_PLATFORM;
	const save = async (e) => {
		e.preventDefault();
		setSaving(true);
		const { error } = await supabase.from("settings").upsert({
			key: "platform",
			value,
			is_public: true
		}, { onConflict: "key" });
		setSaving(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		setDraft(null);
		qc.invalidateQueries({ queryKey: ["admin-platform-settings"] });
		qc.invalidateQueries({ queryKey: ["settings-public"] });
		toast.success("Platform settings saved");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: save,
		className: "mt-6 max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 shadow-card",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-display text-lg font-bold",
				children: "System control center"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: "commission",
					children: "Platform commission (%)"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					id: "commission",
					type: "number",
					min: 0,
					max: 100,
					step: "0.5",
					value: value.commission_percent,
					onChange: (e) => setDraft({
						...value,
						commission_percent: Number(e.target.value) || 0
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "base-fee",
						children: "Base delivery fee (ETB)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "base-fee",
						type: "number",
						min: 0,
						step: "1",
						value: value.base_delivery_fee,
						onChange: (e) => setDraft({
							...value,
							base_delivery_fee: Number(e.target.value) || 0
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: "Used when a shop doesn't set its own delivery fee."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "surge",
						children: "Surge multiplier"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "surge",
						type: "number",
						min: 1,
						max: 5,
						step: "0.1",
						value: value.surge_multiplier,
						onChange: (e) => setDraft({
							...value,
							surge_multiplier: Number(e.target.value) || 1
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: "Multiplies delivery fees at checkout during peak demand."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm font-medium",
				children: ["Emergency dispatch pause", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
					checked: value.dispatch_paused,
					onCheckedChange: (v) => setDraft({
						...value,
						dispatch_paused: v
					})
				})]
			}),
			value.dispatch_paused && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-destructive",
				children: "Dispatch is paused: admins cannot dispatch orders and riders receive no new offers until resumed."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				disabled: saving,
				children: saving ? "Saving…" : "Save platform settings"
			})
		]
	});
}
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
function CustomersAdmin() {
	const { data: customers = [] } = useQuery({
		queryKey: ["admin-customers"],
		queryFn: async () => {
			const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "customer");
			const ids = (roles ?? []).map((r) => r.user_id);
			if (ids.length === 0) return [];
			const [{ data: profiles }, { data: orders }] = await Promise.all([supabase.from("profiles").select("id,full_name,phone,email,created_at").in("id", ids), supabase.from("orders").select("customer_id,total,status").in("customer_id", ids)]);
			return (profiles ?? []).map((p) => {
				const userOrders = (orders ?? []).filter((o) => o.customer_id === p.id);
				return {
					...p,
					orderCount: userOrders.length,
					spend: userOrders.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0)
				};
			});
		}
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-6 overflow-x-auto rounded-xl border border-border bg-card shadow-card",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
			className: "w-full min-w-[640px] text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
				className: "border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-4 py-3",
						children: "Customer"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-4 py-3",
						children: "Contact"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-4 py-3",
						children: "Joined"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-4 py-3 text-right",
						children: "Orders"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-4 py-3 text-right",
						children: "Lifetime spend"
					})
				]
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [customers.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
				className: "border-b border-border last:border-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-4 py-3 font-medium",
						children: c.full_name || "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-4 py-3 text-muted-foreground",
						children: c.phone || c.email || "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-4 py-3 text-muted-foreground",
						children: formatDate(c.created_at)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-4 py-3 text-right",
						children: c.orderCount
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-4 py-3 text-right font-semibold",
						children: ETB(c.spend)
					})
				]
			}, c.id)), customers.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				colSpan: 5,
				className: "px-4 py-8 text-center text-muted-foreground",
				children: "No customers yet."
			}) })] })]
		})
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
function Stats() {
	const qc = useQueryClient();
	const { data } = useQuery({
		queryKey: ["admin-stats"],
		queryFn: async () => {
			const [orders, shops, products, proofs, riders] = await Promise.all([
				supabase.from("orders").select("total,status,rider_id"),
				supabase.from("shops").select("id"),
				supabase.from("products").select("id"),
				supabase.from("payment_proofs").select("id,status"),
				supabase.from("riders").select("id,is_online,is_approved")
			]);
			const list = orders.data ?? [];
			const approvedRiders = (riders.data ?? []).filter((r) => r.is_approved);
			const onTrip = new Set(list.filter((o) => [
				"accepted",
				"arrived_at_merchant",
				"picked_up",
				"on_the_way"
			].includes(o.status)).map((o) => o.rider_id).filter(Boolean));
			return {
				orders: list.length,
				revenue: list.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0),
				active: list.filter((o) => !["delivered", "cancelled"].includes(o.status)).length,
				shops: shops.data?.length ?? 0,
				products: products.data?.length ?? 0,
				pendingProofs: (proofs.data ?? []).filter((p) => p.status === "pending").length,
				ridersOnline: approvedRiders.filter((r) => r.is_online).length,
				ridersOnTrip: onTrip.size,
				ridersTotal: approvedRiders.length
			};
		}
	});
	(0, import_react.useEffect)(() => {
		const channel = supabase.channel("admin-stats-riders-rt").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "riders"
		}, () => {
			qc.invalidateQueries({ queryKey: ["admin-stats"] });
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [qc]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-7",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				label: "Orders",
				value: data?.orders ?? 0
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				label: "Active",
				value: data?.active ?? 0
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				label: "Revenue",
				value: ETB(data?.revenue ?? 0)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				label: "Shops",
				value: data?.shops ?? 0
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				label: "Products",
				value: data?.products ?? 0
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				label: "Pending receipts",
				value: data?.pendingProofs ?? 0
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-border bg-card p-4 shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs uppercase tracking-wide text-muted-foreground",
						children: "Fleet"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 font-display text-2xl font-extrabold",
						children: [data?.ridersOnline ?? 0, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-sm font-semibold text-muted-foreground",
							children: ["/", data?.ridersTotal ?? 0]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `inline-block h-2 w-2 rounded-full ${(data?.ridersOnline ?? 0) > 0 ? "bg-primary" : "bg-muted-foreground/40"}` }),
							data?.ridersOnline ?? 0,
							" online · ",
							data?.ridersOnTrip ?? 0,
							" on trip"
						]
					})
				]
			})
		]
	});
}
function OrdersAdmin() {
	const qc = useQueryClient();
	const { data: orders = [] } = useQuery({
		queryKey: ["admin-orders"],
		queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ?? []
	});
	const { data: riders = [] } = useQuery({
		queryKey: ["admin-riders"],
		queryFn: async () => {
			const { data } = await supabase.from("riders").select("id,is_approved,is_online");
			const ids = (data ?? []).map((r) => r.id);
			const { data: profiles } = ids.length ? await supabase.from("profiles").select("id,full_name,phone").in("id", ids) : { data: [] };
			return (data ?? []).map((r) => ({
				...r,
				name: profiles?.find((p) => p.id === r.id)?.full_name || "Rider",
				phone: profiles?.find((p) => p.id === r.id)?.phone ?? ""
			}));
		}
	});
	(0, import_react.useEffect)(() => {
		const channel = supabase.channel("admin-orders-rt").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "orders"
		}, () => {
			qc.invalidateQueries({ queryKey: ["admin-orders"] });
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [qc]);
	const update = async (id, patch, customerId, code, message) => {
		const { error } = await supabase.from("orders").update(patch).eq("id", id);
		if (error) {
			toast.error(error.message);
			return;
		}
		await notify(customerId, `Order ${code}`, message, "order", id);
		qc.invalidateQueries({ queryKey: ["admin-orders"] });
		toast.success("Order updated");
	};
	const approveDispatch = async (id, customerId, code) => {
		const { error } = await dispatchOrder(id);
		if (error) {
			toast.error(supabaseErrorMessage(error));
			return;
		}
		await notify(customerId, `Order ${code} confirmed`, "Payment verified — a rider is on the way.", "order", id);
		qc.invalidateQueries({ queryKey: ["admin-orders"] });
		toast.success("Order dispatched to all riders");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-6 space-y-3",
		children: orders.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-xl border border-border bg-card p-4 shadow-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display font-bold",
						children: o.order_code
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted-foreground",
						children: [
							formatDate(o.created_at),
							" · ",
							o.customer_name,
							" · ",
							o.customer_phone
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `rounded-full px-2 py-1 text-xs font-semibold ${statusTone(o.status)}`,
						children: STATUS_LABEL[o.status] ?? o.status
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm",
					children: o.delivery_address
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted-foreground",
					children: [
						ETB(o.total),
						" · ",
						o.payment_method,
						" · ",
						o.payment_status
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex flex-wrap items-center gap-2",
					children: [
						DISPATCHABLE_STATUSES.includes(o.status) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							onClick: () => void approveDispatch(o.id, o.customer_id, o.order_code),
							children: "Approve & Dispatch"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: "h-9 rounded-md border border-input bg-background px-2 text-sm",
							value: o.status,
							onChange: (e) => void update(o.id, { status: e.target.value }, o.customer_id, o.order_code, STATUS_LABEL[e.target.value] ?? e.target.value),
							children: ORDER_STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: s,
								children: STATUS_LABEL[s]
							}, s))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: "h-9 rounded-md border border-input bg-background px-2 text-sm",
							value: o.rider_id ?? "",
							onChange: (e) => void update(o.id, {
								rider_id: e.target.value || null,
								status: e.target.value ? "rider_assigned" : o.status
							}, o.customer_id, o.order_code, "A rider has been assigned to your order."),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "Assign rider…"
							}), riders.filter((r) => r.is_approved).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: r.id,
								children: [r.name, r.is_online ? " (online)" : ""]
							}, r.id))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "outline",
							onClick: () => void update(o.id, { payment_status: "paid" }, o.customer_id, o.order_code, "Payment confirmed."),
							children: "Mark paid"
						})
					]
				})
			]
		}, o.id))
	});
}
var DISPATCHABLE_STATUSES = [
	"pending_payment",
	"pending",
	"payment_verification"
];
/**
* Dispatch via the approve_and_dispatch RPC; if the function is missing from
* the live project (404/PGRST202), fall back to a direct status update so
* admin dispatch never blocks.
*/
async function dispatchOrder(orderId) {
	const { error } = await supabase.rpc("approve_and_dispatch", { _order_id: orderId });
	if (!error) return { error: null };
	if (isMissingRpc(error)) {
		const { error: fallbackError } = await supabase.from("orders").update({
			status: "dispatched",
			dispatched_at: (/* @__PURE__ */ new Date()).toISOString(),
			rider_id: null
		}).eq("id", orderId);
		return { error: fallbackError };
	}
	return { error };
}
function PaymentsAdmin() {
	const qc = useQueryClient();
	const { data: proofs = [] } = useQuery({
		queryKey: ["admin-proofs"],
		queryFn: async () => (await supabase.from("payment_proofs").select("*").order("created_at", { ascending: false })).data ?? []
	});
	(0, import_react.useEffect)(() => {
		const channel = supabase.channel("admin-proofs-rt").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "payment_proofs"
		}, () => {
			qc.invalidateQueries({ queryKey: ["admin-proofs"] });
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [qc]);
	const review = async (id, orderId, userId, status) => {
		if (status === "approved") {
			const { error: dispatchError } = await dispatchOrder(orderId);
			if (dispatchError) {
				toast.error(supabaseErrorMessage(dispatchError));
				return;
			}
		}
		const { error } = await supabase.from("payment_proofs").update({ status }).eq("id", id);
		if (error) {
			toast.error(error.message);
			return;
		}
		await notify(userId, "Payment " + status, status === "approved" ? "Your payment was verified and your order is on its way to a rider." : "Your receipt was rejected. Please re-submit.", "payment", orderId);
		qc.invalidateQueries({ queryKey: ["admin-proofs"] });
		qc.invalidateQueries({ queryKey: ["admin-orders"] });
		toast.success(status === "approved" ? "Payment approved — order dispatched to riders" : "Receipt rejected");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 space-y-3",
		children: [proofs.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted-foreground",
			children: "No receipts submitted."
		}), proofs.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
					path: p.image_url,
					alt: "Receipt",
					bucket: PROOF_BUCKET,
					className: "h-24 w-24 rounded-lg object-cover"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-semibold uppercase",
							children: [
								p.method,
								" · ",
								ETB(p.amount ?? 0)
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted-foreground",
							children: ["Ref: ", p.reference || "—"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted-foreground",
							children: [
								formatDate(p.created_at),
								" · ",
								p.status
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						onClick: () => void review(p.id, p.order_id, p.user_id, "approved"),
						children: "Approve & Dispatch"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "outline",
						onClick: () => void review(p.id, p.order_id, p.user_id, "rejected"),
						children: "Reject"
					})]
				})
			]
		}, p.id))]
	});
}
function useImageUpload(folder) {
	return async (file) => file ? uploadImage(file, folder) : null;
}
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
function CategoriesAdmin() {
	const qc = useQueryClient();
	const upload = useImageUpload("categories");
	const [name, setName] = (0, import_react.useState)("");
	const [file, setFile] = (0, import_react.useState)(null);
	const { data: rows = [] } = useQuery({
		queryKey: ["admin-categories"],
		queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? []
	});
	const create = async (e) => {
		e.preventDefault();
		try {
			const image = await upload(file);
			const { error } = await supabase.from("categories").insert({
				name,
				slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
				image_url: image,
				sort_order: rows.length
			});
			if (error) throw error;
			setName("");
			setFile(null);
			qc.invalidateQueries({ queryKey: ["admin-categories"] });
			toast.success("Category added");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed");
		}
	};
	const toggle = async (id, value) => {
		await supabase.from("categories").update({ is_active: value }).eq("id", id);
		qc.invalidateQueries({ queryKey: ["admin-categories"] });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 grid gap-6 lg:grid-cols-[320px_1fr]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: create,
			className: "h-fit space-y-3 rounded-xl border border-border bg-card p-4 shadow-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-display font-bold",
					children: "New category"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					placeholder: "Name",
					value: name,
					onChange: (e) => setName(e.target.value),
					required: true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "file",
					accept: "image/*",
					onChange: (e) => setFile(e.target.files?.[0] ?? null)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					children: "Add category"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-2",
			children: rows.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
				className: "rounded-xl border border-border bg-card p-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RowEditor, {
						table: "categories",
						id: c.id,
						name: c.name,
						imagePath: c.image_url,
						folder: "categories",
						invalidateKey: "admin-categories"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: c.is_active,
						onCheckedChange: (v) => void toggle(c.id, v)
					})]
				})
			}, c.id))
		})]
	});
}
function ShopsAdmin() {
	const qc = useQueryClient();
	const upload = useImageUpload("shops");
	const [form, setForm] = (0, import_react.useState)({
		name: "",
		description: "",
		address: "",
		phone: "",
		category_id: "",
		delivery_fee: "50",
		delivery_time_min: "30"
	});
	const [file, setFile] = (0, import_react.useState)(null);
	const { data: rows = [] } = useQuery({
		queryKey: ["admin-shops"],
		queryFn: async () => (await supabase.from("shops").select("*").order("name")).data ?? []
	});
	const { data: categories = [] } = useQuery({
		queryKey: ["admin-categories"],
		queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? []
	});
	const create = async (e) => {
		e.preventDefault();
		try {
			const image = await upload(file);
			const { error } = await supabase.from("shops").insert({
				name: form.name,
				description: form.description,
				address: form.address,
				phone: form.phone,
				category_id: form.category_id || null,
				delivery_fee: Number(form.delivery_fee),
				delivery_time_min: Number(form.delivery_time_min),
				image_url: image,
				cover_url: image
			});
			if (error) throw error;
			setForm({
				name: "",
				description: "",
				address: "",
				phone: "",
				category_id: "",
				delivery_fee: "50",
				delivery_time_min: "30"
			});
			setFile(null);
			qc.invalidateQueries({ queryKey: ["admin-shops"] });
			toast.success("Shop created");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed");
		}
	};
	const toggle = async (id, patch) => {
		await supabase.from("shops").update(patch).eq("id", id);
		qc.invalidateQueries({ queryKey: ["admin-shops"] });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 grid gap-6 lg:grid-cols-[340px_1fr]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: create,
			className: "h-fit space-y-3 rounded-xl border border-border bg-card p-4 shadow-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-display font-bold",
					children: "New shop"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					placeholder: "Shop name",
					value: form.name,
					onChange: (e) => setForm({
						...form,
						name: e.target.value
					}),
					required: true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					placeholder: "Description",
					value: form.description,
					onChange: (e) => setForm({
						...form,
						description: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					placeholder: "Address",
					value: form.address,
					onChange: (e) => setForm({
						...form,
						address: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					placeholder: "Phone",
					value: form.phone,
					onChange: (e) => setForm({
						...form,
						phone: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					className: "h-9 w-full rounded-md border border-input bg-background px-2 text-sm",
					value: form.category_id,
					onChange: (e) => setForm({
						...form,
						category_id: e.target.value
					}),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "",
						children: "Category…"
					}), categories.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: c.id,
						children: c.name
					}, c.id))]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						placeholder: "Delivery fee",
						value: form.delivery_fee,
						onChange: (e) => setForm({
							...form,
							delivery_fee: e.target.value
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						placeholder: "Minutes",
						value: form.delivery_time_min,
						onChange: (e) => setForm({
							...form,
							delivery_time_min: e.target.value
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "file",
					accept: "image/*",
					onChange: (e) => setFile(e.target.files?.[0] ?? null)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					children: "Create shop"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-2",
			children: rows.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "rounded-xl border border-border bg-card p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RowEditor, {
							table: "shops",
							id: s.id,
							name: s.name,
							imagePath: s.image_url,
							folder: "shops",
							invalidateKey: "admin-shops",
							alsoSetCover: true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: [
								s.address,
								" · ",
								ETB(s.delivery_fee)
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-4 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex items-center gap-2",
								children: ["Online", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									checked: s.is_online,
									onCheckedChange: (v) => void toggle(s.id, { is_online: v })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex items-center gap-2",
								children: ["Featured", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									checked: s.is_featured,
									onCheckedChange: (v) => void toggle(s.id, { is_featured: v })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex items-center gap-2",
								children: ["Active", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									checked: s.is_active,
									onCheckedChange: (v) => void toggle(s.id, { is_active: v })
								})]
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
					className: "mt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
						className: "cursor-pointer text-sm font-medium text-muted-foreground",
						children: "Opening hours"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShopHoursEditor, {
							shopId: s.id,
							fallbackOpen: s.opens_at.slice(0, 5),
							fallbackClose: s.closes_at.slice(0, 5)
						})
					})]
				})]
			}, s.id))
		})]
	});
}
function ProductsAdmin() {
	const qc = useQueryClient();
	const upload = useImageUpload("products");
	const [form, setForm] = (0, import_react.useState)({
		shop_id: "",
		name: "",
		description: "",
		price: "",
		discount_percent: "0"
	});
	const [file, setFile] = (0, import_react.useState)(null);
	const { data: shops = [] } = useQuery({
		queryKey: ["admin-shops"],
		queryFn: async () => (await supabase.from("shops").select("*").order("name")).data ?? []
	});
	const { data: rows = [] } = useQuery({
		queryKey: ["admin-products"],
		queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false }).limit(200)).data ?? []
	});
	const create = async (e) => {
		e.preventDefault();
		try {
			const image = await upload(file);
			const { error } = await supabase.from("products").insert({
				shop_id: form.shop_id,
				name: form.name,
				description: form.description,
				price: Number(form.price),
				discount_percent: Number(form.discount_percent),
				image_url: image
			});
			if (error) throw error;
			setForm({
				shop_id: form.shop_id,
				name: "",
				description: "",
				price: "",
				discount_percent: "0"
			});
			setFile(null);
			qc.invalidateQueries({ queryKey: ["admin-products"] });
			toast.success("Product added");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed");
		}
	};
	const toggle = async (id, patch) => {
		await supabase.from("products").update(patch).eq("id", id);
		qc.invalidateQueries({ queryKey: ["admin-products"] });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 grid gap-6 lg:grid-cols-[340px_1fr]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: create,
			className: "h-fit space-y-3 rounded-xl border border-border bg-card p-4 shadow-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-display font-bold",
					children: "New product"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					className: "h-9 w-full rounded-md border border-input bg-background px-2 text-sm",
					value: form.shop_id,
					onChange: (e) => setForm({
						...form,
						shop_id: e.target.value
					}),
					required: true,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "",
						children: "Select shop…"
					}), shops.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: s.id,
						children: s.name
					}, s.id))]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					placeholder: "Product name",
					value: form.name,
					onChange: (e) => setForm({
						...form,
						name: e.target.value
					}),
					required: true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					placeholder: "Description",
					value: form.description,
					onChange: (e) => setForm({
						...form,
						description: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						step: "0.01",
						placeholder: "Price ETB",
						value: form.price,
						onChange: (e) => setForm({
							...form,
							price: e.target.value
						}),
						required: true
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						placeholder: "Discount %",
						value: form.discount_percent,
						onChange: (e) => setForm({
							...form,
							discount_percent: e.target.value
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "file",
					accept: "image/*",
					onChange: (e) => setFile(e.target.files?.[0] ?? null)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					children: "Add product"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-2",
			children: rows.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RowEditor, {
						table: "products",
						id: p.id,
						name: p.name,
						imagePath: p.image_url,
						folder: "products",
						invalidateKey: "admin-products",
						price: Number(p.price)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: shops.find((s) => s.id === p.shop_id)?.name
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-4 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex items-center gap-2",
						children: ["Popular", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							checked: p.is_popular,
							onCheckedChange: (v) => void toggle(p.id, { is_popular: v })
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex items-center gap-2",
						children: ["In stock", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							checked: p.in_stock,
							onCheckedChange: (v) => void toggle(p.id, { in_stock: v })
						})]
					})]
				})]
			}, p.id))
		})]
	});
}
function OffersAdmin() {
	const qc = useQueryClient();
	const upload = useImageUpload("offers");
	const [form, setForm] = (0, import_react.useState)({
		title: "",
		description: "",
		discount_type: "percent",
		discount_value: "10"
	});
	const [file, setFile] = (0, import_react.useState)(null);
	const { data: rows = [] } = useQuery({
		queryKey: ["admin-offers"],
		queryFn: async () => (await supabase.from("offers").select("*").order("created_at", { ascending: false })).data ?? []
	});
	const create = async (e) => {
		e.preventDefault();
		try {
			const image = await upload(file);
			const { error } = await supabase.from("offers").insert({
				title: form.title,
				description: form.description,
				discount_type: form.discount_type,
				discount_value: Number(form.discount_value),
				image_url: image
			});
			if (error) throw error;
			setForm({
				title: "",
				description: "",
				discount_type: "percent",
				discount_value: "10"
			});
			setFile(null);
			qc.invalidateQueries({ queryKey: ["admin-offers"] });
			toast.success("Offer created");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 grid gap-6 lg:grid-cols-[340px_1fr]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: create,
			className: "h-fit space-y-3 rounded-xl border border-border bg-card p-4 shadow-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-display font-bold",
					children: "New offer"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					placeholder: "Title",
					value: form.title,
					onChange: (e) => setForm({
						...form,
						title: e.target.value
					}),
					required: true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					placeholder: "Description",
					value: form.description,
					onChange: (e) => setForm({
						...form,
						description: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "h-9 rounded-md border border-input bg-background px-2 text-sm",
						value: form.discount_type,
						onChange: (e) => setForm({
							...form,
							discount_type: e.target.value
						}),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "percent",
							children: "Percent"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "amount",
							children: "Amount"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						value: form.discount_value,
						onChange: (e) => setForm({
							...form,
							discount_value: e.target.value
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "file",
					accept: "image/*",
					onChange: (e) => setFile(e.target.files?.[0] ?? null)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					children: "Create offer"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-2",
			children: rows.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "min-w-0 flex-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RowEditor, {
						table: "offers",
						id: o.id,
						name: o.title,
						nameColumn: "title",
						imagePath: o.image_url,
						folder: "offers",
						invalidateKey: "admin-offers"
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
					checked: o.is_active,
					onCheckedChange: async (v) => {
						await supabase.from("offers").update({ is_active: v }).eq("id", o.id);
						qc.invalidateQueries({ queryKey: ["admin-offers"] });
					}
				})]
			}, o.id))
		})]
	});
}
var PAYMENT_KEYS = [
	{
		key: "payment_telebirr",
		label: "Telebirr"
	},
	{
		key: "payment_cbe",
		label: "CBE"
	},
	{
		key: "payment_boa",
		label: "Bank of Abyssinia"
	}
];
function SettingsAdmin() {
	const qc = useQueryClient();
	const { data: settings = {} } = useQuery({
		queryKey: ["admin-settings"],
		queryFn: async () => {
			const { data } = await supabase.from("settings").select("key,value");
			const map = {};
			for (const row of data ?? []) map[row.key] = row.value;
			return map;
		}
	});
	const save = async (key, value) => {
		const { error } = await supabase.from("settings").upsert({
			key,
			value,
			is_public: false
		}, { onConflict: "key" });
		if (error) {
			toast.error(error.message);
			return;
		}
		qc.invalidateQueries({ queryKey: ["admin-settings"] });
		toast.success("Saved");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-6 grid gap-4 md:grid-cols-3",
		children: PAYMENT_KEYS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PaymentSetting, {
			label: p.label,
			value: settings[p.key] ?? {},
			onSave: (v) => void save(p.key, v)
		}, p.key))
	});
}
function PaymentSetting({ label, value, onSave }) {
	const [accountName, setAccountName] = (0, import_react.useState)(value["account_name"] ?? "");
	const [accountNumber, setAccountNumber] = (0, import_react.useState)(value["account_number"] ?? "");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: (e) => {
			e.preventDefault();
			onSave({
				account_name: accountName,
				account_number: accountNumber
			});
		},
		className: "space-y-3 rounded-xl border border-border bg-card p-4 shadow-card",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-display font-bold",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Account name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: accountName,
					onChange: (e) => setAccountName(e.target.value)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Account number" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: accountNumber,
					onChange: (e) => setAccountNumber(e.target.value)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				size: "sm",
				children: "Save"
			})
		]
	});
}
function RowEditor({ table, id, name, nameColumn = "name", imagePath, folder, invalidateKey, price, alsoSetCover }) {
	const [deleting, setDeleting] = (0, import_react.useState)(false);
	const qc = useQueryClient();
	const [value, setValue] = (0, import_react.useState)(name);
	const [priceValue, setPriceValue] = (0, import_react.useState)(price != null ? String(price) : "");
	const [saving, setSaving] = (0, import_react.useState)(false);
	const save = async (file) => {
		setSaving(true);
		try {
			const patch = { [nameColumn]: value.trim().slice(0, 120) };
			if (price != null && priceValue !== "") patch["price"] = Number(priceValue);
			if (file) {
				const path = await uploadImage(file, folder);
				patch["image_url"] = path;
				if (alsoSetCover) patch["cover_url"] = path;
			}
			const { error } = await supabase.from(table).update(patch).eq("id", id);
			if (error) throw error;
			qc.invalidateQueries({ queryKey: [invalidateKey] });
			toast.success("Saved");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSaving(false);
		}
	};
	const remove = async () => {
		if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
		setDeleting(true);
		try {
			const { error } = await supabase.from(table).delete().eq("id", id);
			if (error) {
				const { error: deactivateError } = await supabase.from(table).update({ is_active: false }).eq("id", id);
				if (deactivateError) throw error;
				toast.success("In use by existing orders — hidden from the app instead");
			} else toast.success("Deleted");
			qc.invalidateQueries({ queryKey: [invalidateKey] });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete");
		} finally {
			setDeleting(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-center gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
				path: imagePath,
				alt: name,
				className: "h-12 w-12 rounded-md object-cover"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value,
				onChange: (e) => setValue(e.target.value),
				maxLength: 120,
				className: "h-9 w-44"
			}),
			price != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				type: "number",
				step: "0.01",
				value: priceValue,
				onChange: (e) => setPriceValue(e.target.value),
				className: "h-9 w-28"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				type: "file",
				accept: "image/*",
				className: "h-9 w-44 text-xs",
				onChange: (e) => void save(e.target.files?.[0] ?? null)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				variant: "outline",
				disabled: saving,
				onClick: () => void save(null),
				children: "Save"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				variant: "destructive",
				disabled: deleting,
				onClick: () => void remove(),
				children: "Delete"
			})
		]
	});
}
function BannersAdmin() {
	const qc = useQueryClient();
	const [form, setForm] = (0, import_react.useState)({
		title: "",
		subtitle: "",
		cta_label: "",
		link_url: "",
		placement: "home_top",
		sort_order: "0"
	});
	const [file, setFile] = (0, import_react.useState)(null);
	const { data: rows = [] } = useQuery({
		queryKey: ["admin-banners"],
		queryFn: async () => (await supabase.from("banners").select("*").order("placement").order("sort_order")).data ?? []
	});
	const create = async (e) => {
		e.preventDefault();
		try {
			const image = file ? await uploadImage(file, "banners") : null;
			const { error } = await supabase.from("banners").insert({
				title: form.title.trim().slice(0, 120),
				subtitle: form.subtitle.trim().slice(0, 300) || null,
				cta_label: form.cta_label.trim().slice(0, 60) || null,
				link_url: form.link_url.trim().slice(0, 500) || null,
				placement: form.placement,
				sort_order: Number(form.sort_order) || 0,
				image_url: image
			});
			if (error) throw error;
			setForm({
				title: "",
				subtitle: "",
				cta_label: "",
				link_url: "",
				placement: form.placement,
				sort_order: "0"
			});
			setFile(null);
			qc.invalidateQueries({ queryKey: ["admin-banners"] });
			toast.success("Banner created");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed");
		}
	};
	const patch = async (id, value) => {
		const { error } = await supabase.from("banners").update(value).eq("id", id);
		if (error) {
			toast.error(error.message);
			return;
		}
		qc.invalidateQueries({ queryKey: ["admin-banners"] });
	};
	const remove = async (id) => {
		const { error } = await supabase.from("banners").delete().eq("id", id);
		if (error) {
			toast.error(error.message);
			return;
		}
		qc.invalidateQueries({ queryKey: ["admin-banners"] });
		toast.success("Banner deleted");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 grid gap-6 lg:grid-cols-[340px_1fr]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: create,
			className: "h-fit space-y-3 rounded-xl border border-border bg-card p-4 shadow-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-display font-bold",
					children: "New banner"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					placeholder: "Title",
					value: form.title,
					onChange: (e) => setForm({
						...form,
						title: e.target.value
					}),
					required: true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					placeholder: "Subtitle",
					value: form.subtitle,
					onChange: (e) => setForm({
						...form,
						subtitle: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					placeholder: "Button label",
					value: form.cta_label,
					onChange: (e) => setForm({
						...form,
						cta_label: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					placeholder: "Link (/shops or https://…)",
					value: form.link_url,
					onChange: (e) => setForm({
						...form,
						link_url: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: "h-9 w-full rounded-md border border-input bg-background px-2 text-sm",
					value: form.placement,
					onChange: (e) => setForm({
						...form,
						placement: e.target.value
					}),
					children: BANNER_PLACEMENTS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: p.value,
						children: p.label
					}, p.value))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "number",
					placeholder: "Order",
					value: form.sort_order,
					onChange: (e) => setForm({
						...form,
						sort_order: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "file",
					accept: "image/*",
					onChange: (e) => setFile(e.target.files?.[0] ?? null)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					children: "Create banner"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
			className: "space-y-2",
			children: [rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "No banners yet."
			}), rows.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex min-w-0 items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
						path: b.image_url,
						alt: b.title,
						className: "h-12 w-20 rounded-md object-cover"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate font-medium",
							children: b.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: BANNER_PLACEMENTS.find((p) => p.value === b.placement)?.label ?? b.placement
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-3 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: "h-9 rounded-md border border-input bg-background px-2 text-sm",
							value: b.placement,
							onChange: (e) => void patch(b.id, { placement: e.target.value }),
							children: BANNER_PLACEMENTS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: p.value,
								children: p.label
							}, p.value))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							defaultValue: b.sort_order,
							className: "h-9 w-20",
							onBlur: (e) => void patch(b.id, { sort_order: Number(e.target.value) || 0 })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-2",
							children: ["Active", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								checked: b.is_active,
								onCheckedChange: (v) => void patch(b.id, { is_active: v })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "outline",
							onClick: () => void remove(b.id),
							children: "Delete"
						})
					]
				})]
			}, b.id))]
		})]
	});
}
function ContentAdmin() {
	const qc = useQueryClient();
	const { data } = useQuery({
		queryKey: ["admin-site-content"],
		queryFn: async () => {
			const { data: row } = await supabase.from("settings").select("value").eq("key", "site_content").maybeSingle();
			return {
				...DEFAULT_CONTENT,
				...row?.value ?? {}
			};
		}
	});
	const [draft, setDraft] = (0, import_react.useState)(null);
	const value = draft ?? data ?? DEFAULT_CONTENT;
	const save = async (e) => {
		e.preventDefault();
		const clean = Object.fromEntries(CONTENT_FIELDS.map((f) => [f.key, String(value[f.key] ?? "").trim().slice(0, 500)]));
		clean["logo_url"] = value.logo_url ?? "";
		const { error } = await supabase.from("settings").upsert({
			key: "site_content",
			value: clean,
			is_public: true
		}, { onConflict: "key" });
		if (error) {
			toast.error(error.message);
			return;
		}
		qc.invalidateQueries({ queryKey: ["admin-site-content"] });
		qc.invalidateQueries({ queryKey: ["site-content"] });
		toast.success("Site content saved");
	};
	const uploadLogo = async (file) => {
		if (!file) return;
		try {
			const path = await uploadImage(file, "branding");
			const next = {
				...value,
				logo_url: path
			};
			setDraft(next);
			const { error } = await supabase.from("settings").upsert({
				key: "site_content",
				value: next,
				is_public: true
			}, { onConflict: "key" });
			if (error) throw error;
			qc.invalidateQueries({ queryKey: ["admin-site-content"] });
			qc.invalidateQueries({ queryKey: ["site-content"] });
			toast.success("Logo updated");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to upload logo");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: save,
		className: "mt-6 space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StorageImage, {
						path: value.logo_url || null,
						alt: "Platform logo",
						className: "h-14 w-14 rounded-lg object-cover"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Platform logo" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "file",
							accept: "image/*",
							className: "w-64",
							onChange: (e) => void uploadLogo(e.target.files?.[0] ?? null)
						})]
					}),
					value.logo_url && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						size: "sm",
						variant: "outline",
						onClick: () => setDraft({
							...value,
							logo_url: ""
						}),
						children: "Remove logo"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 md:grid-cols-2 lg:grid-cols-3",
				children: CONTENT_FIELDS.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: f.label }), f.long ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
						value: value[f.key] ?? "",
						onChange: (e) => setDraft({
							...value,
							[f.key]: e.target.value
						})
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: value[f.key] ?? "",
						onChange: (e) => setDraft({
							...value,
							[f.key]: e.target.value
						}),
						maxLength: 200
					})]
				}, f.key))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				children: "Save all text"
			})
		]
	});
}
//#endregion
export { FinancialsPanel, PayoutsAdmin, AdminPage as component };
