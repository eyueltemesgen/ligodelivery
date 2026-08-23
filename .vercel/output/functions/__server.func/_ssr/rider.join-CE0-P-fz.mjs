import { i as __toESM } from "../_runtime.mjs";
import { r as supabase } from "./client-D2C38fHY.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { H as Clock, r as Wallet, tt as Bike } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as Button, h as uploadImage } from "./router-D937WmAP.mjs";
import { d as Input, j as useAuth } from "./router-D937WmAP2.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rider.join-CE0-P-fz.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function RiderJoin() {
	const { user } = useAuth();
	const [vehicle, setVehicle] = (0, import_react.useState)("motorbike");
	const [nationalId, setNationalId] = (0, import_react.useState)("");
	const [notes, setNotes] = (0, import_react.useState)("");
	const [idDoc, setIdDoc] = (0, import_react.useState)(null);
	const [licenseDoc, setLicenseDoc] = (0, import_react.useState)(null);
	const [payoutMethod, setPayoutMethod] = (0, import_react.useState)("telebirr");
	const [payoutAccount, setPayoutAccount] = (0, import_react.useState)("");
	const [payoutName, setPayoutName] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const apply = async (e) => {
		e.preventDefault();
		if (!user) return;
		setBusy(true);
		try {
			const idPath = idDoc ? await uploadImage(idDoc, `rider-docs/${user.id}`) : null;
			const licensePath = licenseDoc ? await uploadImage(licenseDoc, `rider-docs/${user.id}`) : null;
			const { error } = await supabase.from("riders").upsert({
				id: user.id,
				vehicle_type: vehicle,
				national_id: nationalId,
				notes,
				id_document_url: idPath,
				license_document_url: licensePath,
				payout_method: payoutMethod,
				payout_account: payoutAccount.trim(),
				payout_account_name: payoutName.trim(),
				verification_status: "pending_verification",
				is_approved: false
			}, { onConflict: "id" });
			if (error) throw error;
			toast.success("Application submitted — an admin will review it shortly.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not submit application");
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-ligo py-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-2xl bg-primary-soft p-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl font-extrabold",
					children: "Become a Ligo rider"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-2xl text-muted-foreground",
					children: "Deliver across Bishoftu, keep your own hours and get paid for every completed order."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 grid gap-4 sm:grid-cols-3",
					children: [
						{
							icon: Wallet,
							t: "Weekly payouts",
							d: "Reliable earnings per delivery"
						},
						{
							icon: Clock,
							t: "Flexible hours",
							d: "Go online whenever you want"
						},
						{
							icon: Bike,
							t: "Any vehicle",
							d: "Motorbike, bicycle or on foot"
						}
					].map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-card p-4 shadow-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(b.icon, { className: "h-5 w-5 text-primary" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 font-semibold",
								children: b.t
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted-foreground",
								children: b.d
							})
						]
					}, b.t))
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-8 max-w-lg",
			children: !user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-border bg-card p-6 text-center shadow-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-semibold",
					children: "Create a rider account to apply"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					className: "mt-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/register",
						search: { role: "rider" },
						children: "Register as rider"
					})
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: apply,
				className: "space-y-4 rounded-xl border border-border bg-card p-6 shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-lg font-bold",
						children: "Rider application"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "v",
							children: "Vehicle type"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: "v",
							className: "h-9 w-full rounded-md border border-input bg-background px-2 text-sm",
							value: vehicle,
							onChange: (e) => setVehicle(e.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "bicycle",
									children: "Bicycle"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "motorbike",
									children: "Motorbike"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "scooter",
									children: "Scooter"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "car",
									children: "Car"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "foot",
									children: "On foot"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "nid",
							children: "National ID number"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "nid",
							value: nationalId,
							onChange: (e) => setNationalId(e.target.value),
							required: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "iddoc",
							children: "National ID photo"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "iddoc",
							type: "file",
							accept: "image/*",
							onChange: (e) => setIdDoc(e.target.files?.[0] ?? null)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "licdoc",
							children: "Driving license photo (optional)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "licdoc",
							type: "file",
							accept: "image/*",
							onChange: (e) => setLicenseDoc(e.target.files?.[0] ?? null)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "pm",
							children: "Payout method"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: "pm",
							className: "h-9 w-full rounded-md border border-input bg-background px-2 text-sm",
							value: payoutMethod,
							onChange: (e) => setPayoutMethod(e.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "telebirr",
								children: "Telebirr"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "bank_account",
								children: "Bank account"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "pa",
							children: payoutMethod === "telebirr" ? "Telebirr phone number" : "Bank account number"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "pa",
							value: payoutAccount,
							onChange: (e) => setPayoutAccount(e.target.value),
							required: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "pn",
							children: "Account holder name"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "pn",
							value: payoutName,
							onChange: (e) => setPayoutName(e.target.value),
							required: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "nt",
							children: "Anything else?"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							id: "nt",
							value: notes,
							onChange: (e) => setNotes(e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: busy,
						children: busy ? "Submitting…" : "Submit application"
					})
				]
			})
		})]
	});
}
//#endregion
export { RiderJoin as component };
