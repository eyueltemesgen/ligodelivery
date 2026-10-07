import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Sparkles,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { accountSummaryQuery } from "@/lib/account";
import { IdentityAvatar } from "@/components/ligo/IdentityAvatar";
import { useLanguage } from "@/hooks/useLanguage";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: "orders" | "wishlist" | "notifications";
};

const NAV: NavItem[] = [
  { to: "/account", labelKey: "acct_nav_overview", icon: LayoutDashboard },
  { to: "/account/orders", labelKey: "acct_orders_title", icon: Package, badgeKey: "orders" },
  { to: "/account/service-requests", labelKey: "acct_nav_special_moments", icon: Sparkles },
  { to: "/account/wishlist", labelKey: "acct_stat_saved", icon: Heart, badgeKey: "wishlist" },
  { to: "/account/addresses", labelKey: "acct_stat_addresses", icon: MapPin },
  { to: "/account/profile", labelKey: "acct_profile", icon: User },
  { to: "/account/notifications", labelKey: "acct_notif_title", icon: Bell, badgeKey: "notifications" },
  { to: "/account/help", labelKey: "acct_help_support", icon: HelpCircle },
];

export function AccountShell({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const { user, profile, signOut } = useAuth();
  const { data: summary } = useQuery(accountSummaryQuery(user?.id));

  const badgeFor = (key?: NavItem["badgeKey"]) => {
    if (!key || !summary) return 0;
    if (key === "orders") return summary.openOrders;
    if (key === "wishlist") return summary.wishlistCount;
    return summary.unreadNotifications;
  };

  return (
    <div className="container-ligo py-6 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
        <aside className="min-w-0 lg:sticky lg:top-20 lg:h-fit">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <IdentityAvatar
                path={profile?.avatar_url}
                name={profile?.full_name}
                className="h-11 w-11 text-base"
              />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold">
                  {profile?.full_name || t("acct_your_account")}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {profile?.phone || user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Desktop / tablet sidebar */}
          <nav className="mt-4 hidden rounded-xl border border-border bg-card p-2 shadow-card lg:block">
            <ul className="space-y-0.5">
              {NAV.map((item) => {
                const badge = badgeFor(item.badgeKey);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      activeOptions={{ exact: item.to === "/account" }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      activeProps={{ className: "bg-primary-soft text-accent-foreground" }}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{t(item.labelKey)}</span>
                      {badge > 0 && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
              <li className="pt-1">
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {t("acct_sign_out")}
                </button>
              </li>
            </ul>
          </nav>

          {/* Mobile horizontal nav */}
          <nav
            className="-mx-4 mt-4 overflow-x-auto px-4 pb-1 lg:hidden"
            aria-label={t("acct_account_sections")}
          >
            <ul className="flex gap-2">
              {NAV.map((item) => {
                const badge = badgeFor(item.badgeKey);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      activeOptions={{ exact: item.to === "/account" }}
                      className="relative flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground"
                      activeProps={{
                        className: "border-primary bg-primary-soft text-accent-foreground",
                      }}
                    >
                      <item.icon className="h-4 w-4" />
                      {t(item.labelKey)}
                      {badge > 0 && (
                        <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className={cn("min-w-0 space-y-6")}>{children}</div>
      </div>
    </div>
  );
}

/** Page title block used inside every account section. */
export function AccountHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
