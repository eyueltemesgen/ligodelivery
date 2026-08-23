import { i as __toESM } from "../_runtime.mjs";
import { r as supabase } from "./client-D2C38fHY.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { r as Slot, s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { k as router_exports } from "./router-D937WmAP2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/utils-C_uf36nf.js
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/button-DUirVWCQ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-all duration-100 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground shadow hover:bg-primary-hover",
			destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
			outline: "border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
			secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
			ghost: "hover:bg-accent hover:text-accent-foreground",
			link: "text-primary underline-offset-4 hover:underline"
		},
		size: {
			default: "h-9 px-4 py-2",
			sm: "h-8 rounded-md px-3 text-xs",
			lg: "h-10 rounded-md px-8",
			icon: "h-9 w-9"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/media-CaZCUw2V.js
/** Lightweight inline blur placeholder shown instantly while media resolves. */
var BLUR_PLACEHOLDER = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 5"><filter id="b"><feGaussianBlur stdDeviation="1.4"/></filter><rect width="8" height="5" fill="#e2e8f0" filter="url(#b)"/><ellipse cx="5.5" cy="2" rx="3" ry="2" fill="#d1fae5" filter="url(#b)"/></svg>`);
var cache = /* @__PURE__ */ new Map();
var MEDIA_BUCKET = "ligo-media";
var PROOF_BUCKET = "ligo-proofs";
async function resolveMedia(path, bucket = MEDIA_BUCKET) {
	if (!path) return null;
	if (path.startsWith("http")) return path;
	const key = `${bucket}:${path}`;
	const hit = cache.get(key);
	if (hit) return hit;
	const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 604800);
	if (!data?.signedUrl) return null;
	cache.set(key, data.signedUrl);
	return data.signedUrl;
}
function useMediaUrl(path, bucket = MEDIA_BUCKET) {
	const [url, setUrl] = (0, import_react.useState)(() => path?.startsWith("http") ? path : cache.get(`${bucket}:${path}`) ?? null);
	(0, import_react.useEffect)(() => {
		let active = true;
		resolveMedia(path, bucket).then((u) => active && setUrl(u));
		return () => {
			active = false;
		};
	}, [path, bucket]);
	return url;
}
function StorageImage({ path, alt, className, bucket = MEDIA_BUCKET, fallback, priority = false }) {
	const url = useMediaUrl(path, bucket);
	const [loaded, setLoaded] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setLoaded(false), [url]);
	if (!url) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex items-center justify-center text-muted-foreground", className),
		style: {
			backgroundImage: `url("${BLUR_PLACEHOLDER}")`,
			backgroundSize: "cover",
			backgroundPosition: "center"
		},
		"aria-label": alt,
		children: fallback ?? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs font-medium",
			children: alt.slice(0, 18)
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("relative overflow-hidden", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: BLUR_PLACEHOLDER,
			alt: "",
			"aria-hidden": true,
			className: "absolute inset-0 h-full w-full object-cover"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: url,
			alt,
			loading: priority ? "eager" : "lazy",
			fetchPriority: priority ? "high" : "auto",
			decoding: "async",
			onLoad: () => setLoaded(true),
			className: cn("relative h-full w-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")
		})]
	});
}
var ALLOWED = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif"
];
var MAX_BYTES = 5242880;
async function uploadImage(file, folder, bucket = MEDIA_BUCKET) {
	if (!ALLOWED.includes(file.type)) throw new Error("Only JPG, PNG, WEBP or GIF images are allowed.");
	if (file.size > MAX_BYTES) throw new Error("Image must be smaller than 5 MB.");
	const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
	const path = `${folder}/${crypto.randomUUID()}.${ext}`;
	const { error } = await supabase.storage.from(bucket).upload(path, file, {
		contentType: file.type,
		upsert: false
	});
	if (error) throw error;
	return path;
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/format-BVxK4G-u.js
/**
* Money formatter. Defaults to Ethiopian Birr; the currency can be
* overridden (platform settings or future cross-border markets).
*/
var ETB = (amount, currency = "ETB") => {
	const n = Number(amount ?? 0);
	return `${n.toLocaleString("en-ET", {
		minimumFractionDigits: n % 1 === 0 ? 0 : 2,
		maximumFractionDigits: 2
	})} ${currency}`;
};
var discounted = (price, discountPercent) => discountPercent > 0 ? Math.round(price * (1 - discountPercent / 100) * 100) / 100 : price;
var formatDate = (value) => value ? new Date(value).toLocaleString("en-GB", {
	day: "2-digit",
	month: "short",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit"
}) : "—";
var isShopOpen = (opensAt, closesAt) => {
	if (!opensAt || !closesAt) return true;
	const now = /* @__PURE__ */ new Date();
	const mins = now.getHours() * 60 + now.getMinutes();
	const toMin = (t) => {
		const [h, m] = t.split(":");
		return Number(h) * 60 + Number(m ?? 0);
	};
	const open = toMin(opensAt);
	const close = toMin(closesAt);
	return close > open ? mins >= open && mins <= close : mins >= open || mins <= close;
};
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/orders-BIxoUtKQ.js
var ORDER_STATUSES = [
	"pending_payment",
	"confirmed",
	"preparing",
	"ready_for_pickup",
	"dispatched",
	"accepted",
	"arrived_at_merchant",
	"picked_up",
	"on_the_way",
	"delivered",
	"cancelled",
	"pending",
	"payment_verification",
	"rider_assigned"
];
var STATUS_LABEL = {
	pending_payment: "Pending Payment",
	confirmed: "Confirmed",
	preparing: "Preparing",
	ready_for_pickup: "Ready for Pickup",
	dispatched: "Dispatched",
	accepted: "Rider Accepted",
	arrived_at_merchant: "At Merchant",
	picked_up: "Picked Up",
	on_the_way: "On the Way",
	delivered: "Delivered",
	cancelled: "Cancelled",
	pending: "Pending Payment",
	payment_verification: "Pending Payment",
	rider_assigned: "Rider Accepted"
};
var TIMELINE = [
	"pending_payment",
	"confirmed",
	"preparing",
	"ready_for_pickup",
	"dispatched",
	"accepted",
	"arrived_at_merchant",
	"picked_up",
	"on_the_way",
	"delivered"
];
var TIMELINE_ALIASES = {
	pending: "pending_payment",
	payment_verification: "pending_payment",
	rider_assigned: "accepted"
};
var timelineIndex = (status) => {
	const normalized = TIMELINE_ALIASES[status] ?? status;
	return TIMELINE.indexOf(normalized);
};
var statusTone = (status) => {
	if (status === "delivered") return "bg-primary-soft text-accent-foreground";
	if (status === "cancelled") return "bg-destructive/10 text-destructive";
	if ([
		"pending",
		"payment_verification",
		"pending_payment"
	].includes(status)) return "bg-warning/20 text-warning-foreground";
	return "bg-secondary text-secondary-foreground";
};
async function notify(userId, title, body, type = "order", orderId) {
	await supabase.from("notifications").insert({
		user_id: userId,
		title,
		body,
		type,
		order_id: orderId ?? null
	});
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/IdentityAvatar-DGFTtbLW.js
/** Avatar that resolves a storage path (or remote URL) with an initial fallback. */
function IdentityAvatar({ path, name, className = "h-10 w-10 text-sm" }) {
	const url = useMediaUrl(path);
	if (url) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: url,
		alt: name || "Avatar",
		className: `${className} shrink-0 rounded-full border border-border object-cover`
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `flex ${className} shrink-0 items-center justify-center rounded-full bg-primary-soft font-display font-extrabold text-accent-foreground`,
		children: (name ?? "?").slice(0, 1).toUpperCase()
	});
}
//#endregion
export { Button as _, TIMELINE as a, timelineIndex as c, formatDate as d, isShopOpen as f, useMediaUrl as g, uploadImage as h, STATUS_LABEL as i, ETB as l, StorageImage as m, IdentityAvatar as n, notify as o, PROOF_BUCKET as p, ORDER_STATUSES as r, statusTone as s, router_exports as t, discounted as u, cn as v };
