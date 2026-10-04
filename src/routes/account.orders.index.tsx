import { translations } from "@/lib/i18n";
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
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/orders/")({
  head: () => ({
    meta: [
      { title: translations.en.aoi_meta_title },
      {
        name: "description",
        content: translations.en.aoi_meta_desc,
      },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab] = useState<OrderTab>("all");
  const { data = [], isLoading, isError, refetch } = useQuery(ordersQuery(user?.id));

  const counts = useMemo(() => tabCounts(data.map((o) => o.status)), [data]);
  const filtered = useMemo(() => data.filter((o) => matchesOrderTab(o.status, tab)), [data, tab]);

  return (
    <>
      <AccountHeader title={t("acct_orders_title")} description={t("acct_orders_desc")} />

      {/* Status filter — horizontally scrollable on mobile */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div role="tablist" aria-label={t("acct_filter_orders")} className="flex w-max gap-2 pb-1">
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
                {t(tabItem.labelKey)}
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
              ? t("acct_no_orders_title")
              : t("acct_no_tab_orders", {
                  tab: t(ORDER_TABS.find((x) => x.id === tab)?.labelKey ?? "order_tab_all"),
                })
          }
          description={data.length === 0 ? t("acct_first_order_desc") : t("acct_no_match_desc")}
          action={
            data.length === 0 ? (
              <Button asChild>
                <Link to="/shops">{t("acct_browse_shops")}</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setTab("all")}>
                {t("acct_show_all_orders")}
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
