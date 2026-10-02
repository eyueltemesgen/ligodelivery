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

export const Route = createFileRoute("/account/")({
  head: () => ({
    meta: [
      { title: "Account overview — Ligo Delivery" },
      {
        name: "description",
        content: "What's happening with your Ligo account: active orders, saved items and totals.",
      },
    ],
  }),
  component: AccountOverview,
});

function AccountOverview() {
  const { user, profile } = useAuth();
  const { data: summary, isLoading, isError, refetch } = useQuery(accountSummaryQuery(user?.id));
  const { data: recent = [] } = useQuery(recentProductsQuery(user?.id));
  const { add } = useCart();

  const activeOrder = summary?.activeOrder ?? null;

  const stats = [
    { label: "Orders", value: summary?.totalOrders ?? 0, to: "/account/orders", icon: Package },
    {
      label: "Saved products",
      value: summary?.wishlistCount ?? 0,
      to: "/account/wishlist",
      icon: Heart,
    },
    {
      label: "Addresses",
      value: summary?.addressCount ?? 0,
      to: "/account/addresses",
      icon: MapPin,
    },
    {
      label: "Total spent",
      value: ETB(summary?.totalSpent ?? 0),
      to: "/account/orders",
      icon: Wallet,
    },
  ];

  return (
    <>
      <AccountHeader
        title={`Hi${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        description="Here's what's happening with your account and orders."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/account/profile">
              <User className="mr-1.5 h-4 w-4" />
              Edit profile
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
                Active order
              </p>
              <p className="font-display text-lg font-bold">{activeOrder.order_code}</p>
            </div>
            <StatusBadge status={activeOrder.status} />
          </div>
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">Placed {formatDate(activeOrder.created_at)}</p>
              <p className="text-muted-foreground">
                {activeOrder.delivery_address ?? "Delivery address on file"}
              </p>
              <p className="font-display text-base font-bold">{ETB(activeOrder.total)}</p>
            </div>
            <div className="flex flex-wrap items-start gap-2 sm:justify-end">
              <Button asChild>
                <Link to="/account/orders/$orderId" params={{ orderId: activeOrder.id }}>
                  Track order
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/account/orders">All orders</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <AccountState
          icon={ShoppingCart}
          title="No active orders"
          description="When you place an order you'll be able to follow it here from confirmation to your door."
          action={
            <Button asChild>
              <Link to="/shops">Start shopping</Link>
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
          <h2 className="font-display text-lg font-bold">Recent orders</h2>
          <Link to="/account/orders" className="text-sm font-medium text-primary">
            View all
          </Link>
        </div>
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : (summary?.orders ?? []).length === 0 ? (
          <AccountState
            icon={Package}
            title="No orders yet"
            description="Your first order will appear here once you check out."
            action={
              <Button asChild>
                <Link to="/shops">Browse shops</Link>
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
            <h2 className="font-display text-lg font-bold">Buy again</h2>
            <Link to="/account/orders" className="text-sm font-medium text-primary">
              Order history
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
                        shopName: "Shop",
                        name: p.product_name,
                        imagePath: p.image_url,
                        unitPrice: Number(p.unit_price),
                      });
                      toast.success(`${p.product_name} added to cart`);
                    }}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Shortcuts */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { to: "/shops", label: "Browse shops", icon: Store },
            { to: "/account/addresses", label: "Manage addresses", icon: MapPin },
            { to: "/account/notifications", label: "Notifications", icon: Bell },
            { to: "/account/help", label: "Get help", icon: ArrowRight },
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
