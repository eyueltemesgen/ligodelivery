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
import { toast } from "@/lib/toast";
import { AccountHeader } from "@/components/account/AccountShell";
import { StatusBadge } from "@/components/account/OrderCard";
import { AccountState, CardSkeleton, ErrorState, ListSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, type TranslationKey } from "@/lib/i18n";

export const Route = createFileRoute("/account/")({
  head: () => ({
    meta: [
      { title: translations.en.aci_meta_title },
      {
        name: "description",
        content: translations.en.aci_meta_desc,
      },
    ],
  }),
  component: AccountOverview,
});

function AccountOverview() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { data: summary, isLoading, isError, refetch } = useQuery(accountSummaryQuery(user?.id));
  const { data: recent = [] } = useQuery(recentProductsQuery(user?.id));
  const { add } = useCart();

  const activeOrder = summary?.activeOrder ?? null;

  const stats: {
    labelKey: TranslationKey;
    value: string | number;
    to: string;
    icon: typeof Package;
  }[] = [
    {
      labelKey: "acct_stat_orders",
      value: summary?.totalOrders ?? 0,
      to: "/account/orders",
      icon: Package,
    },
    {
      labelKey: "acct_stat_saved",
      value: summary?.wishlistCount ?? 0,
      to: "/account/wishlist",
      icon: Heart,
    },
    {
      labelKey: "acct_stat_addresses",
      value: summary?.addressCount ?? 0,
      to: "/account/addresses",
      icon: MapPin,
    },
    {
      labelKey: "acct_stat_spent",
      value: ETB(summary?.totalSpent ?? 0),
      to: "/account/orders",
      icon: Wallet,
    },
  ];

  return (
    <>
      <AccountHeader
        title={`${t("acct_hi")}${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        description={t("acct_overview_desc")}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/account/profile">
              <User className="mr-1.5 h-4 w-4" />
              {t("acct_edit_profile")}
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
                {t("acct_active_order")}
              </p>
              <p className="font-display text-lg font-bold">{activeOrder.order_code}</p>
            </div>
            <StatusBadge status={activeOrder.status} />
          </div>
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                {t("acct_placed_on", { date: formatDate(activeOrder.created_at) })}
              </p>
              <p className="text-muted-foreground">
                {activeOrder.delivery_address ?? t("acct_address_on_file")}
              </p>
              <p className="font-display text-base font-bold">{ETB(activeOrder.total)}</p>
            </div>
            <div className="flex flex-wrap items-start gap-2 sm:justify-end">
              <Button asChild>
                <Link to="/account/orders/$orderId" params={{ orderId: activeOrder.id }}>
                  {t("oc_track_order")}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/account/orders">{t("acct_all_orders")}</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <AccountState
          icon={ShoppingCart}
          title={t("acct_no_active_title")}
          description={t("acct_no_active_desc")}
          action={
            <Button asChild>
              <Link to="/shops">{t("acct_start_shopping")}</Link>
            </Button>
          }
        />
      )}

      {/* Address recommendation — new accounts have no saved address yet */}
      {!isLoading && summary?.addressCount === 0 && (
        <section className="flex flex-wrap items-center gap-4 rounded-xl border border-primary/30 bg-primary-soft/50 p-5 shadow-card">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <MapPin className="h-5 w-5" />
          </span>
          <div className="min-w-[12rem] flex-1">
            <p className="font-display font-bold">{t("acct_addr_prompt_title")}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("acct_addr_prompt_desc")}</p>
          </div>
          <Button asChild>
            <Link to="/account/addresses">
              <Plus className="mr-1.5 h-4 w-4" />
              {t("acct_addr_prompt_cta")}
            </Link>
          </Button>
        </section>
      )}

      {/* Quick stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.labelKey}
            to={s.to}
            className="rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
          >
            <s.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 font-display text-xl font-extrabold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{t(s.labelKey)}</p>
          </Link>
        ))}
      </section>

      {/* Recent orders */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-lg font-bold">{t("acct_recent_orders")}</h2>
          <Link to="/account/orders" className="text-sm font-medium text-primary">
            {t("home_see_all")}
          </Link>
        </div>
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : (summary?.orders ?? []).length === 0 ? (
          <AccountState
            icon={Package}
            title={t("acct_no_orders_title")}
            description={t("acct_no_orders_desc")}
            action={
              <Button asChild>
                <Link to="/shops">{t("acct_browse_shops")}</Link>
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
            <h2 className="font-display text-lg font-bold">{t("acct_buy_again")}</h2>
            <Link to="/account/orders" className="text-sm font-medium text-primary">
              {t("acct_order_history")}
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
                  width={480}
                  height={144}
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
                        shopName: t("oc_shop_fallback"),
                        name: p.product_name,
                        imagePath: p.image_url,
                        unitPrice: Number(p.unit_price),
                        options: [],
                      });
                      toast.success(t("acct_added_to_cart", { name: p.product_name }));
                    }}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t("common_add")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Shortcuts */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">{t("acct_quick_actions")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { to: "/shops", labelKey: "acct_browse_shops", icon: Store },
            { to: "/account/addresses", labelKey: "acct_manage_addresses", icon: MapPin },
            { to: "/account/notifications", labelKey: "acct_notif_title", icon: Bell },
            { to: "/account/help", labelKey: "acct_get_help", icon: ArrowRight },
          ].map((a) => (
            <Link
              key={a.labelKey}
              to={a.to}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm font-medium shadow-card transition-colors hover:border-primary/40"
            >
              <a.icon className="h-4 w-4 text-primary" />
              <span className="truncate">{t(a.labelKey as TranslationKey)}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
