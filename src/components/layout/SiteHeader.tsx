import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { LanguageSwitcher, LanguageSwitcherInline } from "@/components/layout/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { CartDrawer, CartTrigger } from "@/components/ligo/CartDrawer";
import { useQuery } from "@tanstack/react-query";
import { siteContentQuery } from "@/lib/content";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/categories", key: "nav.categories" },
  { to: "/shops", key: "nav.shops" },
  { to: "/special-moments", key: "nav.specialMoments" },
  { to: "/offers", key: "nav.offers" },
  { to: "/account/orders", key: "nav.trackOrder" },
];

export function SiteHeader() {
  const { user, profile, isAdmin, isRider, isMerchant, signOut } = useAuth();
  const { data: content } = useQuery(siteContentQuery);
  const { t } = useI18n();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

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
            placeholder={t("search.placeholder")}
            className="h-10 pl-9"
            aria-label={t("search.aria")}
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
          <LanguageSwitcher />
          <ThemeToggle />
          <CartTrigger onOpen={() => setCartOpen(true)} />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {profile?.full_name?.split(" ")[0] || t("nav.account")}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>{profile?.full_name || user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account">
                    <User className="mr-2 h-4 w-4" />
                    {t("nav.myAccount")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/orders">
                    <Package className="mr-2 h-4 w-4" />
                    {t("nav.myOrders")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/service-requests">
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t("nav.specialMoments")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/wishlist">
                    <Heart className="mr-2 h-4 w-4" />
                    {t("nav.savedProducts")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/addresses">
                    <MapPin className="mr-2 h-4 w-4" />
                    {t("nav.addresses")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/notifications">
                    <Bell className="mr-2 h-4 w-4" />
                    {t("nav.notifications")}
                  </Link>
                </DropdownMenuItem>
                {isRider && (
                  <DropdownMenuItem asChild>
                    <Link to="/rider">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      {t("nav.riderPortal")}
                    </Link>
                  </DropdownMenuItem>
                )}
                {isMerchant && (
                  <DropdownMenuItem asChild>
                    <Link to="/merchant">
                      <Store className="mr-2 h-4 w-4" />
                      {t("nav.merchantPortal")}
                    </Link>
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      {t("nav.adminDashboard")}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("action.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/login">{t("action.signIn")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">{t("action.signUp")}</Link>
              </Button>
            </div>
          )}
          <button
            className="rounded-md p-2 transition-all duration-100 hover:bg-secondary active:scale-95 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={t("nav.menu")}
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
            placeholder={t("search.ariaShort")}
            className="h-10 pl-9"
            aria-label={t("search.ariaShort")}
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
              {t("nav.becomeRider")}
            </Link>
            <LanguageSwitcherInline className="mt-2" />
          </div>
        </nav>
      )}
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}

export function MobileTabBar() {
  const { count } = useCart();
  const { t } = useI18n();
  const tabs = [
    { to: "/", key: "nav.home", icon: Home },
    { to: "/shops", key: "nav.shops", icon: Store },
    { to: "/cart", key: "nav.cart", icon: ShoppingCart, badge: count },
    { to: "/account/orders", key: "nav.orders", icon: Package },
    { to: "/account", key: "nav.account", icon: User },
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
              {t(tab.key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
