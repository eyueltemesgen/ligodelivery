import { i as __toESM } from "../_runtime.mjs";
import { r as supabase } from "./client-D2C38fHY.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { b as ClientOnly, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { Q as Check, p as Star, s as Upload } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as Button, a as TIMELINE, c as timelineIndex, d as formatDate, h as uploadImage, i as STATUS_LABEL, l as ETB, p as PROOF_BUCKET, s as statusTone } from "./router-D937WmAP.mjs";
import { b as Route$5, d as Input, j as useAuth } from "./router-D937WmAP2.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { i as publicSettingsQuery } from "./queries-DB3Dy3Ev.mjs";
import { n as primeAudio, r as sounds, t as loadAudioSettings } from "./audio-CMj0jvPq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/orders._orderId-NH9_-7uH.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function OrderDetail() {
	const { orderId } = Route$5.useParams();
	const { user } = useAuth();
	const qc = useQueryClient();
	const { data: order } = useQuery({
		queryKey: ["order", orderId],
		queryFn: async () => {
			const { data } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
			return data;
		}
	});
	const { data: items = [] } = useQuery({
		queryKey: ["order-items", orderId],
		queryFn: async () => {
			const { data } = await supabase.from("order_items").select("*").eq("order_id", orderId);
			return data ?? [];
		}
	});
	const { data: proofs = [] } = useQuery({
		queryKey: ["proofs", orderId],
		queryFn: async () => {
			const { data } = await supabase.from("payment_proofs").select("*").eq("order_id", orderId);
			return data ?? [];
		}
	});
	const { data: rider } = useQuery({
		queryKey: ["rider", order?.rider_id],
		enabled: !!order?.rider_id,
		queryFn: async () => {
			try {
				const { data, error } = await supabase.from("riders").select("id,lat,lng,vehicle_type").eq("id", order.rider_id).maybeSingle();
				if (error) throw error;
				return data;
			} catch (err) {
				console.warn("rider telemetry unavailable, tracking shows timeline only", err);
				return null;
			}
		}
	});
	const { data: settings = {} } = useQuery(publicSettingsQuery);
	(0, import_react.useEffect)(() => {
		loadAudioSettings();
		const handler = () => primeAudio();
		window.addEventListener("pointerdown", handler, { once: true });
		return () => window.removeEventListener("pointerdown", handler);
	}, []);
	const prevStatus = (0, import_react.useRef)(null);
	const prevPayment = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const channel = supabase.channel(`order-${orderId}`).on("postgres_changes", {
			event: "UPDATE",
			schema: "public",
			table: "orders",
			filter: `id=eq.${orderId}`
		}, (payload) => {
			const next = payload.new;
			if (next.status && next.status !== prevStatus.current) {
				sounds.statusUpdate();
				prevStatus.current = next.status;
			}
			if (next.payment_status === "paid" && next.payment_status !== prevPayment.current) {
				sounds.payment();
				prevPayment.current = next.payment_status;
			}
			qc.invalidateQueries({ queryKey: ["order", orderId] });
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [orderId, qc]);
	if (!order) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "container-ligo py-16 text-muted-foreground",
		children: "Loading order…"
	});
	const currentIndex = timelineIndex(order.status);
	const payment = settings[`payment_${order.payment_method}`] ?? {};
	const needsProof = order.payment_method !== "cash" && order.payment_status !== "paid";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-ligo grid gap-8 py-10 lg:grid-cols-[1fr_360px]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/orders",
						className: "text-sm text-muted-foreground hover:text-foreground",
						children: "← All orders"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-2 font-display text-3xl font-extrabold",
						children: order.order_code
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-muted-foreground",
						children: ["Placed ", formatDate(order.created_at)]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusTone(order.status)}`,
						children: STATUS_LABEL[order.status] ?? order.status
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "rounded-xl border border-border bg-card p-5 shadow-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-lg font-bold",
						children: "Delivery progress"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
						className: "mt-4 space-y-3",
						children: TIMELINE.map((s, idx) => {
							const done = currentIndex >= idx && order.status !== "cancelled";
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `grid h-6 w-6 place-items-center rounded-full text-xs ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`,
									children: done ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5" }) : idx + 1
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `text-sm ${done ? "font-semibold" : "text-muted-foreground"}`,
									children: STATUS_LABEL[s]
								})]
							}, s);
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "rounded-xl border border-border bg-card p-5 shadow-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mb-3 font-display text-lg font-bold",
							children: "Live tracking"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientOnly, { fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-72 w-full rounded-xl bg-surface" }) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-xs text-muted-foreground",
							children: rider ? "Your rider's location updates live." : "A rider will be assigned shortly."
						})
					]
				}),
				needsProof && user?.id === order.customer_id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PaymentProof, {
					orderId,
					userId: user.id,
					method: order.payment_method,
					amount: Number(order.total),
					details: payment,
					existing: proofs.length > 0
				}),
				order.status === "delivered" && order.rider_id && user?.id === order.customer_id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RateRider, {
					orderId,
					riderId: order.rider_id,
					customerId: user.id
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "h-fit space-y-3 rounded-xl border border-border bg-card p-5 shadow-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-lg font-bold",
					children: "Order summary"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-1 text-sm",
					children: items.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted-foreground",
							children: [
								i.quantity,
								" × ",
								i.product_name
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ETB(Number(i.unit_price) * i.quantity) })]
					}, i.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t border-border pt-3 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Subtotal" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ETB(order.subtotal) })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Delivery" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ETB(order.delivery_fee) })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex justify-between font-display text-base font-bold",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ETB(order.total) })]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t border-border pt-3 text-sm text-muted-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							"Payment:",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium text-foreground uppercase",
								children: order.payment_method
							}),
							" ·",
							" ",
							order.payment_status
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1",
							children: order.delivery_address
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							order.customer_name,
							" · ",
							order.customer_phone
						] }),
						order.delivery_pin && !["delivered", "cancelled"].includes(order.status) && user?.id === order.customer_id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 rounded-lg bg-primary-soft p-2 text-center",
							children: [
								"Delivery PIN:",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-display text-base font-extrabold tracking-widest text-accent-foreground",
									children: order.delivery_pin
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-xs",
									children: "Share this with your rider to confirm delivery"
								})
							]
						})
					]
				})
			]
		})]
	});
}
function PaymentProof({ orderId, userId, method, amount, details, existing }) {
	const qc = useQueryClient();
	const [reference, setReference] = (0, import_react.useState)("");
	const [file, setFile] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const submit = async (e) => {
		e.preventDefault();
		setBusy(true);
		try {
			let path = null;
			if (file) path = await uploadImage(file, `${userId}/${orderId}`, PROOF_BUCKET);
			const { error } = await supabase.from("payment_proofs").insert({
				order_id: orderId,
				user_id: userId,
				method,
				reference,
				image_url: path,
				amount
			});
			if (error) throw error;
			qc.invalidateQueries({ queryKey: ["proofs", orderId] });
			toast.success("Receipt submitted for verification");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-4 rounded-xl border border-border bg-card p-5 shadow-card",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
				className: "font-display text-lg font-bold",
				children: [
					"Complete your ",
					method.toUpperCase(),
					" payment"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg bg-surface p-4 text-sm",
				children: [Object.keys(details).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted-foreground",
					children: "Payment account details will be shared by our team shortly."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-1",
					children: Object.entries(details).map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-muted-foreground capitalize",
						children: [k.replace(/_/g, " "), ": "]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold",
						children: String(v)
					})] }, k))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 font-semibold",
					children: ["Amount to send: ", ETB(amount)]
				})]
			}),
			existing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "A receipt is already under review. You can submit another if needed."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "ref",
							children: "Transaction reference"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "ref",
							value: reference,
							onChange: (e) => setReference(e.target.value),
							required: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "rc",
							children: "Receipt screenshot"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "rc",
							type: "file",
							accept: "image/*",
							onChange: (e) => setFile(e.target.files?.[0] ?? null)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "submit",
						disabled: busy,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "mr-2 h-4 w-4" }), busy ? "Submitting…" : "Submit receipt"]
					})
				]
			})
		]
	});
}
function RateRider({ orderId, riderId, customerId }) {
	const qc = useQueryClient();
	const [rating, setRating] = (0, import_react.useState)(0);
	const [comment, setComment] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const { data: existing } = useQuery({
		queryKey: ["rider-rating", orderId],
		queryFn: async () => {
			const { data } = await supabase.from("rider_ratings").select("rating,comment").eq("order_id", orderId).maybeSingle();
			return data;
		}
	});
	const submit = async (e) => {
		e.preventDefault();
		if (rating === 0) {
			toast.error("Pick a star rating first");
			return;
		}
		setBusy(true);
		const { error } = await supabase.from("rider_ratings").insert({
			order_id: orderId,
			rider_id: riderId,
			customer_id: customerId,
			rating,
			comment: comment.trim() || null
		});
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		qc.invalidateQueries({ queryKey: ["rider-rating", orderId] });
		toast.success("Thanks for rating your rider!");
	};
	if (existing) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl border border-border bg-card p-5 shadow-card",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-lg font-bold",
			children: "Your rider rating"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-2 flex items-center gap-1 text-sm",
			children: [Array.from({ length: 5 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: `h-4 w-4 ${i < existing.rating ? "fill-warning text-warning" : "text-muted-foreground"}` }, i)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "ml-2 text-muted-foreground",
				children: existing.comment
			})]
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl border border-border bg-card p-5 shadow-card",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-lg font-bold",
			children: "Rate your rider"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: submit,
			className: "mt-3 space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-1",
					children: Array.from({ length: 5 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setRating(i + 1),
						"aria-label": `${i + 1} stars`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: `h-7 w-7 ${i < rating ? "fill-warning text-warning" : "text-muted-foreground"}` })
					}, i))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: comment,
					onChange: (e) => setComment(e.target.value),
					placeholder: "How was the delivery? (optional)",
					maxLength: 300
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: busy,
					children: busy ? "Submitting…" : "Submit rating"
				})
			]
		})]
	});
}
//#endregion
export { OrderDetail as component };
