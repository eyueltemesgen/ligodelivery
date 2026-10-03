import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ordersQuery } from "@/lib/account";
import { ORDER_TABS, ORDER_TAB_KEYS, matchesOrderTab, tabCounts, type OrderTab } from "@/lib/orders";
import { AccountHeader } from "@/components/account/AccountShell";
import { OrderCard } from "@/components/account/OrderCard";
import { AccountState, ErrorState, ListSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/orders/")({
  head: () => ({
    meta: [
      { title: "My orders — የኔ Go" },
      {
        name: "description",
        content: "Track current and past የኔ Go deliveries, reorder favourites and manage payments.",
      },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<OrderTab>("all");
  const { data = [], isLoading, isError, refetch } = useQuery(ordersQuery(user?.id));

  const counts = useMemo(() => tabCounts(data.map((o) => o.status)), [data]);
  const filtered = useMemo(() => data.filter((o) => matchesOrderTab(o.status, tab)), [data, tab]);

  return (
    <>
      <AccountHeader title={t("orders.title")} description={t("orders.subtitle")} />

      {/* Status filter — horizontally scrollable on mobile */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div
          role="tablist"
          aria-label={t("orders.filterAria")}
          className="flex w-max gap-2 pb-1"
        >
          {ORDER_TABS.map((tabItem) => {
            const active = tab === tabItem.id;
            const count = counts[tabItem.id];
            return (
              <button
                key={tabItem.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(tabItem.id)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40",
                )}
              >
                {t(ORDER_TAB_KEYS[tabItem.id])}
                {count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-bold",
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
          title={
            data.length === 0
              ? t("orders.noneYet")
              : t("orders.noneInFilter", { tab: t(ORDER_TAB_KEYS[tab]).toLowerCase() })
          }
          description={
            data.length === 0 ? t("orders.noneYetDesc") : t("orders.noneInFilterDesc")
          }
          action={
            data.length === 0 ? (
              <Button asChild>
                <Link to="/shops">{t("action.browseShops")}</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setTab("all")}>
                {t("action.showAllOrders")}
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
