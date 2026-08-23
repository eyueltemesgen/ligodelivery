import { i as __toESM } from "../_runtime.mjs";
import { r as supabase } from "./client-D2C38fHY.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { D as NotebookText, G as CircleX, U as ClipboardList, V as FileText, p as Star, q as CircleCheck, r as Wallet, tt as Bike } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as Button, d as formatDate, g as useMediaUrl, i as STATUS_LABEL, l as ETB, n as IdentityAvatar, o as notify, s as statusTone } from "./router-D937WmAP.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-CwLzEEob.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, o as TierBadge, r as SelectItem, t as Select } from "./select-BmOrbPme.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.riders-BPfJfCpQ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Admin-side rider dossier: lifetime stats, delivery history, earnings
* ledger summary and offer acceptance behaviour for one rider.
*/
function RiderDossier({ riderId, riderName, identity, open, onOpenChange }) {
	const { data } = useQuery({
		queryKey: ["rider-dossier", riderId],
		enabled: open && !!riderId,
		queryFn: async () => {
			const [orders, earnings, ratings, offers, payouts] = await Promise.all([
				supabase.from("orders").select("id,order_code,status,total,created_at").eq("rider_id", riderId).order("created_at", { ascending: false }).limit(10),
				supabase.from("rider_earnings").select("amount,base_fare,tip,bonus,distance_incentive,distance_km,status").eq("rider_id", riderId),
				supabase.from("rider_ratings").select("rating").eq("rider_id", riderId),
				supabase.from("rider_offer_events").select("event").eq("rider_id", riderId),
				supabase.from("payout_requests").select("id,amount,status,created_at,processed_at").eq("rider_id", riderId).order("created_at", { ascending: false }).limit(8)
			]);
			const earningsRows = earnings.data ?? [];
			const ratingRows = ratings.data ?? [];
			const offerRows = offers.data ?? [];
			const totalEarnings = earningsRows.reduce((s, e) => s + Number(e.amount), 0);
			const pendingEarnings = earningsRows.filter((e) => e.status !== "paid").reduce((s, e) => s + Number(e.amount), 0);
			const totalKm = earningsRows.reduce((s, e) => s + Number(e.distance_km), 0);
			const accepted = offerRows.filter((o) => o.event === "accepted").length;
			const declined = offerRows.filter((o) => o.event === "declined").length;
			const acceptanceRate = accepted + declined > 0 ? Math.round(accepted / (accepted + declined) * 100) : null;
			const avgRating = ratingRows.length > 0 ? ratingRows.reduce((s, r) => s + r.rating, 0) / ratingRows.length : null;
			return {
				deliveries: earningsRows.length,
				totalEarnings,
				pendingEarnings,
				totalKm,
				avgRating,
				ratingCount: ratingRows.length,
				accepted,
				declined,
				acceptanceRate,
				recentOrders: orders.data ?? [],
				payoutRequests: payouts.data ?? []
			};
		}
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "sm:max-w-2xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Rider dossier" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Delivery history, earnings, customer ratings and dispatch behaviour." })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3 rounded-lg border border-border bg-surface p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IdentityAvatar, {
								path: identity?.avatarUrl,
								name: riderName,
								className: "h-12 w-12 text-base"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								"aria-label": identity?.isOnline ? "Online" : "Offline",
								className: `absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${identity?.isOnline ? "bg-primary" : "bg-muted-foreground/40"}`
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate font-display font-bold",
								children: riderName
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs capitalize text-muted-foreground",
								children: [
									identity?.isOnline ? "Online now" : "Offline",
									" · ",
									identity?.vehicleType ?? "—"
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col items-end gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${identity?.verificationStatus === "approved" ? "bg-primary-soft text-accent-foreground" : "bg-warning/20 text-warning-foreground"}`,
								children: (identity?.verificationStatus ?? "pending_verification").replace(/_/g, " ")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TierBadge, { tier: identity?.commissionTier })]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-3 sm:grid-cols-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							icon: ClipboardList,
							label: "Deliveries",
							value: String(data?.deliveries ?? 0),
							hint: `${(data?.totalKm ?? 0).toFixed(1)} km covered`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							icon: Wallet,
							label: "Total earnings",
							value: ETB(data?.totalEarnings ?? 0),
							hint: `${ETB(data?.pendingEarnings ?? 0)} unpaid`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							icon: Star,
							label: "Rating",
							value: data?.avgRating != null ? `${data.avgRating.toFixed(2)} ★` : "—",
							hint: `${data?.ratingCount ?? 0} customer ratings`
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-2 text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bike, { className: "h-4 w-4" }), " Offer acceptance"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold",
						children: data?.acceptanceRate != null ? `${data.acceptanceRate}% (${data.accepted} accepted · ${data.declined} declined)` : "No offers yet"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
					children: "Payout requests"
				}), data?.payoutRequests.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "max-h-36 space-y-1.5 overflow-y-auto",
					children: data.payoutRequests.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold",
								children: ETB(p.amount)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${p.status === "paid" ? "bg-primary-soft text-accent-foreground" : p.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`,
								children: p.status
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "ml-auto text-xs text-muted-foreground",
								children: [formatDate(p.created_at), p.processed_at ? ` · processed ${formatDate(p.processed_at)}` : ""]
							})
						]
					}, p.id))
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "No payout requests yet."
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
					children: "Recent deliveries"
				}), data?.recentOrders.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "max-h-56 space-y-1.5 overflow-y-auto",
					children: data.recentOrders.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-xs font-semibold",
								children: o.order_code
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(o.status)}`,
								children: STATUS_LABEL[o.status] ?? o.status
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ml-auto font-medium",
								children: ETB(o.total)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs text-muted-foreground",
								children: formatDate(o.created_at)
							})
						]
					}, o.id))
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "No deliveries recorded yet."
				})] })
			]
		})
	});
}
function Stat({ icon: Icon, label, value, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-border bg-card p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-wide text-muted-foreground",
					children: label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4 text-primary" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-display text-lg font-extrabold",
				children: value
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted-foreground",
				children: hint
			})
		]
	});
}
var COMMISSION_TIERS = [
	{
		key: "standard",
		label: "Standard"
	},
	{
		key: "silver",
		label: "Silver"
	},
	{
		key: "gold",
		label: "Gold"
	}
];
var STATUS_BADGE = {
	pending_verification: {
		label: "Pending review",
		className: "bg-warning/20 text-warning-foreground"
	},
	approved: {
		label: "Approved",
		className: "bg-primary-soft text-accent-foreground"
	},
	rejected: {
		label: "Rejected",
		className: "bg-destructive/10 text-destructive"
	}
};
function RiderApprovalQueue() {
	const qc = useQueryClient();
	const [rejectTarget, setRejectTarget] = (0, import_react.useState)(null);
	const [dossierTarget, setDossierTarget] = (0, import_react.useState)(null);
	const { data: riders = [] } = useQuery({
		queryKey: ["admin-riders-full"],
		queryFn: async () => {
			const { data } = await supabase.from("riders").select("*");
			const ids = (data ?? []).map((r) => r.id);
			const { data: profiles } = ids.length ? await supabase.from("profiles").select("id,full_name,phone,email,avatar_url").in("id", ids) : { data: [] };
			return (data ?? []).map((r) => ({
				...r,
				profile: profiles?.find((p) => p.id === r.id)
			})).sort((a, b) => {
				const rank = (r) => r.verification_status === "pending_verification" ? 0 : 1;
				return rank(a) - rank(b) || b.created_at.localeCompare(a.created_at);
			});
		}
	});
	(0, import_react.useEffect)(() => {
		const channel = supabase.channel("admin-riders-rt").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "riders"
		}, () => {
			qc.invalidateQueries({ queryKey: ["admin-riders-full"] });
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [qc]);
	const approve = async (r) => {
		const { error } = await supabase.from("riders").update({
			is_approved: true,
			verification_status: "approved",
			review_notes: null
		}).eq("id", r.id);
		if (error) {
			toast.error(error.message);
			return;
		}
		await notify(r.id, "Rider approved", "You're verified! Go online to start receiving orders.", "rider");
		qc.invalidateQueries({ queryKey: ["admin-riders-full"] });
		toast.success("Rider approved — they can now go online");
	};
	const setCommissionTier = async (r, tier) => {
		const { error } = await supabase.from("riders").update({ commission_tier: tier }).eq("id", r.id);
		if (error) {
			toast.error(error.message);
			return;
		}
		qc.invalidateQueries({ queryKey: ["admin-riders-full"] });
		toast.success(`Commission tier set to ${COMMISSION_TIERS.find((t) => t.key === tier)?.label ?? tier}`);
	};
	const pendingCount = riders.filter((r) => r.verification_status === "pending_verification").length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-sm text-muted-foreground",
			children: [
				pendingCount,
				" application",
				pendingCount === 1 ? "" : "s",
				" awaiting review"
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 space-y-3",
			children: [riders.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "No rider applications yet."
			}), riders.map((r) => {
				const badge = STATUS_BADGE[r.verification_status] ?? STATUS_BADGE["pending_verification"];
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-card p-4 shadow-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-start justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IdentityAvatar, {
										path: r.profile?.avatar_url,
										name: r.profile?.full_name,
										className: "h-11 w-11 text-base"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										"aria-label": r.is_online ? "Online" : "Offline",
										className: `absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${r.is_online ? "bg-primary" : "bg-muted-foreground/40"}`
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-semibold",
										children: r.profile?.full_name || "Rider"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-xs text-muted-foreground",
										children: [
											r.profile?.phone ?? "—",
											" · ",
											r.profile?.email ?? "—",
											" · joined",
											" ",
											formatDate(r.created_at)
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `inline-block h-2 w-2 rounded-full ${r.is_online ? "bg-primary" : "bg-muted-foreground/40"}` }),
											r.is_online ? "Online now" : "Offline",
											" ·",
											" ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "capitalize",
												children: r.vehicle_type
											})
										]
									})
								] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center gap-1.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `rounded-full px-2 py-1 text-xs font-semibold ${badge.className}`,
										children: badge.label
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DocTag, {
										ok: !!r.id_document_url,
										label: "ID doc"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DocTag, {
										ok: !!r.license_document_url,
										label: "License"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TierBadge, { tier: r.commission_tier })
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 grid gap-1 text-sm sm:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted-foreground",
									children: "Vehicle:"
								}),
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "capitalize",
									children: r.vehicle_type
								}),
								" ·",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted-foreground",
									children: "National ID:"
								}),
								" ",
								r.national_id || "—"
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted-foreground",
									children: "Payout:"
								}),
								" ",
								r.payout_method === "telebirr" ? "Telebirr" : "Bank account",
								" ·",
								" ",
								r.payout_account || "—",
								" (",
								r.payout_account_name || "—",
								")"
							] })]
						}),
						r.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-sm text-muted-foreground",
							children: ["Notes: ", r.notes]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex flex-wrap gap-4 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DocLink, {
								path: r.id_document_url,
								label: "National ID document"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DocLink, {
								path: r.license_document_url,
								label: "Driver's license"
							})]
						}),
						r.review_notes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive",
							children: ["Review feedback: ", r.review_notes]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									size: "sm",
									variant: "secondary",
									onClick: () => setDossierTarget(r),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotebookText, { className: "mr-2 h-4 w-4" }), " View dossier"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-muted-foreground",
										children: "Commission tier"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: r.commission_tier,
										onValueChange: (tier) => void setCommissionTier(r, tier),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
											className: "h-8 w-28 text-xs",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: COMMISSION_TIERS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: t.key,
											children: t.label
										}, t.key)) })]
									})]
								}),
								!r.is_approved && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									size: "sm",
									onClick: () => void approve(r),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "mr-2 h-4 w-4" }), " Approve rider"]
								}),
								r.is_approved && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "sm",
									variant: "outline",
									onClick: () => setRejectTarget(r),
									children: "Suspend"
								}),
								!r.is_approved && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									size: "sm",
									variant: "outline",
									onClick: () => setRejectTarget(r),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "mr-2 h-4 w-4" }), " Reject / request resubmission"]
								})
							]
						})
					]
				}, r.id);
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiderDossier, {
			riderId: dossierTarget?.id ?? null,
			riderName: dossierTarget?.profile?.full_name || "Rider",
			identity: {
				avatarUrl: dossierTarget?.profile?.avatar_url,
				vehicleType: dossierTarget?.vehicle_type,
				isOnline: dossierTarget?.is_online,
				verificationStatus: dossierTarget?.verification_status,
				commissionTier: dossierTarget?.commission_tier
			},
			open: !!dossierTarget,
			onOpenChange: (open) => !open && setDossierTarget(null)
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RejectDialog, {
			rider: rejectTarget,
			onClose: () => setRejectTarget(null),
			onDone: () => {
				setRejectTarget(null);
				qc.invalidateQueries({ queryKey: ["admin-riders-full"] });
			}
		})
	] });
}
function DocTag({ ok, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: `flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${ok ? "bg-primary-soft text-accent-foreground" : "bg-warning/20 text-warning-foreground"}`,
		children: [ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3 w-3" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-3 w-3" }), label]
	});
}
function DocLink({ path, label }) {
	const url = useMediaUrl(path);
	if (!path) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "text-muted-foreground",
		children: [label, ": —"]
	});
	if (!url) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "text-muted-foreground",
		children: [label, ": loading…"]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
		href: url,
		target: "_blank",
		rel: "noreferrer",
		className: "flex items-center gap-1 font-medium text-primary underline",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-4 w-4" }),
			" ",
			label
		]
	});
}
function RejectDialog({ rider, onClose, onDone }) {
	const [notes, setNotes] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setNotes(rider?.review_notes ?? "");
	}, [rider]);
	const submit = async (e) => {
		e.preventDefault();
		if (!rider) return;
		if (!notes.trim()) {
			toast.error("Add feedback notes so the rider knows what to fix");
			return;
		}
		setBusy(true);
		const { error } = await supabase.from("riders").update({
			is_approved: false,
			verification_status: "rejected",
			review_notes: notes.trim()
		}).eq("id", rider.id);
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		await notify(rider.id, "Rider application needs attention", `Please review and resubmit: ${notes.trim()}`, "rider");
		toast.success("Feedback sent to the rider");
		onDone();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open: !!rider,
		onOpenChange: (open) => !open && onClose(),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Reject / request resubmission" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [
			"Tell ",
			rider?.profile?.full_name || "the rider",
			" what to fix. They'll see this message on their pending-approval screen."
		] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: submit,
			className: "space-y-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: "notes",
					children: "Feedback notes"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					id: "notes",
					value: notes,
					onChange: (e) => setNotes(e.target.value),
					placeholder: "e.g. License photo is blurry — please upload a clearer picture.",
					rows: 4
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "outline",
				onClick: onClose,
				children: "Cancel"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				variant: "destructive",
				disabled: busy,
				children: busy ? "Sending…" : "Send feedback"
			})] })]
		})] })
	});
}
//#endregion
export { RiderApprovalQueue as component };
