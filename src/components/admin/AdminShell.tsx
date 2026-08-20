import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  Bike,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  Map as MapIcon,
  Package,
  Percent,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Tags,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { publicSettingsQuery } from "@/lib/queries";
import { AdminCommandSearch } from "@/components/admin/CommandSearch";
import { NotificationsCenter } from "@/components/admin/NotificationsCenter";
import { AdminUserMenu } from "@/components/admin/AdminUserMenu";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Operations",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/ops?tab=orders", label: "Orders", icon: ClipboardList },
      { to: "/admin/map", label: "Live Delivery Map", icon: MapIcon },
    ],
  },
  {
    label: "Network",
    items: [
      { to: "/admin/riders", label: "Riders", icon: Bike },
      { to: "/admin/ops?tab=shops", label: "Merchants", icon: Store },
      { to: "/admin/ops?tab=customers", label: "Customers", icon: Users },
      { to: "/admin/ops?tab=products", label: "Products", icon: Package },
      { to: "/admin/ops?tab=categories", label: "Categories", icon: Tags },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/admin/ops?tab=payments", label: "Payments", icon: ShieldCheck },
      { to: "/admin/financials", label: "Financials & Earnings", icon: Wallet },
      { to: "/admin/ops?tab=financials", label: "Reports", icon: Percent },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/admin/ops?tab=offers", label: "Offers & Coupons", icon: Percent },
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/admin/ops?tab=settings", label: "Settings", icon: Settings },
      { to: "/admin/ops?tab=system", label: "System Users", icon: Wrench },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: settings = {} } = useQuery(publicSettingsQuery);
  const dispatchPaused =
    (settings["platform"] as { dispatch_paused?: boolean } | undefined)?.dispatch_paused === true;

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["admin-pending-count"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending_payment", "pending", "payment_verification"]);
      return count ?? 0;
    },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex min-h-screen bg-surface">
      <aside
        className={`sticky top-0 flex h-screen flex-col border-r border-border bg-card transition-all ${
          collapsed ? "w-14" : "w-60"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-4">
          {!collapsed && (
            <div>
              <p className="font-display text-lg font-extrabold text-primary">LIGO Admin</p>
              <p className="text-xs text-muted-foreground">Bishoftu · Hub 01</p>
            </div>
          )}
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const [to] = item.to.split("?") as [string];
                  const active = item.to === "/admin" ? pathname === "/admin" : pathname === to;
                  // Nav entries span routes with different search schemas (ops tabs
                  // vs dashboard range), so the link props stay loosely typed here.
                  const linkProps = {
                    to,
                    ...(item.to.includes("?tab=")
                      ? { search: { tab: item.to.split("tab=")[1] } }
                      : {}),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  } as any;
                  return (
                    <li key={item.to}>
                      <Link
                        {...linkProps}
                        className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-primary-soft text-accent-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                        title={item.label}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!collapsed && item.label === "Orders" && pendingCount > 0 && (
                          <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                            {pendingCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-muted-foreground hover:border-primary/50"
          >
            <Search className="h-4 w-4" />
            Search orders, riders, shops…
            <kbd className="ml-auto rounded border border-border bg-background px-1.5 text-[10px] font-semibold">
              ⌘K
            </kbd>
          </button>
          <span
            className={`ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              dispatchPaused
                ? "bg-destructive/10 text-destructive"
                : "bg-primary-soft text-accent-foreground"
            }`}
          >
            <Gauge className="h-3.5 w-3.5" />
            {dispatchPaused ? "Dispatch Paused" : "All Systems Operational"}
          </span>
          <NotificationsCenter />
          <AdminUserMenu />
        </header>
        <AdminCommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
