import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, PackageCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { STATUS_LABEL_KEY, timelineIndex, type OrderStatus } from "@/lib/orders";
import { useLanguage } from "@/hooks/useLanguage";
import type { TranslationKey } from "@/lib/i18n";

const ACTIVE_STEPS: readonly { key: string; labelKey: TranslationKey }[] = [
  { key: "pending_payment", labelKey: "banner_placed" },
  { key: "preparing", labelKey: "banner_preparing" },
  { key: "picked_up", labelKey: "banner_on_the_way" },
  { key: "delivered", labelKey: "banner_delivered" },
];

/** Home-page banner tracking the customer's most recent in-flight order. */
export function ActiveOrderBanner() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: order } = useQuery({
    queryKey: ["active-order-banner", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,order_code,status,total")
        .eq("customer_id", user!.id)
        .not("status", "in", '("delivered","cancelled")')
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`active-order-banner-${user.id}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["active-order-banner"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, qc]);

  if (!order) return null;

  const idx = Math.min(
    timelineIndex(order.status) >= 7 ? 2 : timelineIndex(order.status) >= 2 ? 1 : 0,
    2,
  );

  return (
    <Link
      to="/orders/$orderId"
      params={{ orderId: order.id }}
      className="block rounded-2xl border border-primary/30 bg-primary-soft p-4 shadow-card transition-shadow hover:shadow-pop"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <PackageCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-accent-foreground">
              {t("banner_status", {
                code: order.order_code,
                status: t(
                  STATUS_LABEL_KEY[order.status as OrderStatus] ?? "order_status_pending_payment",
                ),
              })}
            </p>
            <p className="text-xs text-accent-foreground/80">{t("banner_tap")}</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-accent-foreground" />
      </div>
      <ol className="mt-3 flex items-center gap-1.5">
        {ACTIVE_STEPS.map((s, i) => (
          <li key={s.key} className="flex flex-1 flex-col gap-1">
            <span className={`h-1.5 rounded-full ${i <= idx ? "bg-primary" : "bg-primary/20"}`} />
            <span
              className={`text-[10px] font-medium ${
                i <= idx ? "text-accent-foreground" : "text-accent-foreground/60"
              }`}
            >
              {t(s.labelKey)}
            </span>
          </li>
        ))}
      </ol>
    </Link>
  );
}
