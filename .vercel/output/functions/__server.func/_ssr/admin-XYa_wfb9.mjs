import { i as __toESM } from "../_runtime.mjs";
import { r as supabase } from "./client-D2C38fHY.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { f as Outlet, g as Link, l as useRouterState, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { B as Gauge, C as Percent, F as LogOut, L as LayoutDashboard, M as Map, T as Package, U as ClipboardList, X as ChevronLeft, Y as ChevronRight, _ as ShieldCheck, b as Search, f as Store, i as Users, n as Wrench, nt as Bell, o as UserRound, r as Wallet, tt as Bike, u as Tags, y as Settings } from "../_libs/lucide-react.mjs";
import { d as formatDate, v as cn } from "./router-D937WmAP.mjs";
import { a as DropdownMenuContent, c as DropdownMenuSeparator, i as DropdownMenu, j as useAuth, l as DropdownMenuTrigger, o as DropdownMenuItem, s as DropdownMenuLabel } from "./router-D937WmAP2.mjs";
import { t as AdminGate } from "./guards-BJ4lUOJX.mjs";
import { i as publicSettingsQuery } from "./queries-DB3Dy3Ev.mjs";
import { n as DialogContent, t as Dialog } from "./dialog-CwLzEEob.mjs";
import { t as _e } from "../_libs/cmdk.mjs";
import { i as Trigger, n as Portal, r as Root2, t as Content2 } from "../_libs/radix-ui__react-popover.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-XYa_wfb9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Command$1 = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e, {
	ref,
	className: cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", className),
	...props
}));
Command$1.displayName = _e.displayName;
var CommandDialog = ({ children, ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
			className: "overflow-hidden p-0",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Command$1, {
				className: "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5",
				children
			})
		})
	});
};
var CommandInput = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
	className: "flex items-center border-b px-3",
	"cmdk-input-wrapper": "",
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "mr-2 h-4 w-4 shrink-0 opacity-50" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Input, {
		ref,
		className: cn("flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className),
		...props
	})]
}));
CommandInput.displayName = _e.Input.displayName;
var CommandList = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.List, {
	ref,
	className: cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className),
	...props
}));
CommandList.displayName = _e.List.displayName;
var CommandEmpty = import_react.forwardRef((props, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Empty, {
	ref,
	className: "py-6 text-center text-sm",
	...props
}));
CommandEmpty.displayName = _e.Empty.displayName;
var CommandGroup = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Group, {
	ref,
	className: cn("overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground", className),
	...props
}));
CommandGroup.displayName = _e.Group.displayName;
var CommandSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Separator, {
	ref,
	className: cn("-mx-1 h-px bg-border", className),
	...props
}));
CommandSeparator.displayName = _e.Separator.displayName;
var CommandItem = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Item, {
	ref,
	className: cn("relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", className),
	...props
}));
CommandItem.displayName = _e.Item.displayName;
var CommandShortcut = ({ className, ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("ml-auto text-xs tracking-widest text-muted-foreground", className),
		...props
	});
};
CommandShortcut.displayName = "CommandShortcut";
function AdminCommandSearch({ open, onOpenChange }) {
	const [query, setQuery] = (0, import_react.useState)("");
	const [results, setResults] = (0, import_react.useState)([]);
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		if (!open) {
			setQuery("");
			setResults([]);
			return;
		}
		const q = query.trim();
		if (q.length < 2) {
			setResults([]);
			return;
		}
		let cancelled = false;
		const timer = setTimeout(() => {
			(async () => {
				const pattern = `%${q}%`;
				const [orders, profiles, shops] = await Promise.all([
					supabase.from("orders").select("id,order_code,customer_name,status,total").or(`order_code.ilike.${pattern},customer_name.ilike.${pattern}`).order("created_at", { ascending: false }).limit(5),
					supabase.from("profiles").select("id,full_name,phone,email").or(`full_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`).limit(8),
					supabase.from("shops").select("id,name,address").ilike("name", pattern).limit(5)
				]);
				if (cancelled) return;
				const profileRows = profiles.data ?? [];
				const riderIds = profileRows.map((p) => p.id);
				const { data: riderRows } = riderIds.length ? await supabase.from("riders").select("id").in("id", riderIds) : { data: [] };
				const riderIdSet = new Set((riderRows ?? []).map((r) => r.id));
				if (cancelled) return;
				const out = [];
				for (const o of orders.data ?? []) out.push({
					group: "Orders",
					label: o.order_code,
					detail: `${o.customer_name ?? "Customer"} · ${o.status} · ${o.total} ETB`,
					to: `/orders/${o.id}`
				});
				for (const p of profileRows) if (riderIdSet.has(p.id)) out.push({
					group: "Riders",
					label: p.full_name || "Rider",
					detail: p.phone ?? p.email ?? "",
					to: "/admin/riders"
				});
				else out.push({
					group: "Customers",
					label: p.full_name || "Customer",
					detail: p.phone ?? p.email ?? "",
					to: "/admin/ops"
				});
				for (const s of shops.data ?? []) out.push({
					group: "Shops",
					label: s.name,
					detail: s.address ?? "",
					to: `/shops/${s.id}`
				});
				setResults(out);
			})();
		}, 250);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [query, open]);
	const GROUP_ICONS = {
		Orders: ClipboardList,
		Riders: Bike,
		Customers: Users,
		Shops: Store
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CommandDialog, {
		open,
		onOpenChange,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandInput, {
			placeholder: "Search orders, riders, customers, shops…",
			value: query,
			onValueChange: setQuery
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CommandList, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandEmpty, { children: query.length < 2 ? "Type at least 2 characters…" : "No results found." }), [
			"Orders",
			"Riders",
			"Customers",
			"Shops"
		].map((group) => {
			const items = results.filter((r) => r.group === group);
			if (items.length === 0) return null;
			const Icon = GROUP_ICONS[group];
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandGroup, {
				heading: group,
				children: items.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CommandItem, {
					value: `${group} ${r.label} ${r.detail}`,
					onSelect: () => {
						onOpenChange(false);
						navigate({ to: r.to });
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "mr-2 h-4 w-4 text-muted-foreground" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium",
							children: r.label
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-2 truncate text-xs text-muted-foreground",
							children: r.detail
						})
					]
				}, `${group}-${i}`))
			}, group);
		})] })]
	});
}
var Popover = Root2;
var PopoverTrigger = Trigger;
var PopoverContent = import_react.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	align,
	sideOffset,
	className: cn("z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)", className),
	...props
}) }));
PopoverContent.displayName = Content2.displayName;
function NotificationsCenter() {
	const { user } = useAuth();
	const qc = useQueryClient();
	const [open, setOpen] = (0, import_react.useState)(false);
	const { data: notifications = [] } = useQuery({
		queryKey: ["header-notifications", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(12);
			return data ?? [];
		}
	});
	(0, import_react.useEffect)(() => {
		if (!user?.id) return;
		const channel = supabase.channel(`header-notif-${user.id}`).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "notifications",
			filter: `user_id=eq.${user.id}`
		}, () => {
			qc.invalidateQueries({ queryKey: ["header-notifications"] });
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [user?.id, qc]);
	const unread = notifications.filter((n) => !n.is_read).length;
	const visibleUnread = open ? 0 : unread;
	const markAllRead = async () => {
		if (!user) return;
		await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
		qc.invalidateQueries({ queryKey: ["header-notifications"] });
		qc.invalidateQueries({ queryKey: ["notifications"] });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				"aria-label": "Notifications",
				className: "relative rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-4 w-4" }), visibleUnread > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground",
					children: visibleUnread > 9 ? "9+" : visibleUnread
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PopoverContent, {
			align: "end",
			className: "w-96 p-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between border-b border-border px-3 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-semibold",
						children: "Notifications"
					}), notifications.some((n) => !n.is_read) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => void markAllRead(),
						className: "text-xs font-medium text-primary hover:underline",
						children: "Mark all read"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "max-h-80 overflow-y-auto",
					children: [notifications.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: "px-4 py-6 text-center text-sm text-muted-foreground",
						children: "Nothing here yet."
					}), notifications.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: `border-b border-border px-3 py-2.5 last:border-0 ${n.is_read ? "bg-card" : "bg-primary-soft"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-semibold",
								children: n.title
							}),
							n.body && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-0.5 line-clamp-2 text-xs text-muted-foreground",
								children: n.body
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-[10px] text-muted-foreground",
								children: formatDate(n.created_at)
							})
						]
					}, n.id))]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "border-t border-border px-3 py-2 text-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/notifications",
						onClick: () => setOpen(false),
						className: "text-xs font-medium text-primary hover:underline",
						children: "View all notifications"
					})
				})
			]
		})]
	});
}
var initial = (name) => name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
function AdminUserMenu() {
	const { profile, signOut } = useAuth();
	const navigate = useNavigate();
	const name = profile?.full_name || "Admin";
	const email = profile?.email || "";
	const handleSignOut = async () => {
		await signOut();
		navigate({ to: "/login" });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-secondary",
			"aria-label": "Admin user menu",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground",
				children: initial(name) || /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserRound, { className: "h-4 w-4" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "hidden text-sm leading-tight lg:block",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block font-semibold",
					children: name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block text-xs text-muted-foreground",
					children: email
				})]
			})]
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
		align: "end",
		className: "w-64",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuLabel, {
				className: "font-normal",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-semibold",
						children: name
					}),
					email && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: email
					}),
					profile?.phone && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: profile.phone
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuLabel, {
				className: "flex items-center gap-2 text-xs font-medium text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-3.5 w-3.5 text-primary" }), "Bishoftu · Hub 01 (production)"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
				onClick: () => void handleSignOut(),
				className: "gap-2 text-destructive focus:text-destructive",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4" }), "Sign out"]
			})
		]
	})] });
}
var NAV_GROUPS = [
	{
		label: "Operations",
		items: [
			{
				to: "/admin",
				label: "Dashboard",
				icon: LayoutDashboard
			},
			{
				to: "/admin/ops?tab=orders",
				label: "Orders",
				icon: ClipboardList
			},
			{
				to: "/admin/map",
				label: "Live Delivery Map",
				icon: Map
			}
		]
	},
	{
		label: "Network",
		items: [
			{
				to: "/admin/riders",
				label: "Riders",
				icon: Bike
			},
			{
				to: "/admin/ops?tab=shops",
				label: "Merchants",
				icon: Store
			},
			{
				to: "/admin/ops?tab=customers",
				label: "Customers",
				icon: Users
			},
			{
				to: "/admin/ops?tab=products",
				label: "Products",
				icon: Package
			},
			{
				to: "/admin/ops?tab=categories",
				label: "Categories",
				icon: Tags
			}
		]
	},
	{
		label: "Finance",
		items: [
			{
				to: "/admin/ops?tab=payments",
				label: "Payments",
				icon: ShieldCheck
			},
			{
				to: "/admin/financials",
				label: "Financials & Earnings",
				icon: Wallet
			},
			{
				to: "/admin/ops?tab=financials",
				label: "Reports",
				icon: Percent
			}
		]
	},
	{
		label: "Platform",
		items: [
			{
				to: "/admin/ops?tab=offers",
				label: "Offers & Coupons",
				icon: Percent
			},
			{
				to: "/notifications",
				label: "Notifications",
				icon: Bell
			},
			{
				to: "/admin/ops?tab=settings",
				label: "Settings",
				icon: Settings
			},
			{
				to: "/admin/ops?tab=system",
				label: "System Users",
				icon: Wrench
			}
		]
	}
];
function AdminShell({ children }) {
	const [collapsed, setCollapsed] = (0, import_react.useState)(false);
	const [searchOpen, setSearchOpen] = (0, import_react.useState)(false);
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { data: settings = {} } = useQuery(publicSettingsQuery);
	const dispatchPaused = settings["platform"]?.dispatch_paused === true;
	const { data: pendingCount = 0 } = useQuery({
		queryKey: ["admin-pending-count"],
		refetchInterval: 3e4,
		queryFn: async () => {
			const { count } = await supabase.from("orders").select("id", {
				count: "exact",
				head: true
			}).in("status", [
				"pending_payment",
				"pending",
				"payment_verification"
			]);
			return count ?? 0;
		}
	});
	(0, import_react.useEffect)(() => {
		const handler = (e) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setSearchOpen((v) => !v);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-screen bg-surface",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: `sticky top-0 flex h-screen flex-col border-r border-border bg-card transition-all ${collapsed ? "w-14" : "w-60"}`,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-2 border-b border-border px-3 py-4",
				children: [!collapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-lg font-extrabold text-primary",
					children: "LIGO Admin"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: "Bishoftu · Hub 01"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					"aria-label": collapsed ? "Expand sidebar" : "Collapse sidebar",
					onClick: () => setCollapsed((v) => !v),
					className: "rounded-md p-1.5 text-muted-foreground hover:bg-secondary",
					children: collapsed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-4 w-4" })
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "flex-1 space-y-4 overflow-y-auto p-2",
				children: NAV_GROUPS.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [!collapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
					children: group.label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-0.5",
					children: group.items.map((item) => {
						const [to] = item.to.split("?");
						const active = item.to === "/admin" ? pathname === "/admin" : pathname === to;
						const linkProps = {
							to,
							...item.to.includes("?tab=") ? { search: { tab: item.to.split("tab=")[1] } } : {}
						};
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							...linkProps,
							className: `flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors ${active ? "bg-primary-soft text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`,
							title: item.label,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, { className: "h-4 w-4 shrink-0" }),
								!collapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate",
									children: item.label
								}),
								!collapsed && item.label === "Orders" && pendingCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground",
									children: pendingCount
								})
							]
						}) }, item.to);
					})
				})] }, group.label))
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-w-0 flex-1 flex-col",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card px-4 py-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setSearchOpen(true),
							className: "flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-muted-foreground hover:border-primary/50",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "h-4 w-4" }),
								"Search orders, riders, shops…",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
									className: "ml-auto rounded border border-border bg-background px-1.5 text-[10px] font-semibold",
									children: "⌘K"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: `ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${dispatchPaused ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-accent-foreground"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge, { className: "h-3.5 w-3.5" }), dispatchPaused ? "Dispatch Paused" : "All Systems Operational"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotificationsCenter, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminUserMenu, {})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminCommandSearch, {
					open: searchOpen,
					onOpenChange: setSearchOpen
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: "flex-1 p-4 lg:p-6",
					children
				})
			]
		})]
	});
}
function AdminLayout() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminGate, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) }) });
}
//#endregion
export { AdminLayout as component };
