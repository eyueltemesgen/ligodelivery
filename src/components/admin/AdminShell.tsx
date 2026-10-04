import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
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
  Sparkles,
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
import { useI18n } from "@/lib/i18n";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type NavItem = { to: string; labelKey: string; icon: React.ComponentType<{ className?: string }> };

const NAV_GROUPS: { labelKey: string; items: NavItem[] }[] = [
  {
    labelKey: "admin.ops",
    items: [
      { to: "/admin", labelKey: "admin.dashboard", icon: LayoutDashboard },
      { to: "/admin/ops?tab=orders", labelKey: "admin.orders", icon: ClipboardList },
      { to: "/admin/map", labelKey: "admin.liveMap", icon: MapIcon },
    ],
  },
  {
    labelKey: "admin.network",
    items: [
      { to: "/admin/riders", labelKey: "admin.riders", icon: Bike },
      { to: "/admin/ops?tab=shops", labelKey: "admin.merchants", icon: Store },
      { to: "/admin/ops?tab=customers", labelKey: "admin.customers", icon: Users },
      { to: "/admin/ops?tab=products", labelKey: "admin.products", icon: Package },
      { to: "/admin/ops?tab=categories", labelKey: "admin.categories", icon: Tags },
      { to: "/admin/ops?tab=special-moments", labelKey: "nav.specialMoments", icon: Sparkles },
    ],
  },
  {
    labelKey: "admin.finance",
    items: [
      { to: "/admin/ops?tab=payments", labelKey: "admin.payments", icon: ShieldCheck },
      { to: "/admin/financials", labelKey: "admin.financials", icon: Wallet },
      { to: "/admin/reports", labelKey: "admin.reports", icon: BarChart3 },
    ],
  },
  {
    labelKey: "admin.platform",
    items: [
      { to: "/admin/ops?tab=offers", labelKey: "admin.offersCoupons", icon: Percent },
      { to: "/notifications", labelKey: "nav.notifications", icon: Bell },
      { to: "/admin/ops?tab=settings", labelKey: "admin.settings", icon: Settings },
      { to: "/admin/ops?tab=system", labelKey: "admin.systemUsers", icon: Wrench },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
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
              <p className="font-display text-lg font-extrabold text-primary">{t("brand.admin")}</p>
              <p className="text-xs text-muted-foreground">{t("admin.hub")}</p>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={collapsed ? t("admin.expandSidebar") : t("admin.collapseSidebar")}
            onClick={() => setCollapsed((v) => !v)}
            className="h-8 w-8 text-muted-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.labelKey}>
              {!collapsed && (
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(group.labelKey)}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const [to] = item.to.split("?") as [string];
                  const active = item.to === "/admin" ? pathname === "/admin" : pathname === to;
                  const label = t(item.labelKey);
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
                        title={label}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{label}</span>}
                        {!collapsed && item.labelKey === "admin.orders" && pendingCount > 0 && (
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
            <SheetTitle className="font-display text-primary">{t("brand.admin")}</SheetTitle>
            <SheetDescription>{t("admin.hub")}</SheetDescription>
          </SheetHeader>
          <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.labelKey}>
                <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(group.labelKey)}
                </p>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const [to] = item.to.split("?") as [string];
                    const active = item.to === "/admin" ? pathname === "/admin" : pathname === to;
                    const label = t(item.labelKey);
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
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                          {item.labelKey === "admin.orders" && pendingCount > 0 && (
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
              aria-label={t("admin.openMenu")}
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-extrabold text-primary">
                {t("brand.admin")}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {dispatchPaused ? t("admin.dispatchPaused") : t("admin.allSystems")}
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
              <span className="truncate">{t("admin.searchPlaceholder")}</span>
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
            {t("admin.searchPlaceholder")}
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
            {dispatchPaused ? t("admin.dispatchPausedTitle") : t("admin.allSystemsTitle")}
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
