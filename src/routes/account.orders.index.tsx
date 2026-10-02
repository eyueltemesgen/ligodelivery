import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ordersQuery } from "@/lib/account";
import { ORDER_TABS, matchesOrderTab, tabCounts, type OrderTab } from "@/lib/orders";
import { AccountHeader } from "@/components/account/AccountShell";
import { OrderCard } from "@/components/account/OrderCard";
import { AccountState, ErrorState, ListSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/orders/")({
  head: () => ({
    meta: [
      { title: "My orders — Ligo Delivery" },
      {
        name: "description",
        content: "Track current and past Ligo deliveries, reorder favourites and manage payments.",
      },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<OrderTab>("all");
  const { data = [], isLoading, isError, refetch } = useQuery(ordersQuery(user?.id));

  const counts = useMemo(() => tabCounts(data.map((o) => o.status)), [data]);
  const filtered = useMemo(() => data.filter((o) => matchesOrderTab(o.status, tab)), [data, tab]);

  return (
    <>
      <AccountHeader
        title="My orders"
        description="Every Ligo order you've placed, with live status and actions."
      />

      {/* Status filter — horizontally scrollable on mobile */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div role="tablist" aria-label="Filter orders by status" className="flex w-max gap-2 pb-1">
          {ORDER_TABS.map((t) => {
            const active = tab === t.id;
            const count = counts[t.id];
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40",
                )}
              >
                {t.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-xs font-bold",
                      active ? "bg-primary-foreground/20" : "bg-secondary",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <AccountState
          icon={data.length === 0 ? ShoppingCart : Package}
          title={data.length === 0 ? "No orders yet" : `No ${tab.replace(/_/g, " ")} orders`}
          description={
            data.length === 0
              ? "Place your first order and it will show up here with live tracking."
              : "Nothing matches this filter right now. Try another status."
          }
          action={
            data.length === 0 ? (
              <Button asChild>
                <Link to="/shops">Browse shops</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setTab("all")}>
                Show all orders
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </>
  );
}
