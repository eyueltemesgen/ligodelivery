import { i as __toESM } from "../_runtime.mjs";
import { r as supabase } from "./client-D2C38fHY.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as Button, v as cn } from "./router-D937WmAP.mjs";
import { d as Input } from "./router-D937WmAP2.mjs";
import { t as Switch } from "./switch-Cn1w-cIH.mjs";
import { t as DAY_NAMES } from "./hours-DAwDABcJ.mjs";
import { i as Trigger, n as List, r as Root2, t as Content } from "../_libs/radix-ui__react-tabs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tabs-DzaIlufi.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var buildDraft = (rows, fallbackOpen, fallbackClose) => DAY_NAMES.map((_, day) => {
	const row = rows.find((r) => r.day_of_week === day);
	return {
		opens_at: (row?.opens_at ?? fallbackOpen).slice(0, 5),
		closes_at: (row?.closes_at ?? fallbackClose).slice(0, 5),
		is_closed: row?.is_closed ?? false
	};
});
function ShopHoursEditor({ shopId, fallbackOpen = "08:00", fallbackClose = "22:00" }) {
	const qc = useQueryClient();
	const [draft, setDraft] = (0, import_react.useState)(null);
	const [savingDay, setSavingDay] = (0, import_react.useState)(null);
	const { data: rows = [] } = useQuery({
		queryKey: ["shop-hours", shopId],
		queryFn: async () => (await supabase.from("shop_hours").select("*").eq("shop_id", shopId)).data ?? []
	});
	(0, import_react.useEffect)(() => {
		setDraft(buildDraft(rows, fallbackOpen, fallbackClose));
	}, [
		rows,
		fallbackOpen,
		fallbackClose
	]);
	if (!draft) return null;
	const setDay = (day, patch) => setDraft((cur) => cur ? cur.map((d, i) => i === day ? {
		...d,
		...patch
	} : d) : cur);
	const saveDay = async (day) => {
		const d = draft[day];
		if (!d) return;
		setSavingDay(day);
		const { error } = await supabase.from("shop_hours").upsert({
			shop_id: shopId,
			day_of_week: day,
			opens_at: d.opens_at,
			closes_at: d.closes_at,
			is_closed: d.is_closed
		}, { onConflict: "shop_id,day_of_week" });
		setSavingDay(null);
		if (error) {
			toast.error(error.message);
			return;
		}
		qc.invalidateQueries({ queryKey: ["shop-hours", shopId] });
		toast.success(`${DAY_NAMES[day]} hours saved`);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-2",
		children: draft.map((d, day) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2 text-sm",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "w-24 font-medium",
					children: DAY_NAMES[day]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center gap-2 text-xs text-muted-foreground",
					children: ["Closed", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: d.is_closed,
						onCheckedChange: (v) => setDay(day, { is_closed: v })
					})]
				}),
				!d.is_closed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "time",
						className: "h-8 w-28",
						value: d.opens_at,
						onChange: (e) => setDay(day, { opens_at: e.target.value })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted-foreground",
						children: "–"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "time",
						className: "h-8 w-28",
						value: d.closes_at,
						onChange: (e) => setDay(day, { closes_at: e.target.value })
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "outline",
					className: "ml-auto",
					disabled: savingDay === day,
					onClick: () => void saveDay(day),
					children: savingDay === day ? "Saving…" : "Save"
				})
			]
		}, day))
	});
}
var Tabs = Root2;
var TabsList = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
	ref,
	className: cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className),
	...props
}));
TabsList.displayName = List.displayName;
var TabsTrigger = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger, {
	ref,
	className: cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow", className),
	...props
}));
TabsTrigger.displayName = Trigger.displayName;
var TabsContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content, {
	ref,
	className: cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className),
	...props
}));
TabsContent.displayName = Content.displayName;
//#endregion
export { TabsTrigger as a, TabsList as i, Tabs as n, TabsContent as r, ShopHoursEditor as t };
