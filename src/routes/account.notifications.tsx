import { translations } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { Bell, BellRing, CheckCheck, CreditCard, Package, ShieldCheck, Truck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { notificationsQuery, type NotificationRow } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { AccountHeader } from "@/components/account/AccountShell";
import { AccountState, ErrorState, ListSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

export const Route = createFileRoute("/account/notifications")({
  head: () => ({
    meta: [
      { title: translations.en.notif_meta_title },
      { name: "description", content: translations.en.notif_meta_desc },
    ],
  }),
  component: NotificationsPage,
});

function iconFor(type: string) {
  if (type.includes("payment")) return CreditCard;
  if (type.includes("deliver")) return Truck;
  if (type.includes("order")) return Package;
  if (type.includes("security") || type.includes("account")) return ShieldCheck;
  return Bell;
}

function NotificationsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [], isLoading, isError, refetch } = useQuery(notificationsQuery(user?.id));

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`account-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["notifications"] });
          void qc.invalidateQueries({ queryKey: ["account-summary"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const unread = data.filter((n) => !n.is_read);

  const markAllRead = async () => {
    if (!user || unread.length === 0) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    if (error) {
      toast.error(t("acct_notif_update_failed"));
      return;
    }
    void qc.invalidateQueries({ queryKey: ["notifications"] });
    void qc.invalidateQueries({ queryKey: ["account-summary"] });
  };

  const markRead = async (n: NotificationRow) => {
    if (n.is_read) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    void qc.invalidateQueries({ queryKey: ["notifications"] });
    void qc.invalidateQueries({ queryKey: ["account-summary"] });
  };

  return (
    <>
      <AccountHeader
        title={t("acct_notif_title")}
        description={t("acct_notif_desc")}
        action={
          unread.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
              <CheckCheck className="mr-1.5 h-4 w-4" />
              {t("acct_mark_all_read")}
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <AccountState
          icon={Bell}
          title={t("acct_notif_empty")}
          description={t("acct_notif_empty_desc")}
          action={
            <Button asChild variant="outline">
              <Link to="/account/orders">{t("acct_view_orders")}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {data.map((n) => {
            const Icon = iconFor(n.type);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void markRead(n)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-4 text-left shadow-card transition-colors",
                    n.is_read
                      ? "border-border bg-card"
                      : "border-primary/40 bg-primary-soft hover:border-primary",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                      n.is_read
                        ? "bg-secondary text-muted-foreground"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{n.title}</p>
                      {!n.is_read && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-label={t("acct_unread")}
                        />
                      )}
                    </div>
                    {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.created_at)}</p>
                  </div>
                  {n.order_id && (
                    <Link
                      to="/account/orders/$orderId"
                      params={{ orderId: n.order_id }}
                      className="shrink-0 text-xs font-semibold text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t("oc_view_order")}
                    </Link>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
