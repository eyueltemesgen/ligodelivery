import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, PackageCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { STATUS_LABEL, timelineIndex, type OrderStatus } from "@/lib/orders";

const ACTIVE_STEPS = [
  { key: "pending_payment", label: "Placed" },
  { key: "preparing", label: "Preparing" },
  { key: "picked_up", label: "On the way" },
  { key: "delivered", label: "Delivered" },
] as const;

/** Home-page banner tracking the customer's most recent in-flight order. */
export function ActiveOrderBanner() {
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
      .channel(`active-order-banner-${user.id}`)
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
              Order {order.order_code} is{" "}
              {STATUS_LABEL[order.status as OrderStatus] ?? order.status}
            </p>
            <p className="text-xs text-accent-foreground/80">Tap to track your delivery live</p>
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
              {s.label}
            </span>
          </li>
        ))}
      </ol>
    </Link>
  );
}
