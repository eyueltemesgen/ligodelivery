import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  Heart,
  MapPin,
  Package,
  Plus,
  ShoppingCart,
  Store,
  User,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { accountSummaryQuery, recentProductsQuery } from "@/lib/account";
import { useCart } from "@/lib/cart";
import { ETB, formatDate } from "@/lib/format";
import { StorageImage } from "@/lib/media";
import { toast } from "sonner";
import { AccountHeader } from "@/components/account/AccountShell";
import { StatusBadge } from "@/components/account/OrderCard";
import { AccountState, CardSkeleton, ErrorState, ListSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/account/")({
  head: () => ({
    meta: [
      { title: "Account overview — የኔ Go" },
      {
        name: "description",
        content: "What's happening with your የኔ Go account: active orders, saved items and totals.",
      },
    ],
  }),
  component: AccountOverview,
});

function AccountOverview() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const { data: summary, isLoading, isError, refetch } = useQuery(accountSummaryQuery(user?.id));
  const { data: recent = [] } = useQuery(recentProductsQuery(user?.id));
  const { add } = useCart();

  const activeOrder = summary?.activeOrder ?? null;

  const stats = [
    { label: t("account.ordersStat"), value: summary?.totalOrders ?? 0, to: "/account/orders", icon: Package },
    {
      label: t("account.savedStat"),
      value: summary?.wishlistCount ?? 0,
      to: "/account/wishlist",
      icon: Heart,
    },
    {
      label: t("account.addressesStat"),
      value: summary?.addressCount ?? 0,
      to: "/account/addresses",
      icon: MapPin,
    },
    {
      label: t("account.totalSpent"),
      value: ETB(summary?.totalSpent ?? 0),
      to: "/account/orders",
      icon: Wallet,
    },
  ];

  return (
    <>
      <AccountHeader
        title={`${t("account.greeting")}${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        description={t("account.overviewDesc")}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/account/profile">
              <User className="mr-1.5 h-4 w-4" />
              {t("account.editProfile")}
            </Link>
          </Button>
        }
      />

      {/* Active order spotlight */}
      {isLoading ? (
        <CardSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : activeOrder ? (
        <section className="overflow-hidden rounded-xl border border-primary/30 bg-primary-soft/60 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 px-5 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                {t("account.activeOrder")}
              </p>
              <p className="font-display text-lg font-bold">{activeOrder.order_code}</p>
            </div>
            <StatusBadge status={activeOrder.status} />
          </div>
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                {t("account.placedOn", { date: formatDate(activeOrder.created_at) })}
              </p>
              <p className="text-muted-foreground">
                {activeOrder.delivery_address ?? t("account.deliveryAddressOnFile")}
              </p>
              <p className="font-display text-base font-bold">{ETB(activeOrder.total)}</p>
            </div>
            <div className="flex flex-wrap items-start gap-2 sm:justify-end">
              <Button asChild>
                <Link to="/account/orders/$orderId" params={{ orderId: activeOrder.id }}>
                  {t("action.trackOrder")}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/account/orders">{t("account.allOrders")}</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <AccountState
          icon={ShoppingCart}
          title={t("account.noActiveOrders")}
          description={t("account.noActiveOrdersDesc")}
          action={
            <Button asChild>
              <Link to="/shops">{t("action.startShopping")}</Link>
            </Button>
          }
        />
      )}

      {/* Quick stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
          >
            <s.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 font-display text-xl font-extrabold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Link>
        ))}
      </section>

      {/* Recent orders */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-lg font-bold">{t("account.recentOrders")}</h2>
          <Link to="/account/orders" className="text-sm font-medium text-primary">
            {t("account.viewAll")}
          </Link>
        </div>
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : (summary?.orders ?? []).length === 0 ? (
          <AccountState
            icon={Package}
            title={t("account.noOrders")}
            description={t("account.noOrdersDesc")}
            action={
              <Button asChild>
                <Link to="/shops">{t("action.browseShops")}</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {summary!.orders.slice(0, 4).map((o) => (
              <li key={o.id}>
                <Link
                  to="/account/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card transition-colors hover:border-primary/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-bold">{o.order_code}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
                  </div>
                  <span className="hidden sm:block">
                    <StatusBadge status={o.status} />
                  </span>
                  <span className="text-sm font-semibold">{ETB(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Buy again */}
      {recent.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-lg font-bold">{t("account.buyAgain")}</h2>
            <Link to="/account/orders" className="text-sm font-medium text-primary">
              {t("account.orderHistory")}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recent.slice(0, 4).map((p) => (
              <div
                key={p.product_id}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
              >
                <StorageImage
                  path={p.image_url}
                  alt={p.product_name}
                  className="h-24 w-full object-cover"
                />
                <div className="space-y-2 p-3">
                  <p className="line-clamp-1 text-sm font-semibold">{p.product_name}</p>
                  <p className="text-sm font-bold">{ETB(p.unit_price)}</p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      add({
                        productId: p.product_id!,
                        shopId: "",
                        shopName: t("account.shopFallback"),
                        name: p.product_name,
                        imagePath: p.image_url,
                        unitPrice: Number(p.unit_price),
                      });
                      toast.success(t("account.addedToCart", { product: p.product_name }));
                    }}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t("action.add")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Shortcuts */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">{t("account.quickActions")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { to: "/shops", label: t("action.browseShops"), icon: Store },
            { to: "/account/addresses", label: t("account.manageAddresses"), icon: MapPin },
            { to: "/account/notifications", label: t("nav.notifications"), icon: Bell },
            { to: "/account/help", label: t("account.getHelp"), icon: ArrowRight },
          ].map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm font-medium shadow-card transition-colors hover:border-primary/40"
            >
              <a.icon className="h-4 w-4 text-primary" />
              <span className="truncate">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
