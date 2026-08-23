import { i as __toESM } from "../_runtime.mjs";
import { r as supabase } from "./client-D2C38fHY.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { g as Link, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { I as Lock } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as Button, l as ETB } from "./router-D937WmAP.mjs";
import { M as useCart, d as Input, j as useAuth } from "./router-D937WmAP2.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { c as shopQuery, i as publicSettingsQuery, o as shopHoursQuery } from "./queries-DB3Dy3Ev.mjs";
import { n as supabaseErrorMessage } from "./supa-error-9zcFkD9J.mjs";
import { n as closedReason, r as isShopOpenNow } from "./hours-DAwDABcJ.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/checkout-D3o342OD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var METHODS = [
	{
		id: "cash",
		label: "Cash on delivery"
	},
	{
		id: "mobile_money",
		label: "Mobile Money"
	},
	{
		id: "telebirr",
		label: "Telebirr"
	},
	{
		id: "cbe",
		label: "CBE Birr"
	},
	{
		id: "chapa",
		label: "Chapa"
	},
	{
		id: "boa",
		label: "Bank of Abyssinia"
	}
];
var TIP_PRESETS = [
	0,
	10,
	20,
	30,
	50
];
function CheckoutPage() {
	const { items, subtotal, shopId, shopName, clear } = useCart();
	const { user, profile } = useAuth();
	const navigate = useNavigate();
	const { data: shop } = useQuery({
		...shopQuery(shopId ?? ""),
		enabled: !!shopId
	});
	const { data: hours = [] } = useQuery({
		...shopHoursQuery(shopId ?? ""),
		enabled: !!shopId
	});
	const { data: publicSettings } = useQuery(publicSettingsQuery);
	const [step, setStep] = (0, import_react.useState)(1);
	const [name, setName] = (0, import_react.useState)(profile?.full_name ?? "");
	const [phone, setPhone] = (0, import_react.useState)(profile?.phone ?? "");
	const [address, setAddress] = (0, import_react.useState)("");
	const [instructions, setInstructions] = (0, import_react.useState)("");
	const [method, setMethod] = (0, import_react.useState)("cash");
	const [tip, setTip] = (0, import_react.useState)(0);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const platform = publicSettings?.["platform"] ?? {};
	const surge = Math.max(Number(platform.surge_multiplier ?? 1), 1);
	const deliveryFee = Math.round(Number(shop?.delivery_fee ?? platform.base_delivery_fee ?? 50) * surge);
	const total = subtotal + deliveryFee + tip;
	const shopLoaded = !shopId || !!shop;
	const shopOpen = shopLoaded ? isShopOpenNow(shop ?? {}, hours) : false;
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-ligo py-16 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-2xl font-extrabold",
			children: "Sign in to place your order"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			asChild: true,
			className: "mt-6",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/login",
				children: "Sign in"
			})
		})]
	});
	if (items.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-ligo py-16 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-2xl font-extrabold",
			children: "Your cart is empty"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			asChild: true,
			className: "mt-6",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/shops",
				children: "Browse shops"
			})
		})]
	});
	if (shopLoaded && !shopOpen) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "container-ligo py-16 text-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-md rounded-xl border border-border bg-card p-8 shadow-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "mx-auto h-8 w-8 text-muted-foreground" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "mt-4 font-display text-2xl font-extrabold",
					children: [shopName, " is closed right now"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: [closedReason(shop ?? {}, hours), " Checkout is locked until the shop reopens — your cart is saved."]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/shops",
						children: "Browse open shops"
					})
				})
			]
		})
	});
	const placeOrder = async (e) => {
		e.preventDefault();
		if (!isShopOpenNow(shop ?? {}, hours)) {
			toast.error("This shop is closed right now — checkout is locked.");
			return;
		}
		setBusy(true);
		try {
			const payload = {
				customer_id: user.id,
				shop_id: shopId ?? null,
				status: "pending_payment",
				payment_method: method,
				delivery_pin: String(Math.floor(1e3 + Math.random() * 9e3)),
				payment_status: "unpaid",
				subtotal,
				delivery_fee: deliveryFee,
				tip,
				total,
				customer_name: name.trim() || null,
				customer_phone: phone.trim() || null,
				delivery_address: address.trim() || null,
				delivery_instructions: instructions.trim() || null
			};
			const { data: order, error } = await supabase.from("orders").insert(payload).select("id").single();
			if (error) throw error;
			const itemsPayload = items.map((i) => ({
				order_id: order.id,
				product_id: i.productId,
				product_name: i.name,
				image_url: i.imagePath ?? null,
				unit_price: i.unitPrice,
				quantity: i.quantity
			}));
			const { error: itemsError } = await supabase.from("order_items").insert(itemsPayload);
			if (itemsError) throw itemsError;
			clear();
			toast.success("Order placed — awaiting payment verification");
			await navigate({
				to: "/orders/$orderId",
				params: { orderId: order.id }
			});
		} catch (err) {
			toast.error(supabaseErrorMessage(err));
		} finally {
			setBusy(false);
		}
	};
	const canProceed = name.trim() && phone.trim() && address.trim();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: placeOrder,
		className: "container-ligo grid gap-8 py-10 lg:grid-cols-[1fr_340px]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl font-extrabold",
					children: "Checkout"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
					className: "mt-3 flex items-center gap-2 text-xs font-semibold",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: step === 1 ? "text-primary" : "text-muted-foreground",
							children: "1 · Delivery details"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "text-muted-foreground",
							children: "→"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: step === 2 ? "text-primary" : "text-muted-foreground",
							children: "2 · Payment & tip"
						})
					]
				})] }),
				step === 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "space-y-4 rounded-xl border border-border bg-card p-5 shadow-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-lg font-bold",
							children: "Delivery details"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-4 sm:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "n",
									children: "Full name"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "n",
									value: name,
									onChange: (e) => setName(e.target.value),
									required: true
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "p",
									children: "Phone"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "p",
									value: phone,
									onChange: (e) => setPhone(e.target.value),
									required: true
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "a",
								children: "Delivery address in Bishoftu"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "a",
								value: address,
								onChange: (e) => setAddress(e.target.value),
								required: true,
								placeholder: "Kebele, landmark, house no."
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "i",
								children: "Rider delivery notes (optional)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								id: "i",
								value: instructions,
								onChange: (e) => setInstructions(e.target.value),
								placeholder: "e.g. call when you arrive, gate code…"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							className: "w-full",
							disabled: !canProceed,
							onClick: () => setStep(2),
							children: "Continue to payment"
						})
					]
				}),
				step === 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "space-y-3 rounded-xl border border-border bg-card p-5 shadow-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-display text-lg font-bold",
								children: "Payment method"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid gap-2 sm:grid-cols-2",
								children: METHODS.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setMethod(m.id),
									className: `rounded-lg border px-4 py-3 text-left text-sm font-medium ${method === m.id ? "border-primary bg-primary-soft" : "border-border"}`,
									children: m.label
								}, m.id))
							}),
							method !== "cash" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "After placing the order you'll see the account details and can upload your payment receipt for verification."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "space-y-3 rounded-xl border border-border bg-card p-5 shadow-card",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-lg font-bold",
							children: "Rider tip"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-2",
							children: TIP_PRESETS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setTip(t),
								className: `rounded-full border px-4 py-2 text-sm font-medium transition-colors ${tip === t ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`,
								children: t === 0 ? "No tip" : ETB(t)
							}, t))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						onClick: () => setStep(1),
						children: "← Back to delivery details"
					})
				] })
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "h-fit space-y-3 rounded-xl border border-border bg-card p-5 shadow-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-lg font-bold",
					children: "Order summary"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: shopName
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
								i.name
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ETB(i.unitPrice * i.quantity) })]
					}, i.productId))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t border-border pt-3 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Subtotal" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ETB(subtotal) })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Delivery", surge > 1 ? ` (surge ×${surge})` : ""] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ETB(deliveryFee) })]
						}),
						tip > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Rider tip" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ETB(tip) })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex justify-between font-display text-base font-bold",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ETB(total) })]
						})
					]
				}),
				step === 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					className: "w-full",
					disabled: busy,
					children: busy ? "Placing order…" : "Place order"
				})
			]
		})]
	});
}
//#endregion
export { CheckoutPage as component };
