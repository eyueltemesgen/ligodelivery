import { i as __toESM } from "../_runtime.mjs";
import { r as supabase } from "./client-D2C38fHY.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { g as Link, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { P as Mail, R as KeyRound, g as ShoppingBag, m as Smartphone, ot as ArrowRight, q as CircleCheck, st as ArrowLeft, tt as Bike } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as Button, h as uploadImage } from "./router-D937WmAP.mjs";
import { d as Input, v as Route$15 } from "./router-D937WmAP2.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { n as InputOTPGroup, r as InputOTPSlot, t as InputOTP } from "./input-otp-D2NlmYm3.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/register-DLYteZDK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ROLE_CARDS = [{
	id: "customer",
	title: "Customer",
	description: "Order food, groceries and essentials across Bishoftu.",
	icon: ShoppingBag
}, {
	id: "rider",
	title: "Rider",
	description: "Deliver on your own schedule and cash out instantly.",
	icon: Bike
}];
var VEHICLE_TYPES = [
	{
		value: "bicycle",
		label: "Bicycle"
	},
	{
		value: "motorbike",
		label: "Motorbike"
	},
	{
		value: "scooter",
		label: "Scooter"
	},
	{
		value: "car",
		label: "Car"
	}
];
var PAYOUT_METHODS = [{
	value: "telebirr",
	label: "Telebirr"
}, {
	value: "bank_account",
	label: "Bank account"
}];
/** Friendly messages for the common Supabase OTP failure modes. */
function otpErrorMessage(err, fallback) {
	const msg = err instanceof Error ? err.message : "";
	const lower = msg.toLowerCase();
	if (lower.includes("rate limit") || lower.includes("too many requests")) return "Too many attempts — please wait a minute before requesting another code.";
	if (lower.includes("expired")) return "That code has expired — request a new one.";
	if (lower.includes("invalid") || lower.includes("token")) return "Invalid code — double-check the 6 digits and try again.";
	return msg || fallback;
}
function RegisterPage() {
	const { role: initialRole } = Route$15.useSearch();
	const navigate = useNavigate();
	const [step, setStep] = (0, import_react.useState)(1);
	const [role, setRole] = (0, import_react.useState)(initialRole ?? "customer");
	const [fullName, setFullName] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [vehicle, setVehicle] = (0, import_react.useState)("motorbike");
	const [nationalId, setNationalId] = (0, import_react.useState)("");
	const [idDoc, setIdDoc] = (0, import_react.useState)(null);
	const [licenseDoc, setLicenseDoc] = (0, import_react.useState)(null);
	const [payoutMethod, setPayoutMethod] = (0, import_react.useState)("telebirr");
	const [payoutAccount, setPayoutAccount] = (0, import_react.useState)("");
	const [payoutName, setPayoutName] = (0, import_react.useState)("");
	const [otp, setOtp] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [resendIn, setResendIn] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		if (resendIn <= 0) return;
		const t = setTimeout(() => setResendIn((s) => s - 1), 1e3);
		return () => clearTimeout(t);
	}, [resendIn]);
	const trimmedEmail = email.trim();
	const step2Valid = (() => {
		if (fullName.trim().length < 2 || !trimmedEmail.includes("@")) return false;
		if (role === "rider") {
			if (phone.trim().length < 9) return false;
			if (nationalId.trim().length < 3 || !licenseDoc) return false;
			if (payoutAccount.trim().length < 5 || payoutName.trim().length < 2) return false;
		}
		return true;
	})();
	const completeRiderOnboarding = async (userId) => {
		const idPath = idDoc ? await uploadImage(idDoc, `rider-docs/${userId}`) : null;
		const licensePath = await uploadImage(licenseDoc, `rider-docs/${userId}`);
		const { error } = await supabase.from("riders").upsert({
			id: userId,
			vehicle_type: vehicle,
			national_id: nationalId.trim(),
			id_document_url: idPath,
			license_document_url: licensePath,
			payout_method: payoutMethod,
			payout_account: payoutAccount.trim(),
			payout_account_name: payoutName.trim(),
			verification_status: "pending_verification",
			is_approved: false
		}, { onConflict: "id" });
		if (error) throw error;
	};
	const finishSignup = async (userId) => {
		if (role === "rider") await completeRiderOnboarding(userId);
		toast.success(role === "rider" ? "Rider application received — sit tight while we verify your documents." : "Account created. Welcome to Ligo!");
		await navigate({ to: role === "rider" ? "/rider" : "/" });
	};
	const sendCode = async (e) => {
		e?.preventDefault();
		if (!step2Valid) {
			toast.error("Please complete the required fields");
			return;
		}
		setBusy(true);
		try {
			const { error } = await supabase.auth.signInWithOtp({
				email: trimmedEmail,
				options: {
					shouldCreateUser: true,
					data: {
						full_name: fullName.trim(),
						phone: phone.trim(),
						role
					}
				}
			});
			if (error) throw error;
			toast.success("Verification code sent — check your inbox.");
			setOtp("");
			setResendIn(60);
			setStep(3);
		} catch (err) {
			toast.error(otpErrorMessage(err, "Could not send code"));
		} finally {
			setBusy(false);
		}
	};
	const verifyOtp = async (e) => {
		e.preventDefault();
		if (otp.length < 6) {
			toast.error("Enter the 6-digit code");
			return;
		}
		setBusy(true);
		try {
			const { data, error } = await supabase.auth.verifyOtp({
				email: trimmedEmail,
				token: otp,
				type: "email"
			});
			if (error) throw error;
			if (!data.user) throw new Error("Verification failed — please try again");
			await finishSignup(data.user.id);
		} catch (err) {
			toast.error(otpErrorMessage(err, "Invalid code"));
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "container-ligo flex justify-center py-12",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-pop",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-2xl font-extrabold",
						children: "Create your account"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-xs font-medium text-muted-foreground",
						children: [
							"Step ",
							step,
							" of 3"
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 flex gap-1",
					children: [
						1,
						2,
						3
					].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}` }, s))
				}),
				step === 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: "How will you use Ligo?"
						}),
						ROLE_CARDS.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setRole(r.id),
							className: `flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-100 active:scale-95 ${role === r.id ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(r.icon, { className: "h-6 w-6 shrink-0 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block font-semibold",
								children: r.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-sm text-muted-foreground",
								children: r.description
							})] })]
						}, r.id)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							className: "mt-2 w-full",
							onClick: () => setStep(2),
							children: ["Continue ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "ml-2 h-4 w-4" })]
						})
					]
				}),
				step === 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "name",
								children: "Full name"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "name",
								value: fullName,
								onChange: (e) => setFullName(e.target.value),
								required: true
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "email",
									children: "Email"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "email",
										type: "email",
										value: email,
										onChange: (e) => setEmail(e.target.value),
										placeholder: "you@example.com",
										className: "pl-9",
										required: true
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "No password needed — we'll email you a 6-digit verification code."
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
								htmlFor: "phone",
								children: ["Phone ", role === "rider" ? "" : "(optional)"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "phone",
									value: phone,
									onChange: (e) => setPhone(e.target.value),
									placeholder: "+2519…",
									className: "pl-9",
									required: role === "rider"
								})]
							})]
						}),
						role === "rider" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4 rounded-xl border border-border bg-surface p-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-semibold",
									children: "Rider verification"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "v",
										children: "Vehicle type"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										id: "v",
										className: "h-9 w-full rounded-md border border-input bg-input px-2 text-sm",
										value: vehicle,
										onChange: (e) => setVehicle(e.target.value),
										children: VEHICLE_TYPES.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: v.value,
											children: v.label
										}, v.value))
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
										children: "Driver's license photo"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "licdoc",
										type: "file",
										accept: "image/*",
										required: true,
										onChange: (e) => setLicenseDoc(e.target.files?.[0] ?? null)
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "pt-1 text-sm font-semibold",
									children: "Payout details"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "pm",
										children: "Payout method"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										id: "pm",
										className: "h-9 w-full rounded-md border border-input bg-input px-2 text-sm",
										value: payoutMethod,
										onChange: (e) => setPayoutMethod(e.target.value),
										children: PAYOUT_METHODS.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: m.value,
											children: m.label
										}, m.value))
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
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "New rider accounts start as pending verification — an admin approves your documents before you can go online."
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								type: "button",
								variant: "outline",
								onClick: () => setStep(1),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "mr-2 h-4 w-4" }), " Back"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								className: "flex-1",
								disabled: busy || !step2Valid,
								onClick: () => void sendCode(),
								children: busy ? "Sending code…" : "Send verification code"
							})]
						})
					]
				}),
				step === 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: verifyOtp,
					className: "mt-6 space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start gap-3 rounded-lg border border-border bg-surface p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "mt-0.5 h-5 w-5 shrink-0 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted-foreground",
								children: [
									"Enter the 6-digit code we sent to",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-foreground",
										children: trimmedEmail
									}),
									"."
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTP, {
								maxLength: 6,
								value: otp,
								onChange: (v) => setOtp(v),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(InputOTPGroup, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTPSlot, { index: 0 }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTPSlot, { index: 1 }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTPSlot, { index: 2 }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTPSlot, { index: 3 }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTPSlot, { index: 4 }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InputOTPSlot, { index: 5 })
								] })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							className: "w-full",
							disabled: busy || otp.length < 6,
							children: busy ? "Verifying…" : "Verify & create account"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground",
								onClick: () => {
									setStep(2);
									setOtp("");
									setResendIn(0);
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-3.5 w-3.5" }), " Change email"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "font-medium text-primary disabled:opacity-50",
								disabled: busy || resendIn > 0,
								onClick: () => void sendCode(),
								children: resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"
							})]
						})
					]
				}),
				step !== 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-5 text-center text-sm text-muted-foreground",
					children: [
						"Already have an account?",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/login",
							className: "font-semibold text-primary",
							children: "Sign in"
						})
					]
				})
			]
		})
	});
}
//#endregion
export { RegisterPage as component };
