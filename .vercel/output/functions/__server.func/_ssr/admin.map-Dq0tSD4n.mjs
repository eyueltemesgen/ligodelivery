import { i as __toESM } from "../_runtime.mjs";
import { r as supabase } from "./client-D2C38fHY.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { b as ClientOnly } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { B as Gauge, K as CirclePause, N as MapPin, S as Phone, it as Battery, t as X } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as Button, d as formatDate, i as STATUS_LABEL, l as ETB } from "./router-D937WmAP.mjs";
import { i as publicSettingsQuery } from "./queries-DB3Dy3Ev.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.map-Dq0tSD4n.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ACTIVE_STATUSES = [
	"accepted",
	"arrived_at_merchant",
	"picked_up",
	"on_the_way"
];
function LiveMapPage() {
	const qc = useQueryClient();
	const [selectedRiderId, setSelectedRiderId] = (0, import_react.useState)(null);
	const { data: settings = {} } = useQuery(publicSettingsQuery);
	const dispatchPaused = settings["platform"]?.dispatch_paused === true;
	const { data: riders = [] } = useQuery({
		queryKey: ["admin-map-riders"],
		queryFn: async () => {
			const { data } = await supabase.from("riders").select("id,is_online,is_approved,lat,lng,speed,battery,location_updated_at");
			const ids = (data ?? []).map((r) => r.id);
			const { data: profiles } = ids.length ? await supabase.from("profiles").select("id,full_name,phone").in("id", ids) : { data: [] };
			return (data ?? []).map((r) => ({
				...r,
				name: profiles?.find((p) => p.id === r.id)?.full_name || "Rider",
				phone: profiles?.find((p) => p.id === r.id)?.phone ?? ""
			}));
		}
	});
	const { data: activeOrders = [] } = useQuery({
		queryKey: ["admin-map-orders"],
		queryFn: async () => {
			const { data } = await supabase.from("orders").select("id,order_code,status,rider_id,lat,lng,total,delivery_address").in("status", ACTIVE_STATUSES);
			return data ?? [];
		}
	});
	(0, import_react.useEffect)(() => {
		const channel = supabase.channel("admin-map-rt").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "riders"
		}, () => {
			qc.invalidateQueries({ queryKey: ["admin-map-riders"] });
		}).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "orders"
		}, () => {
			qc.invalidateQueries({ queryKey: ["admin-map-orders"] });
			qc.invalidateQueries({ queryKey: ["admin-map-shops"] });
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [qc]);
	const deliveringIds = (0, import_react.useMemo)(() => new Set(activeOrders.map((o) => o.rider_id).filter(Boolean)), [activeOrders]);
	const selectedRider = riders.find((r) => r.id === selectedRiderId) ?? null;
	const selectedOrder = activeOrders.find((o) => o.rider_id === selectedRiderId) ?? null;
	const toggleDispatchPause = async (paused) => {
		const { data: row } = await supabase.from("settings").select("value").eq("key", "platform").maybeSingle();
		const value = {
			...row?.value ?? {},
			dispatch_paused: paused
		};
		const { error } = await supabase.from("settings").upsert({
			key: "platform",
			value,
			is_public: true
		}, { onConflict: "key" });
		if (error) {
			toast.error(error.message);
			return;
		}
		qc.invalidateQueries({ queryKey: ["settings-public"] });
		toast.success(paused ? "Dispatch paused platform-wide" : "Dispatch resumed");
	};
	const reassign = async (orderId) => {
		const { error } = await supabase.from("orders").update({
			rider_id: null,
			status: "dispatched"
		}).eq("id", orderId);
		if (error) {
			toast.error(error.message);
			return;
		}
		qc.invalidateQueries({ queryKey: ["admin-map-orders"] });
		toast.success("Order re-broadcast to all riders");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-[calc(100vh-8.5rem)] gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "min-w-0 flex-1 overflow-hidden rounded-xl border border-border shadow-card",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientOnly, { fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full w-full bg-surface" }) })
		}), selectedRider && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "w-80 shrink-0 space-y-4 overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-lg font-bold",
						children: selectedRider.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: selectedRider.is_online ? deliveringIds.has(selectedRider.id) ? "On delivery" : "Online · idle" : "Offline"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setSelectedRiderId(null),
						className: "rounded-md p-1 text-muted-foreground hover:bg-secondary",
						"aria-label": "Close rider panel",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "space-y-2 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge, { className: "h-4 w-4 text-muted-foreground" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-muted-foreground",
									children: "Speed"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "ml-auto font-medium",
									children: selectedRider.speed != null ? `${Math.round(selectedRider.speed * 3.6)} km/h` : "—"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Battery, { className: "h-4 w-4 text-muted-foreground" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-muted-foreground",
									children: "Battery"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "ml-auto font-medium",
									children: selectedRider.battery != null ? `${selectedRider.battery}%` : "—"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-4 w-4 text-muted-foreground" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-muted-foreground",
									children: "GPS"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
									className: "ml-auto font-mono text-xs",
									children: [
										selectedRider.lat?.toFixed(5) ?? "—",
										", ",
										selectedRider.lng?.toFixed(5) ?? "—"
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-muted-foreground",
								children: "Last update"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "ml-auto text-xs",
								children: formatDate(selectedRider.location_updated_at)
							})]
						})
					]
				}),
				selectedOrder ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-lg border border-border bg-surface p-3 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-semibold",
							children: selectedOrder.order_code
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted-foreground",
							children: [
								STATUS_LABEL[selectedOrder.status] ?? selectedOrder.status,
								" ·",
								" ",
								ETB(selectedOrder.total)
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs",
							children: selectedOrder.delivery_address
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "outline",
							className: "mt-2 w-full",
							onClick: () => void reassign(selectedOrder.id),
							children: "Reassign order"
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "No active order assigned."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						className: "w-full",
						asChild: true,
						disabled: !selectedRider.phone,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: `tel:${selectedRider.phone}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "mr-2 h-4 w-4" }), " Contact rider"]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: dispatchPaused ? "default" : "outline",
						className: "w-full",
						onClick: () => void toggleDispatchPause(!dispatchPaused),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CirclePause, { className: "mr-2 h-4 w-4" }), dispatchPaused ? "Resume dispatch" : "Pause dispatch"]
					})]
				})
			]
		})]
	});
}
//#endregion
export { LiveMapPage as component };
