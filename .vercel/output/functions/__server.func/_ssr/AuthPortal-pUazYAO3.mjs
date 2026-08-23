import { i as __toESM } from "../_runtime.mjs";
import { r as supabase } from "./client-D2C38fHY.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { g as Link, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { P as Mail, R as KeyRound, q as CircleCheck, st as ArrowLeft } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as Button } from "./router-D937WmAP.mjs";
import { d as Input, j as useAuth } from "./router-D937WmAP2.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { i as portalPathFor } from "./guards-BJ4lUOJX.mjs";
import { n as InputOTPGroup, r as InputOTPSlot, t as InputOTP } from "./input-otp-D2NlmYm3.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/AuthPortal-pUazYAO3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var COPY = {
	customer: {
		title: "Welcome back",
		subtitle: "Customer sign-in · order food & groceries",
		role: "customer"
	},
	merchant: {
		title: "Store Partner portal",
		subtitle: "Sign in to manage your shop, orders and menu",
		role: "merchant"
	},
	rider: {
		title: "Driver portal",
		subtitle: "Sign in to go online and deliver with Ligo",
		role: "rider"
	},
	admin: {
		title: "Administrative sign-in",
		subtitle: "Restricted to Ligo operations staff",
		role: "admin"
	}
};
function PortalShell({ kind, children }) {
	const copy = COPY[kind];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "container-ligo flex justify-center py-12",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-pop",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-2xl font-extrabold",
					children: copy.title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: copy.subtitle
				}),
				children
			]
		})
	});
}
/** Friendly messages for the common Supabase OTP failure modes. */
function otpErrorMessage(err, fallback) {
	const msg = err instanceof Error ? err.message : "";
	const lower = msg.toLowerCase();
	if (lower.includes("rate limit") || lower.includes("too many requests")) return "Too many attempts — please wait a minute before requesting another code.";
	if (lower.includes("expired")) return "That code has expired — request a new one.";
	if (lower.includes("invalid") || lower.includes("token")) return "Invalid code — double-check the 6 digits and try again.";
	return msg || fallback;
}
function AuthPortal({ kind }) {
	const navigate = useNavigate();
	const { user, roles, loading } = useAuth();
	const [email, setEmail] = (0, import_react.useState)("");
	const [otp, setOtp] = (0, import_react.useState)("");
	const [codeSent, setCodeSent] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [resendIn, setResendIn] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		if (!loading && user) navigate({ to: portalPathFor(roles) });
	}, [
		user,
		roles,
		loading,
		navigate
	]);
	(0, import_react.useEffect)(() => {
		if (resendIn <= 0) return;
		const t = setTimeout(() => setResendIn((s) => s - 1), 1e3);
		return () => clearTimeout(t);
	}, [resendIn]);
	const trimmedEmail = email.trim();
	const sendCode = async (e) => {
		e?.preventDefault();
		if (!trimmedEmail.includes("@")) {
			toast.error("Enter a valid email address");
			return;
		}
		setBusy(true);
		try {
			const { error } = await supabase.auth.signInWithOtp({
				email: trimmedEmail,
				options: { shouldCreateUser: true }
			});
			if (error) throw error;
			setCodeSent(true);
			setOtp("");
			setResendIn(60);
			toast.success("Verification code sent — check your inbox.");
		} catch (err) {
			toast.error(otpErrorMessage(err, "Could not send code"));
		} finally {
			setBusy(false);
		}
	};
	const verifyCode = async (e) => {
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
			toast.success("Signed in");
		} catch (err) {
			toast.error(otpErrorMessage(err, "Invalid code"));
		} finally {
			setBusy(false);
		}
	};
	const showRegister = kind !== "admin";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PortalShell, {
		kind,
		children: [codeSent ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: verifyCode,
			className: "mt-5 space-y-4",
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
					children: busy ? "Verifying…" : "Verify & sign in"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground",
						onClick: () => {
							setCodeSent(false);
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
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: sendCode,
			className: "mt-5 space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "email",
						children: "Email"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "email",
							type: "email",
							value: email,
							onChange: (e) => setEmail(e.target.value),
							required: true,
							autoComplete: "email",
							placeholder: "you@example.com",
							className: "pl-9"
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					className: "w-full",
					disabled: busy || !trimmedEmail.includes("@"),
					children: busy ? "Sending code…" : "Email me a sign-in code"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-center text-xs text-muted-foreground",
					children: "No password needed — we email you a one-time code."
				})
			]
		}), showRegister && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-5 text-center text-sm text-muted-foreground",
			children: [kind === "customer" ? "New to Ligo? " : kind === "merchant" ? "New store? " : "New driver? ", kind === "rider" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/rider/join",
				className: "font-semibold text-primary",
				children: "Apply to become a rider"
			}) : kind === "merchant" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/register",
				className: "font-semibold text-primary",
				children: "Register your store"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/register",
				className: "font-semibold text-primary",
				children: "Create an account"
			})]
		})]
	});
}
//#endregion
export { AuthPortal as t };
