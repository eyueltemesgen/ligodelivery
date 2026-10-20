import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  User,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useCart } from "@/lib/cart";
import { CartDrawer, CartTrigger } from "@/components/ligo/CartDrawer";
import { useAssistant } from "@/components/assistant/AssistantProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { siteContentQuery } from "@/lib/content";
import { accountSummaryQuery } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/categories", key: "nav_categories" },
  { to: "/shops", key: "nav_shops" },
  { to: "/special-moments", key: "nav_special_moments" },
  { to: "/offers", key: "nav_offers" },
  { to: "/account/orders", key: "nav_track_order" },
] as const;

export function SiteHeader() {
  const { user, profile, isAdmin, isRider, isMerchant, signOut } = useAuth();
  const { data: content } = useQuery(siteContentQuery);
  const { data: summary } = useQuery(accountSummaryQuery(user?.id));
  const unread = summary?.unreadNotifications ?? 0;
  const qc = useQueryClient();
  const { t } = useLanguage();
  const { setOpen: setAssistantOpen } = useAssistant();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // A new notification should light the badge without a reload, since the whole
  // point is to reach a customer who is not sitting on the notifications page.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`header-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void qc.invalidateQueries({ queryKey: ["account-summary", user.id] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q: term } });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md dark:bg-zinc-950/80">
      <div className="container-ligo flex h-16 items-center gap-4">
        <Logo />
        <div className="hidden items-center gap-1 text-sm text-muted-foreground lg:flex">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">{content?.city}</span>
        </div>
        <form onSubmit={submit} className="relative hidden flex-1 md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t("search_placeholder")}
            className="h-10 pl-9"
            aria-label={t("search_label")}
          />
        </form>
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {t(n.key)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            aria-label={t("ai_header_label")}
            className="hidden rounded-md p-2 text-muted-foreground transition-all duration-100 hover:bg-secondary active:scale-95 sm:block"
          >
            <Sparkles className="h-5 w-5" />
          </button>
          <LanguageToggle />
          <ThemeToggle />
          <CartTrigger onOpen={() => setCartOpen(true)} />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {profile?.full_name?.split(" ")[0] || "Account"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>{profile?.full_name || user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account">
                    <User className="mr-2 h-4 w-4" />
                    {t("my_account")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/orders">
                    <Package className="mr-2 h-4 w-4" />
                    {t("my_orders")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/service-requests">
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t("nav_special_moments")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/wishlist">
                    <Heart className="mr-2 h-4 w-4" />
                    {t("saved_products")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/addresses">
                    <MapPin className="mr-2 h-4 w-4" />
                    {t("addresses")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/notifications">
                    <span className="relative mr-2">
                      <Bell className="h-4 w-4" />
                      {unread > 0 ? (
                        <span
                          aria-hidden
                          className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold leading-none text-destructive-foreground"
                        >
                          {unread > 9 ? "9+" : unread}
                        </span>
                      ) : null}
                    </span>
                    {t("notifications")}
                    {unread > 0 ? (
                      <span className="sr-only">{t("hd_notif_unread", { count: unread })}</span>
                    ) : null}
                  </Link>
                </DropdownMenuItem>
                {isRider && (
                  <DropdownMenuItem asChild>
                    <Link to="/rider">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      {t("rider_portal")}
                    </Link>
                  </DropdownMenuItem>
                )}
                {isMerchant && (
                  <DropdownMenuItem asChild>
                    <Link to="/merchant">
                      <Store className="mr-2 h-4 w-4" />
                      {t("merchant_portal")}
                    </Link>
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      {t("admin_dashboard")}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("sign_out")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/login">{t("login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">{t("sign_up")}</Link>
              </Button>
            </div>
          )}
          <button
            className="rounded-md p-2 transition-all duration-100 hover:bg-secondary active:scale-95 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={t("menu")}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="container-ligo pb-3 md:hidden">
        <form onSubmit={submit} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t("search_label")}
            className="h-10 pl-9"
            aria-label={t("search_label")}
          />
        </form>
      </div>
      {open && (
        <nav className="border-t border-border bg-background lg:hidden">
          <div className="container-ligo grid gap-1 py-3">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
                {t(n.key)}
              </Link>
            ))}
            <Link
              to="/rider/join"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
            >
              {t("become_rider")}
            </Link>
          </div>
        </nav>
      )}
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}

export function MobileTabBar() {
  const { count } = useCart();
  const { t } = useLanguage();
  const tabs = [
    { to: "/", label: t("tab_home"), icon: Home },
    { to: "/shops", label: t("tab_shops"), icon: Store },
    { to: "/cart", label: t("tab_cart"), icon: ShoppingCart, badge: count },
    { to: "/account/orders", label: t("tab_orders"), icon: Package },
    { to: "/account", label: t("tab_account"), icon: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:hidden">
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => (
          <li key={tab.to}>
            <Link
              to={tab.to}
              className="flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: tab.to === "/" }}
            >
              <span className="relative">
                <tab.icon className="h-5 w-5" />
                {!!tab.badge && (
                  <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                    {tab.badge}
                  </span>
                )}
              </span>
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
