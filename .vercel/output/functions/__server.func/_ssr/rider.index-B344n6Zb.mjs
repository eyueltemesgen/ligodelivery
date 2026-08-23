import { i as __toESM } from "../_runtime.mjs";
import { r as supabase } from "./client-D2C38fHY.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { $ as Camera, E as PackageCheck, N as MapPin, O as Navigation, S as Phone, U as ClipboardList, a as User, f as Store, p as Star, r as Wallet, t as X, tt as Bike, w as Pencil, z as House } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as Button, d as formatDate, h as uploadImage, i as STATUS_LABEL, l as ETB, n as IdentityAvatar, o as notify } from "./router-D937WmAP.mjs";
import { C as SheetContent, E as SheetTitle, S as Sheet, T as SheetHeader, d as Input, j as useAuth, w as SheetDescription } from "./router-D937WmAP2.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { r as RiderGate } from "./guards-BJ4lUOJX.mjs";
import { i as publicSettingsQuery } from "./queries-DB3Dy3Ev.mjs";
import { t as Switch } from "./switch-Cn1w-cIH.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, o as TierBadge, r as SelectItem, t as Select } from "./select-BmOrbPme.mjs";
import { n as primeAudio, r as sounds, t as loadAudioSettings } from "./audio-CMj0jvPq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rider.index-B344n6Zb.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function RiderPortalPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiderGate, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiderPortal, {}) });
}
var haversineKm = (aLat, aLng, bLat, bLng) => {
	const rad = Math.PI / 180;
	const dLat = (bLat - aLat) * rad;
	const dLng = (bLng - aLng) * rad;
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
	return Math.round(12742 * Math.asin(Math.sqrt(h)) * 100) / 100;
};
var AVATAR_DIM = {
	lg: "h-12 w-12 text-base",
	xl: "h-20 w-20 text-2xl"
};
function RiderAvatar({ path, name, size }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IdentityAvatar, {
		path,
		name,
		className: AVATAR_DIM[size]
	});
}
/** Compact trip summary pinned above the step-by-step delivery flow. */
function ActiveTripCard({ order }) {
	const { data: shop } = useQuery({
		queryKey: ["trip-shop", order.shop_id],
		enabled: !!order.shop_id,
		queryFn: async () => {
			const { data } = await supabase.from("shops").select("name,address,lat,lng").eq("id", order.shop_id).maybeSingle();
			return data;
		}
	});
	const distanceKm = shop?.lat != null && shop?.lng != null && order.lat != null && order.lng != null ? haversineKm(shop.lat, shop.lng, order.lat, order.lng) : null;
	const pay = Number(order.rider_payout) || Number(order.delivery_fee) + Number(order.tip ?? 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-primary/30 bg-card p-4 shadow-card",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
					children: "Active trip"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-accent-foreground",
					children: STATUS_LABEL[order.status] ?? order.status
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 space-y-2.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "flex items-start gap-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "mt-0.5 h-4 w-4 shrink-0 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-xs text-muted-foreground",
						children: "Pickup"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold",
						children: shop?.name ?? "Merchant"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "flex items-start gap-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "mt-0.5 h-4 w-4 shrink-0 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-xs text-muted-foreground",
						children: "Drop-off"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold",
						children: order.delivery_address ?? "—"
					})] })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[10px] uppercase tracking-wide text-muted-foreground",
						children: "Distance"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-sm font-bold",
						children: distanceKm != null ? `${distanceKm} km` : "—"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[10px] uppercase tracking-wide text-muted-foreground",
						children: "Est. pay"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-sm font-bold text-primary",
						children: ETB(pay)
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[10px] uppercase tracking-wide text-muted-foreground",
						children: "Order"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-sm font-bold",
						children: order.order_code
					})] })
				]
			})
		]
	});
}
function RiderPortal() {
	const { user, isRider, profile } = useAuth();
	const qc = useQueryClient();
	const [tab, setTab] = (0, import_react.useState)("home");
	const [offer, setOffer] = (0, import_react.useState)(null);
	const seenOfferIds = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const { data: rider } = useQuery({
		queryKey: ["rider-me", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const { data } = await supabase.from("riders").select("*").eq("id", user.id).maybeSingle();
			return data;
		}
	});
	const { data: publicSettings = {} } = useQuery(publicSettingsQuery);
	const dispatchPaused = publicSettings["platform"]?.dispatch_paused === true;
	const { data: orders = [] } = useQuery({
		queryKey: ["rider-orders", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const { data } = await supabase.from("orders").select("id,order_code,status,total,delivery_fee,rider_payout,tip,payment_method,payment_status,customer_id,customer_name,customer_phone,delivery_address,delivery_instructions,lat,lng,created_at,shop_id,dispatched_at").eq("rider_id", user.id).order("created_at", { ascending: false });
			return data ?? [];
		}
	});
	const { data: availableRaw = [] } = useQuery({
		queryKey: ["rider-available", user?.id],
		enabled: !!user && !!rider?.is_approved,
		refetchInterval: 1e4,
		queryFn: async () => {
			const { data } = await supabase.from("orders").select("id,order_code,status,total,delivery_fee,rider_payout,tip,payment_method,payment_status,customer_id,customer_name,customer_phone,delivery_address,delivery_instructions,lat,lng,created_at,shop_id,dispatched_at").eq("status", "dispatched").is("rider_id", null).order("dispatched_at", { ascending: false });
			return data ?? [];
		}
	});
	const { data: myEvents = [] } = useQuery({
		queryKey: ["rider-offer-events", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const { data } = await supabase.from("rider_offer_events").select("order_id,event").eq("rider_id", user.id);
			return data ?? [];
		}
	});
	const { data: earnings = [] } = useQuery({
		queryKey: ["rider-earnings", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const { data } = await supabase.from("rider_earnings").select("id,amount,base_fare,tip,bonus,distance_km,distance_incentive,status,created_at").eq("rider_id", user.id).order("created_at", { ascending: false });
			return data ?? [];
		}
	});
	const { data: payouts = [] } = useQuery({
		queryKey: ["rider-payouts", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const { data } = await supabase.from("payout_requests").select("id,amount,status,created_at,processed_at").eq("rider_id", user.id).order("created_at", { ascending: false });
			return data ?? [];
		}
	});
	const { data: ratings = [] } = useQuery({
		queryKey: ["rider-ratings", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const { data } = await supabase.from("rider_ratings").select("rating").eq("rider_id", user.id);
			return data ?? [];
		}
	});
	const declinedIds = (0, import_react.useMemo)(() => new Set(myEvents.filter((e) => e.event === "declined").map((e) => e.order_id)), [myEvents]);
	const activeOrders = orders.filter((o) => [
		"accepted",
		"arrived_at_merchant",
		"picked_up",
		"on_the_way"
	].includes(o.status));
	const activeOrder = activeOrders[0] ?? null;
	const available = (0, import_react.useMemo)(() => rider?.is_online && !activeOrder ? availableRaw.filter((o) => !declinedIds.has(o.id)) : [], [
		availableRaw,
		declinedIds,
		rider?.is_online,
		activeOrder
	]);
	(0, import_react.useEffect)(() => {
		const next = available.find((o) => !seenOfferIds.current.has(o.id));
		if (next) {
			seenOfferIds.current.add(next.id);
			setOffer(next);
			sounds.newOrder();
			navigator.vibrate?.([
				200,
				100,
				200
			]);
		}
	}, [available]);
	(0, import_react.useEffect)(() => {
		loadAudioSettings();
		const handler = () => primeAudio();
		window.addEventListener("pointerdown", handler, { once: true });
		return () => window.removeEventListener("pointerdown", handler);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!user || !rider?.is_approved) return;
		const channel = supabase.channel(`rider-dispatch-rt-${user.id}`).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "orders"
		}, (payload) => {
			const next = payload.new ?? {};
			if (payload.eventType === "UPDATE" && next.status === "dispatched") {
				sounds.newOrder();
				toast.success(`New order available: ${next.order_code ?? ""}`);
			}
			qc.invalidateQueries({ queryKey: ["rider-available"] });
		}).on("postgres_changes", {
			event: "UPDATE",
			schema: "public",
			table: "orders",
			filter: `rider_id=eq.${user.id}`
		}, (payload) => {
			const next = payload.new;
			sounds.statusUpdate();
			qc.invalidateQueries({ queryKey: ["rider-orders"] });
			if (next.status === "delivered") qc.invalidateQueries({ queryKey: ["rider-earnings"] });
			if (next.payment_status === "paid") sounds.payment();
		}).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "payout_requests",
			filter: `rider_id=eq.${user.id}`
		}, (payload) => {
			if ((payload.new ?? {}).status === "paid") {
				sounds.payment();
				toast.success("Your payout was sent!");
			}
			qc.invalidateQueries({ queryKey: ["rider-payouts"] });
			qc.invalidateQueries({ queryKey: ["rider-earnings"] });
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [
		user,
		rider?.is_approved,
		qc
	]);
	(0, import_react.useEffect)(() => {
		if (!user || !rider?.is_online || !navigator.geolocation) return;
		let batteryLevel = null;
		navigator.getBattery?.().then((b) => {
			batteryLevel = Math.round(b.level * 100);
		});
		let lastWrite = 0;
		const id = navigator.geolocation.watchPosition((pos) => {
			const now = Date.now();
			if (now - lastWrite < 5e3) return;
			lastWrite = now;
			supabase.from("riders").update({
				lat: pos.coords.latitude,
				lng: pos.coords.longitude,
				speed: pos.coords.speed,
				battery: batteryLevel,
				location_updated_at: (/* @__PURE__ */ new Date()).toISOString()
			}).eq("id", user.id);
		}, () => void 0, {
			enableHighAccuracy: true,
			maximumAge: 4e3
		});
		return () => navigator.geolocation.clearWatch(id);
	}, [user, rider?.is_online]);
	if (!user || !isRider) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "py-16 text-center text-muted-foreground",
		children: "Loading…"
	});
	const setVehicle = async (vehicle) => {
		const { error } = await supabase.from("riders").update({ vehicle_type: vehicle }).eq("id", user.id);
		if (error) toast.error(error.message);
		else {
			toast.success(`Vehicle set to ${vehicle}`);
			qc.invalidateQueries({ queryKey: ["rider-me"] });
		}
	};
	const toggleOnline = async (value) => {
		await supabase.from("riders").update({ is_online: value }).eq("id", user.id);
		qc.invalidateQueries({ queryKey: ["rider-me"] });
	};
	const acceptOrder = async (orderId) => {
		const { error } = await supabase.rpc("accept_order", { _order_id: orderId });
		setOffer(null);
		if (error) {
			toast.error("Too late — another rider accepted this order.");
			qc.invalidateQueries({ queryKey: ["rider-available"] });
			return;
		}
		sounds.newOrder();
		toast.success("Order accepted — head to the pickup point!");
		setTab("home");
		qc.invalidateQueries({ queryKey: ["rider-available"] });
		qc.invalidateQueries({ queryKey: ["rider-orders"] });
		qc.invalidateQueries({ queryKey: ["rider-offer-events"] });
	};
	const declineOrder = async (orderId) => {
		setOffer(null);
		await supabase.from("rider_offer_events").upsert({
			order_id: orderId,
			rider_id: user.id,
			event: "declined"
		}, { onConflict: "order_id,rider_id" });
		qc.invalidateQueries({ queryKey: ["rider-offer-events"] });
	};
	const setStatus = async (order, status) => {
		const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
		if (error) {
			toast.error(error.message);
			return;
		}
		await notify(order.customer_id, `Order ${order.order_code} updated`, STATUS_LABEL[status], "order", order.id);
		sounds.statusUpdate();
		qc.invalidateQueries({ queryKey: ["rider-orders"] });
	};
	const avgRating = ratings.length > 0 ? Math.round(ratings.reduce((s, r) => s + r.rating, 0) / ratings.length * 100) / 100 : null;
	const today = /* @__PURE__ */ new Date();
	today.setHours(0, 0, 0, 0);
	const todayEarnings = earnings.filter((e) => new Date(e.created_at) >= today);
	const todayTotal = todayEarnings.reduce((s, e) => s + Number(e.amount), 0);
	const todayKm = todayEarnings.reduce((s, e) => s + Number(e.distance_km), 0);
	const deliveredCount = orders.filter((o) => o.status === "delivered").length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto min-h-screen max-w-lg bg-surface pb-24",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "sticky top-0 z-20 border-b border-border bg-card px-4 pb-3 pt-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiderAvatar, {
							path: profile?.avatar_url,
							name: profile?.full_name,
							size: "lg"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate font-display text-base font-bold",
								children: profile?.full_name || "Rider"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 flex flex-wrap items-center gap-1.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "h-3 w-3 fill-warning text-warning" }), avgRating != null ? `${avgRating.toFixed(2)} (${ratings.length})` : "New rider"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground",
										children: [
											deliveredCount,
											" trip",
											deliveredCount === 1 ? "" : "s"
										]
									}),
									rider?.vehicle_type ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: rider.vehicle_type,
										onValueChange: (v) => void setVehicle(v),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectTrigger, {
											className: "h-6 w-auto gap-1 rounded-full border-none bg-secondary px-2 py-0.5 text-[11px] font-semibold capitalize text-secondary-foreground",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bike, { className: "h-3 w-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "bicycle",
												children: "Bicycle"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "motorbike",
												children: "Motorbike"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "scooter",
												children: "Scooter"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "car",
												children: "Car"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "foot",
												children: "On foot"
											})
										] })]
									}) : null,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TierBadge, { tier: rider?.commission_tier })
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `text-[10px] font-extrabold tracking-wide ${rider?.is_online ? "text-primary" : "text-muted-foreground"}`,
								children: rider?.is_online ? "ONLINE" : "OFFLINE"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								checked: !!rider?.is_online,
								onCheckedChange: (v) => void toggleOnline(v)
							})]
						})
					]
				})
			}),
			dispatchPaused && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-4 mt-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs font-medium",
				children: "Dispatch is paused platform-wide — no new orders until operations resume."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "px-4 py-4",
				children: [
					tab === "home" && (activeOrder ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActiveTripCard, { order: activeOrder }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeliveryFlow, {
							order: activeOrder,
							onStatus: (s) => void setStatus(activeOrder, s)
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IdleDashboard, {
						online: !!rider?.is_online,
						todayTotal,
						trips: todayEarnings.length,
						distanceKm: todayKm,
						availableCount: available.length,
						onBrowse: () => setTab("orders")
					})),
					tab === "orders" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrdersTab, {
						available,
						active: activeOrders,
						online: !!rider?.is_online,
						onAccept: (o) => setOffer(o),
						onOpenTrip: () => setTab("home")
					}),
					tab === "earnings" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EarningsTab, {
						earnings,
						payouts,
						userId: user.id
					}),
					tab === "profile" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileTab, {
						rider: rider ?? null,
						name: profile?.full_name ?? ""
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-border bg-card",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-4",
					children: [
						{
							id: "home",
							label: "Home",
							icon: House
						},
						{
							id: "orders",
							label: "Orders",
							icon: ClipboardList
						},
						{
							id: "earnings",
							label: "Earnings",
							icon: Wallet
						},
						{
							id: "profile",
							label: "Profile",
							icon: User
						}
					].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setTab(item.id),
						className: `flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${tab === item.id ? "text-primary" : "text-muted-foreground"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, { className: "h-5 w-5" }), item.label]
					}, item.id))
				})
			}),
			offer && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IncomingOrderModal, {
				order: offer,
				onAccept: () => void acceptOrder(offer.id),
				onDecline: () => void declineOrder(offer.id)
			})
		]
	});
}
function IdleDashboard({ online, todayTotal, trips, distanceKm, availableCount, onBrowse }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl bg-primary p-5 text-primary-foreground shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm opacity-90",
						children: online ? "You are Online — searching for orders near Bishoftu…" : "You are offline"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 font-display text-3xl font-extrabold",
						children: ETB(todayTotal)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs opacity-90",
						children: "Today's earnings"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-card p-4 shadow-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs uppercase tracking-wide text-muted-foreground",
						children: "Trips completed"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 font-display text-2xl font-extrabold",
						children: trips
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-card p-4 shadow-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs uppercase tracking-wide text-muted-foreground",
						children: "Distance covered"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 font-display text-2xl font-extrabold",
						children: [Math.round(distanceKm * 10) / 10, " km"]
					})]
				})]
			}),
			online && availableCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				className: "w-full",
				size: "lg",
				onClick: onBrowse,
				children: [
					availableCount,
					" order",
					availableCount === 1 ? "" : "s",
					" available — view now"
				]
			})
		]
	});
}
function IncomingOrderModal({ order, onAccept, onDecline }) {
	const [secondsLeft, setSecondsLeft] = (0, import_react.useState)(15);
	const declinedRef = (0, import_react.useRef)(false);
	const { data: shop } = useQuery({
		queryKey: ["offer-shop", order.shop_id],
		enabled: !!order.shop_id,
		queryFn: async () => {
			const { data } = await supabase.from("shops").select("name,address,lat,lng").eq("id", order.shop_id).maybeSingle();
			return data;
		}
	});
	(0, import_react.useEffect)(() => {
		const id = setInterval(() => setSecondsLeft((s) => s - 1), 1e3);
		return () => clearInterval(id);
	}, []);
	(0, import_react.useEffect)(() => {
		if (secondsLeft <= 0 && !declinedRef.current) {
			declinedRef.current = true;
			onDecline();
		}
	}, [secondsLeft, onDecline]);
	const distanceKm = shop?.lat != null && shop?.lng != null && order.lat != null && order.lng != null ? haversineKm(shop.lat, shop.lng, order.lat, order.lng) : null;
	const etaMins = distanceKm != null ? Math.max(Math.round(distanceKm / 25 * 60), 3) : null;
	const pct = Math.max(secondsLeft / 15, 0);
	const R = 26;
	const C = 2 * Math.PI * R;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-50 flex flex-col bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between border-b border-border px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-lg font-extrabold",
					children: "New order request"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onDecline,
					"aria-label": "Decline",
					className: "rounded-md p-1.5 hover:bg-secondary",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-1 flex-col items-center justify-center gap-5 px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
						width: "72",
						height: "72",
						viewBox: "0 0 72 72",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "36",
							cy: "36",
							r: R,
							fill: "none",
							stroke: "#e2e8f0",
							strokeWidth: "6"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "36",
							cy: "36",
							r: R,
							fill: "none",
							stroke: secondsLeft <= 5 ? "#dc2626" : "#059669",
							strokeWidth: "6",
							strokeLinecap: "round",
							strokeDasharray: C,
							strokeDashoffset: C * (1 - pct),
							transform: "rotate(-90 36 36)"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "absolute inset-0 flex items-center justify-center font-display text-xl font-extrabold",
						children: Math.max(secondsLeft, 0)
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-sm space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "flex items-start gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "mt-0.5 h-4 w-4 shrink-0 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-xs text-muted-foreground",
									children: "Pickup"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-semibold",
									children: shop?.name ?? "Merchant"
								}),
								shop?.address && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-xs text-muted-foreground",
									children: shop.address
								})
							] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "flex items-start gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigation, { className: "mt-0.5 h-4 w-4 shrink-0 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-xs text-muted-foreground",
								children: "Deliver to"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold",
								children: order.delivery_address
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-3 gap-2 border-t border-border pt-3 text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "Distance"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display font-bold",
									children: distanceKm != null ? `${distanceKm} km` : "—"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "Est. time"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display font-bold",
									children: etaMins != null ? `${etaMins} min` : "—"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "You earn"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display font-bold text-primary",
									children: ETB(order.rider_payout || order.delivery_fee)
								})] })
							]
						}),
						Number(order.tip) > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "rounded-lg bg-primary-soft p-2 text-center text-xs font-semibold text-accent-foreground",
							children: ["Customer tip included: ", ETB(order.tip)]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2 border-t border-border bg-card p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "lg",
					className: "h-14 w-full text-base font-extrabold",
					onClick: onAccept,
					children: "ACCEPT ORDER"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "lg",
					variant: "outline",
					className: "w-full",
					onClick: onDecline,
					children: "Decline"
				})]
			})
		]
	});
}
function DeliveryFlow({ order, onStatus }) {
	const [pin, setPin] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const { data: shop } = useQuery({
		queryKey: ["flow-shop", order.shop_id],
		enabled: !!order.shop_id,
		queryFn: async () => {
			const { data } = await supabase.from("shops").select("name,address,lat,lng,phone").eq("id", order.shop_id).maybeSingle();
			return data;
		}
	});
	const { data: items = [] } = useQuery({
		queryKey: ["flow-items", order.id],
		queryFn: async () => {
			const { data } = await supabase.from("order_items").select("id,product_name,quantity,unit_price").eq("order_id", order.id);
			return data ?? [];
		}
	});
	const navigateUrl = (lat, lng) => lat != null && lng != null ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null;
	const completeDelivery = async () => {
		setBusy(true);
		const { error } = await supabase.rpc("complete_delivery", {
			_order_id: order.id,
			_pin: pin.trim()
		});
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Delivery completed — earnings updated!");
		setPin("");
	};
	const stage = order.status === "accepted" ? 1 : order.status === "arrived_at_merchant" ? 2 : order.status === "picked_up" ? 3 : 4;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display font-bold",
					children: order.order_code
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-muted-foreground",
					children: [
						ETB(order.total),
						" · ",
						order.payment_method,
						" · ",
						order.payment_status
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-accent-foreground",
					children: STATUS_LABEL[order.status] ?? order.status
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "flex items-center gap-1",
				children: [
					1,
					2,
					3,
					4
				].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { className: `h-1.5 flex-1 rounded-full ${s <= stage ? "bg-primary" : "bg-muted"}` }, s))
			}),
			stage === 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-lg font-bold",
						children: "Stage 1 · Head to the merchant"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "flex items-start gap-2 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "mt-0.5 h-4 w-4 shrink-0 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-semibold",
							children: shop?.name ?? "Merchant"
						}), shop?.address && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-muted-foreground",
							children: shop.address
						})] })]
					}),
					navigateUrl(shop?.lat, shop?.lng) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						className: "w-full",
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: navigateUrl(shop?.lat, shop?.lng),
							target: "_blank",
							rel: "noreferrer",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigation, { className: "mr-2 h-4 w-4" }), " NAVIGATE"]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "lg",
						className: "h-14 w-full text-base font-extrabold",
						onClick: () => onStatus("arrived_at_merchant"),
						children: "ARRIVED AT MERCHANT"
					})
				]
			}),
			stage === 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-lg font-bold",
						children: "Stage 2 · Verify the pickup"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-2",
						children: items.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center justify-between rounded-lg border border-border p-3 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								i.quantity,
								"× ",
								i.product_name
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackageCheck, { className: "h-4 w-4 text-primary" })]
						}, i.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "lg",
						className: "h-14 w-full text-base font-extrabold",
						onClick: () => onStatus("picked_up"),
						children: "PICKED UP ORDER"
					})
				]
			}),
			stage === 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-lg font-bold",
						children: "Stage 3 · Deliver to the customer"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold",
								children: order.customer_name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-muted-foreground",
								children: order.delivery_address
							}),
							order.delivery_instructions && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-1 block rounded-lg bg-surface p-2 text-xs",
								children: order.delivery_instructions
							})
						]
					}),
					order.customer_phone && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						className: "w-full",
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: `tel:${order.customer_phone}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "mr-2 h-4 w-4" }), " Call customer"]
						})
					}),
					navigateUrl(order.lat, order.lng) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						className: "w-full",
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: navigateUrl(order.lat, order.lng),
							target: "_blank",
							rel: "noreferrer",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigation, { className: "mr-2 h-4 w-4" }), " NAVIGATE TO CUSTOMER"]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "lg",
						className: "h-14 w-full text-base font-extrabold",
						onClick: () => onStatus("on_the_way"),
						children: "ON THE WAY"
					})
				]
			}),
			stage === 4 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-lg font-bold",
						children: "Stage 4 · Confirm delivery"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "Ask the customer for their 4-digit delivery PIN to complete this order."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						inputMode: "numeric",
						maxLength: 4,
						value: pin,
						onChange: (e) => setPin(e.target.value.replace(/\D/g, "")),
						placeholder: "••••",
						className: "h-14 w-full rounded-xl border border-input bg-background text-center font-display text-2xl font-extrabold tracking-[0.5em] outline-none focus:border-primary"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "lg",
						className: "h-14 w-full text-base font-extrabold",
						disabled: busy || pin.length < 4,
						onClick: () => void completeDelivery(),
						children: busy ? "Completing…" : "COMPLETE DELIVERY"
					})
				]
			})
		]
	});
}
function OrdersTab({ available, active, online, onAccept, onOpenTrip }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [active.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-base font-bold",
			children: "Active delivery"
		}), active.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-2 rounded-xl border border-primary/40 bg-primary-soft p-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold",
						children: o.order_code
					}),
					" —",
					" ",
					STATUS_LABEL[o.status] ?? o.status
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				className: "mt-2 w-full",
				onClick: onOpenTrip,
				children: "Resume trip"
			})]
		}, o.id))] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-base font-bold",
			children: "Available orders"
		}), !online ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-muted-foreground",
			children: "Go online to receive dispatched orders."
		}) : available.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-muted-foreground",
			children: "No orders right now — you'll get a loud alert when one is dispatched."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-2 space-y-3",
			children: available.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "rounded-xl border border-border bg-card p-4 shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display font-bold",
							children: o.order_code
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-semibold text-primary",
							children: ETB(o.rider_payout || o.delivery_fee)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 flex items-start gap-1.5 text-sm text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "mt-0.5 h-4 w-4 shrink-0" }), o.delivery_address]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: [
							ETB(o.total),
							" · ",
							o.payment_method,
							" · Dispatched",
							" ",
							formatDate(o.dispatched_at ?? o.created_at)
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "mt-3 w-full",
						onClick: () => onAccept(o),
						children: "View & accept"
					})
				]
			}, o.id))
		})] })]
	});
}
var startOfWeek = (d) => {
	const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
	return /* @__PURE__ */ new Date(day.getTime() - (day.getDay() + 6) % 7 * 864e5);
};
var WALLET_PERIODS = [
	{
		key: "day",
		label: "Today"
	},
	{
		key: "week",
		label: "This week"
	},
	{
		key: "month",
		label: "This month"
	}
];
function EarningsTab({ earnings, payouts, userId }) {
	const qc = useQueryClient();
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [period, setPeriod] = (0, import_react.useState)("day");
	const now = /* @__PURE__ */ new Date();
	const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const weekStart = startOfWeek(now);
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const sum = (list, key) => list.reduce((s, e) => s + Number(e[key]), 0);
	const inRange = (from) => earnings.filter((e) => new Date(e.created_at) >= from);
	const inPeriod = inRange(period === "day" ? dayStart : period === "week" ? weekStart : monthStart);
	const periodTrips = inPeriod.length;
	const tips = sum(inPeriod, "tip");
	const bonus = sum(inPeriod, "bonus");
	const commission = sum(inPeriod, "base_fare") + sum(inPeriod, "distance_incentive");
	const netPay = sum(inPeriod, "amount") - tips - bonus;
	const pendingPayout = earnings.filter((e) => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0);
	const requestPayout = async () => {
		setBusy(true);
		try {
			const { data: payout, error } = await supabase.from("payout_requests").insert({
				rider_id: userId,
				amount: pendingPayout
			}).select("id").single();
			if (error) throw error;
			const { error: linkError } = await supabase.from("rider_earnings").update({
				status: "requested",
				payout_request_id: payout.id
			}).eq("rider_id", userId).eq("status", "pending");
			if (linkError) throw linkError;
			toast.success("Instant payout requested to your Telebirr / bank account.");
			qc.invalidateQueries({ queryKey: ["rider-earnings"] });
			qc.invalidateQueries({ queryKey: ["rider-payouts"] });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not request payout");
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-border bg-card p-4 shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-3 gap-1 rounded-xl bg-surface p-1",
						children: WALLET_PERIODS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setPeriod(p.key),
							className: `rounded-lg py-1.5 text-xs font-semibold transition-colors ${period === p.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
							children: p.label
						}, p.key))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs uppercase tracking-wide text-muted-foreground",
								children: "Net pay"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 font-display text-3xl font-extrabold",
								children: ETB(netPay)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted-foreground",
								children: [
									periodTrips,
									" trip",
									periodTrips === 1 ? "" : "s",
									" ·",
									" ",
									WALLET_PERIODS.find((p) => p.key === period).label.toLowerCase()
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "mt-4 grid grid-cols-2 gap-2 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl bg-surface p-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-xs text-muted-foreground",
									children: "Tips"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "mt-0.5 font-display font-bold",
									children: ETB(tips)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl bg-surface p-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-xs text-muted-foreground",
									children: "Bonuses"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "mt-0.5 font-display font-bold",
									children: ETB(bonus)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl bg-surface p-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-xs text-muted-foreground",
									children: "Base + distance"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "mt-0.5 font-display font-bold",
									children: ETB(commission)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl bg-surface p-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-xs text-muted-foreground",
									children: "Gross total"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "mt-0.5 font-display font-bold",
									children: ETB(sum(inPeriod, "amount"))
								})]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between rounded-2xl bg-primary p-5 text-primary-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs opacity-90",
					children: "Available for cashout"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-2xl font-extrabold",
					children: ETB(pendingPayout)
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					disabled: pendingPayout <= 0 || busy,
					onClick: () => void requestPayout(),
					children: busy ? "Requesting…" : "Instant payout"
				})]
			}),
			payouts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-display text-base font-bold",
				children: "Payout requests"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 space-y-2",
				children: payouts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-semibold",
						children: ETB(p.amount)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: formatDate(p.created_at)
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `rounded-full px-2 py-1 text-xs font-semibold ${p.status === "paid" ? "bg-primary-soft text-accent-foreground" : p.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`,
						children: p.status
					})]
				}, p.id))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-display text-base font-bold",
				children: "Earning history"
			}), earnings.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted-foreground",
				children: "Complete a delivery to start earning."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 space-y-2",
				children: earnings.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-xl border border-border bg-card p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-semibold",
							children: ETB(e.amount)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-muted-foreground",
							children: formatDate(e.created_at)
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: [
							"Base ",
							ETB(e.base_fare),
							Number(e.distance_incentive) > 0 && ` · Distance ${ETB(e.distance_incentive)} (${e.distance_km} km)`,
							Number(e.tip) > 0 && ` · Tip ${ETB(e.tip)}`,
							Number(e.bonus) > 0 && ` · Bonus ${ETB(e.bonus)}`
						]
					})]
				}, e.id))
			})] })
		]
	});
}
function ProfileTab({ rider, name }) {
	const { profile } = useAuth();
	const [editOpen, setEditOpen] = (0, import_react.useState)(false);
	if (!rider) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted-foreground",
		children: "Loading…"
	});
	const rows = [
		["Name", name],
		["Phone", profile?.phone ?? "—"],
		["Vehicle", String(rider["vehicle_type"] ?? "—")],
		["National ID", String(rider["national_id"] ?? "—")],
		["Verification", String(rider["verification_status"] ?? "pending_verification").replace(/_/g, " ")],
		["Payout", `${String(rider["payout_method"] ?? "telebirr").replace("_", " ")} · ${String(rider["payout_account"] ?? "—")}`]
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-2xl border border-border bg-card p-5 shadow-card",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiderAvatar, {
							path: profile?.avatar_url,
							name,
							size: "xl"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "truncate font-display text-lg font-bold",
									children: name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "flex items-center gap-1 text-xs capitalize text-muted-foreground",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bike, { className: "h-3.5 w-3.5" }),
										" ",
										String(rider["vehicle_type"] ?? ""),
										" rider"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1.5",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TierBadge, { tier: rider["commission_tier"] })
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "sm",
							variant: "outline",
							onClick: () => setEditOpen(true),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "mr-1.5 h-3.5 w-3.5" }), " Edit"]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
				className: "divide-y divide-border rounded-2xl border border-border bg-card shadow-card",
				children: rows.map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-4 py-3 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-muted-foreground",
						children: k
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "font-medium capitalize",
						children: v
					})]
				}, k))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditProfileDrawer, {
				rider,
				open: editOpen,
				onOpenChange: setEditOpen
			})
		]
	});
}
var VEHICLE_TYPES = [
	{
		value: "motorcycle",
		label: "Motorcycle"
	},
	{
		value: "bicycle",
		label: "Bicycle"
	},
	{
		value: "car",
		label: "Car"
	}
];
function EditProfileDrawer({ rider, open, onOpenChange }) {
	const { user, profile, refresh } = useAuth();
	const qc = useQueryClient();
	const fileRef = (0, import_react.useRef)(null);
	const [fullName, setFullName] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [vehicleType, setVehicleType] = (0, import_react.useState)("motorcycle");
	const [payoutMethod, setPayoutMethod] = (0, import_react.useState)("telebirr");
	const [payoutAccount, setPayoutAccount] = (0, import_react.useState)("");
	const [payoutAccountName, setPayoutAccountName] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		setFullName(profile?.full_name ?? "");
		setPhone(profile?.phone ?? "");
		setVehicleType(String(rider["vehicle_type"] ?? "motorcycle"));
		setPayoutMethod(String(rider["payout_method"] ?? "telebirr"));
		setPayoutAccount(String(rider["payout_account"] ?? ""));
		setPayoutAccountName(String(rider["payout_account_name"] ?? ""));
	}, [
		open,
		profile,
		rider
	]);
	const uploadAvatar = async (file) => {
		if (!user) return;
		try {
			const path = await uploadImage(file, "avatars");
			const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
			if (error) throw error;
			await refresh();
			toast.success("Profile photo updated");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not upload photo");
		}
	};
	const save = async (e) => {
		e.preventDefault();
		if (!user) return;
		if (!fullName.trim()) {
			toast.error("Your name is required");
			return;
		}
		setBusy(true);
		const [{ error: profileError }, { error: riderError }] = await Promise.all([supabase.from("profiles").update({
			full_name: fullName.trim(),
			phone: phone.trim() || null
		}).eq("id", user.id), supabase.from("riders").update({
			vehicle_type: vehicleType,
			payout_method: payoutMethod,
			payout_account: payoutAccount.trim() || null,
			payout_account_name: payoutAccountName.trim() || null
		}).eq("id", user.id)]);
		setBusy(false);
		if (profileError || riderError) {
			toast.error(profileError?.message ?? riderError?.message ?? "Could not save profile");
			return;
		}
		await refresh();
		qc.invalidateQueries({ queryKey: ["rider-me"] });
		toast.success("Profile updated");
		onOpenChange(false);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetContent, {
			side: "bottom",
			className: "max-h-[88vh] overflow-y-auto rounded-t-3xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTitle, { children: "Edit profile" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetDescription, { children: "Update your details, vehicle and payout preferences." })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiderAvatar, {
							path: profile?.avatar_url,
							name: profile?.full_name,
							size: "lg"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							ref: fileRef,
							type: "file",
							accept: "image/jpeg,image/png,image/webp,image/gif",
							className: "hidden",
							onChange: (e) => {
								const file = e.target.files?.[0];
								if (file) uploadAvatar(file);
								e.target.value = "";
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "button",
							variant: "outline",
							size: "sm",
							onClick: () => fileRef.current?.click(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "mr-1.5 h-4 w-4" }), " Change photo"]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: save,
					className: "mt-5 space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "full-name",
								children: "Full name"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "full-name",
								value: fullName,
								onChange: (e) => setFullName(e.target.value),
								placeholder: "Your full name"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "phone",
								children: "Phone number"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "phone",
								inputMode: "tel",
								value: phone,
								onChange: (e) => setPhone(e.target.value),
								placeholder: "+251 …"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Vehicle type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: vehicleType,
								onValueChange: setVehicleType,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: VEHICLE_TYPES.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: v.value,
									children: v.label
								}, v.value)) })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3 rounded-2xl border border-border p-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-semibold",
									children: "Payout preferences"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Payout method" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: payoutMethod,
										onValueChange: setPayoutMethod,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "telebirr",
											children: "Telebirr"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "bank_account",
											children: "CBE / bank account"
										})] })]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "payout-account",
										children: payoutMethod === "telebirr" ? "Telebirr number" : "Account number"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "payout-account",
										value: payoutAccount,
										onChange: (e) => setPayoutAccount(e.target.value),
										placeholder: payoutMethod === "telebirr" ? "09…" : "1000…"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "payout-account-name",
										children: "Account holder name"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "payout-account-name",
										value: payoutAccountName,
										onChange: (e) => setPayoutAccountName(e.target.value),
										placeholder: "Name on the account"
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							size: "lg",
							className: "h-12 w-full font-extrabold",
							disabled: busy,
							children: busy ? "Saving…" : "Save changes"
						})
					]
				})
			]
		})
	});
}
//#endregion
export { RiderPortalPage as component };
