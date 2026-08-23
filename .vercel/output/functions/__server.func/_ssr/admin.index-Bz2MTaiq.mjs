import { r as supabase } from "./client-D2C38fHY.mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { G as CircleX, H as Clock, at as ArrowUpRight, ct as ArrowDownRight, et as CalendarRange, f as Store, g as ShoppingBag, i as Users, q as CircleCheck, r as Wallet, tt as Bike } from "../_libs/lucide-react.mjs";
import { l as ETB } from "./router-D937WmAP.mjs";
import { g as Route$13, p as RANGES } from "./router-D937WmAP2.mjs";
import { a as CartesianGrid, c as Cell, d as Legend, i as XAxis, l as ResponsiveContainer, n as BarChart, o as Bar, r as YAxis, s as Pie, t as PieChart, u as Tooltip } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.index-Bz2MTaiq.js
var import_jsx_runtime = require_jsx_runtime();
var startOfToday = () => {
	const d = /* @__PURE__ */ new Date();
	d.setHours(0, 0, 0, 0);
	return d;
};
function AdminDashboard() {
	const { range = "today" } = Route$13.useSearch();
	const navigate = useNavigate();
	const rangeDef = RANGES.find((r) => r.key === range) ?? RANGES[0];
	const { data } = useQuery({
		queryKey: ["admin-dashboard", range],
		refetchInterval: 3e4,
		queryFn: async () => {
			const today = startOfToday();
			const windowStart = /* @__PURE__ */ new Date(today.getTime() - (rangeDef.days - 1) * 864e5);
			const prevStart = /* @__PURE__ */ new Date(windowStart.getTime() - rangeDef.days * 864e5);
			const [orders, riders, shops, customers, platformRow] = await Promise.all([
				supabase.from("orders").select("id,status,total,delivery_fee,created_at,rider_id").gte("created_at", prevStart.toISOString()),
				supabase.from("riders").select("id,is_online,is_approved"),
				supabase.from("shops").select("id,is_active,is_online"),
				supabase.from("profiles").select("id,created_at").gte("created_at", prevStart.toISOString()),
				supabase.from("settings").select("value").eq("key", "platform").maybeSingle()
			]);
			const all = orders.data ?? [];
			const inWindow = all.filter((o) => new Date(o.created_at) >= windowStart);
			const inPrev = all.filter((o) => new Date(o.created_at) >= prevStart && new Date(o.created_at) < windowStart);
			const revenueOf = (rows) => rows.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0);
			const completedOf = (rows) => rows.filter((o) => o.status === "delivered").length;
			const commissionPct = Number((platformRow.data?.value)?.commission_percent ?? 15);
			const delivered = inWindow.filter((o) => o.status === "delivered");
			const deliveryFees = delivered.reduce((s, o) => s + Number(o.delivery_fee), 0);
			const gross = delivered.reduce((s, o) => s + Number(o.total), 0);
			const commission = (gross - deliveryFees) * (commissionPct / 100);
			const merchantPayouts = gross - deliveryFees - commission;
			const volume = rangeDef.days === 1 ? Array.from({ length: 24 }, (_, h) => ({
				label: `${h}:00`,
				orders: inWindow.filter((o) => new Date(o.created_at).getHours() === h).length
			})) : Array.from({ length: rangeDef.days }, (_, i) => {
				const dayStart = new Date(windowStart.getTime() + i * 864e5);
				const dayEnd = new Date(dayStart.getTime() + 864e5);
				return {
					label: dayStart.toLocaleDateString("en-GB", {
						day: "2-digit",
						month: "short"
					}),
					orders: inWindow.filter((o) => {
						const t = new Date(o.created_at);
						return t >= dayStart && t < dayEnd;
					}).length
				};
			});
			const activeRiders = (riders.data ?? []).filter((r) => r.is_approved && r.is_online);
			const onDelivery = new Set(all.filter((o) => [
				"accepted",
				"arrived_at_merchant",
				"picked_up",
				"on_the_way"
			].includes(o.status)).map((o) => o.rider_id));
			const customersAll = customers.data ?? [];
			return {
				revenue: revenueOf(inWindow),
				prevRevenue: revenueOf(inPrev),
				ordersCount: inWindow.length,
				prevOrdersCount: inPrev.length,
				ridersOnline: activeRiders.length,
				ridersOnDelivery: onDelivery.size,
				activeMerchants: (shops.data ?? []).filter((s) => s.is_active && s.is_online).length,
				totalMerchants: (shops.data ?? []).length,
				customersJoined: customersAll.filter((c) => new Date(c.created_at) >= windowStart).length,
				prevCustomersJoined: customersAll.filter((c) => new Date(c.created_at) >= prevStart && new Date(c.created_at) < windowStart).length,
				pendingOrders: all.filter((o) => [
					"pending_payment",
					"pending",
					"payment_verification"
				].includes(o.status)).length,
				completed: completedOf(inWindow),
				prevCompleted: completedOf(inPrev),
				cancelled: inWindow.filter((o) => o.status === "cancelled").length,
				prevCancelled: inPrev.filter((o) => o.status === "cancelled").length,
				volume,
				revenueSplit: [
					{
						name: "Platform commission",
						value: Math.round(commission)
					},
					{
						name: "Delivery fees",
						value: Math.round(deliveryFees)
					},
					{
						name: "Merchant payouts",
						value: Math.round(merchantPayouts)
					}
				]
			};
		}
	});
	const delta = (cur, prev) => prev === 0 ? cur > 0 ? 100 : 0 : Math.round((cur - prev) / prev * 100);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "font-display text-xl font-extrabold",
					children: ["Dashboard · ", rangeDef.label]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-card",
					role: "group",
					"aria-label": "Date range filter",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarRange, { className: "ml-1 h-4 w-4 text-muted-foreground" }), RANGES.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => void navigate({
							to: "/admin",
							search: r.key === "today" ? {} : { range: r.key },
							replace: true
						}),
						className: `rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`,
						children: r.label
					}, r.key))]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						icon: Wallet,
						label: "Revenue",
						value: ETB(data?.revenue ?? 0),
						delta: delta(data?.revenue ?? 0, data?.prevRevenue ?? 0),
						deltaLabel: rangeDef.prevLabel
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						icon: ShoppingBag,
						label: "Orders",
						value: String(data?.ordersCount ?? 0),
						delta: delta(data?.ordersCount ?? 0, data?.prevOrdersCount ?? 0),
						deltaLabel: rangeDef.prevLabel
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						icon: Bike,
						label: "Active Riders",
						value: `${data?.ridersOnline ?? 0} online · ${data?.ridersOnDelivery ?? 0} on delivery`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						icon: Store,
						label: "Active Merchants",
						value: `${data?.activeMerchants ?? 0} / ${data?.totalMerchants ?? 0}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						icon: Users,
						label: "Customers Joined",
						value: String(data?.customersJoined ?? 0),
						delta: delta(data?.customersJoined ?? 0, data?.prevCustomersJoined ?? 0),
						deltaLabel: rangeDef.prevLabel
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						icon: Clock,
						label: "Pending Orders",
						value: String(data?.pendingOrders ?? 0),
						hint: "Awaiting approval / dispatch"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						icon: CircleCheck,
						label: "Completed Deliveries",
						value: String(data?.completed ?? 0),
						delta: delta(data?.completed ?? 0, data?.prevCompleted ?? 0),
						deltaLabel: rangeDef.prevLabel
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						icon: CircleX,
						label: "Cancelled / Refunded",
						value: String(data?.cancelled ?? 0),
						delta: delta(data?.cancelled ?? 0, data?.prevCancelled ?? 0),
						deltaLabel: rangeDef.prevLabel
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-card p-5 shadow-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-base font-bold",
						children: rangeDef.days === 1 ? "Hourly order volume vs capacity (today)" : `Daily order volume (${rangeDef.label.toLowerCase()})`
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 h-64",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
								data: data?.volume ?? [],
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
										strokeDasharray: "3 3",
										stroke: "#e2e8f0"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
										dataKey: "label",
										tick: { fontSize: 10 },
										interval: rangeDef.days === 30 ? 4 : 3
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
										allowDecimals: false,
										tick: { fontSize: 10 },
										width: 28
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
										dataKey: "orders",
										fill: "#059669",
										radius: [
											4,
											4,
											0,
											0
										]
									})
								]
							})
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-card p-5 shadow-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "font-display text-base font-bold",
						children: [
							"Revenue distribution (",
							rangeDef.label.toLowerCase(),
							")"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 h-64",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PieChart, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pie, {
									data: data?.revenueSplit ?? [],
									dataKey: "value",
									nameKey: "name",
									innerRadius: 55,
									outerRadius: 90,
									paddingAngle: 2,
									children: (data?.revenueSplit ?? []).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { fill: [
										"#059669",
										"#0ea5e9",
										"#f59e0b"
									][i % 3] }, i))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { formatter: (v) => ETB(v) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, {})
							] })
						})
					})]
				})]
			})
		]
	});
}
function Kpi({ icon: Icon, label, value, delta, deltaLabel, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-card p-4 shadow-card",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-wide text-muted-foreground",
					children: label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4 text-primary" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 font-display text-xl font-extrabold lg:text-2xl",
				children: value
			}),
			delta != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: `mt-1 flex items-center gap-1 text-xs font-medium ${delta >= 0 ? "text-primary" : "text-destructive"}`,
				children: [
					delta >= 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownRight, { className: "h-3.5 w-3.5" }),
					Math.abs(delta),
					"% ",
					deltaLabel
				]
			}),
			hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-muted-foreground",
				children: hint
			})
		]
	});
}
//#endregion
export { AdminDashboard as component };
