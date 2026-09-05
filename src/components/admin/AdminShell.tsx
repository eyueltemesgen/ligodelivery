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
  Menu,
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
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
        className={`sticky top-0 hidden h-screen flex-col border-r border-border bg-card transition-all md:flex ${
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((v) => !v)}
            className="h-8 w-8 text-muted-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
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

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="flex w-[86vw] max-w-xs flex-col p-0 md:hidden">
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle className="font-display text-primary">LIGO Admin</SheetTitle>
            <SheetDescription>Bishoftu · Hub 01</SheetDescription>
          </SheetHeader>
          <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const [to] = item.to.split("?") as [string];
                    const active = item.to === "/admin" ? pathname === "/admin" : pathname === to;
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
                          onClick={() => setMobileNavOpen(false)}
                          className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                            active
                              ? "bg-primary-soft text-accent-foreground"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {item.label === "Orders" && pendingCount > 0 && (
                            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
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
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-card px-3 py-2.5 md:px-4 md:py-3">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 md:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Open admin menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-extrabold text-primary">LIGO Admin</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {dispatchPaused ? "Dispatch paused" : "All systems operational"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <NotificationsCenter />
              <AdminUserMenu />
            </div>
          </div>
          <div className="mt-2 md:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSearchOpen(true)}
              className="h-10 w-full justify-start px-3 text-muted-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="truncate">Search orders, riders, shops…</span>
            </Button>
          </div>
          <div className="hidden items-center gap-3 md:flex">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSearchOpen(true)}
            className="h-9 w-full max-w-sm justify-start bg-surface px-3 text-muted-foreground hover:border-primary/50"
          >
            <Search className="h-4 w-4" />
            Search orders, riders, shops…
            <kbd className="ml-auto rounded border border-border bg-background px-1.5 text-[10px] font-semibold">
              ⌘K
            </kbd>
          </Button>
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
          </div>
        </header>
        <AdminCommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
        <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
