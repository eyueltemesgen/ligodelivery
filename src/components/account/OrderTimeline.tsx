import { Check, CircleDot, XCircle } from "lucide-react";
import { STATUS_LABEL_KEY, TIMELINE, timelineIndex, type OrderStatus } from "@/lib/orders";
import { useLanguage } from "@/hooks/useLanguage";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Short, mobile-friendly labels for the vertical progress timeline. */
const STEP_LABEL_KEY: Partial<Record<OrderStatus, TranslationKey>> = {
  pending_payment: "timeline_placed",
  confirmed: "timeline_confirmed",
  preparing: "timeline_preparing",
  ready_for_pickup: "timeline_ready",
  dispatched: "timeline_dispatched",
  accepted: "timeline_rider_assigned",
  arrived_at_merchant: "timeline_at_shop",
  picked_up: "timeline_picked_up",
  on_the_way: "timeline_out_for_delivery",
  delivered: "timeline_delivered",
};

/**
 * Vertical order timeline. Completed steps are marked, the current step is
 * highlighted, and everything after it stays muted — easy to scan on a phone.
 */
export function OrderTimeline({ status }: { status: string }) {
  const { t } = useLanguage();
  const cancelled = status === "cancelled";
  const currentIndex = timelineIndex(status);

  if (cancelled) {
    return (
      <ol className="space-y-0">
        <li className="flex gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
            <XCircle className="h-4 w-4" />
          </span>
          <div className="pb-1">
            <p className="text-sm font-semibold text-destructive">{t("timeline_cancelled_title")}</p>
            <p className="text-xs text-muted-foreground">{t("timeline_cancelled_desc")}</p>
          </div>
        </li>
      </ol>
    );
  }

  return (
    <ol className="space-y-0">
      {TIMELINE.map((step, idx) => {
        const done = currentIndex > idx;
        const current = currentIndex === idx;
        const last = idx === TIMELINE.length - 1;
        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                  done && "bg-primary text-primary-foreground",
                  current && "bg-primary text-primary-foreground ring-4 ring-primary-soft",
                  !done && !current && "bg-secondary text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : current ? (
                  <CircleDot className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </span>
              {!last && (
                <span
                  className={cn(
                    "my-0.5 w-0.5 flex-1 rounded-full",
                    done ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
            <div className={cn("min-w-0", last ? "pb-0" : "pb-5")}>
              <p
                className={cn(
                  "text-sm",
                  current
                    ? "font-bold text-foreground"
                    : done
                      ? "font-semibold"
                      : "text-muted-foreground",
                )}
              >
                {t(
                  STEP_LABEL_KEY[step] ?? STATUS_LABEL_KEY[step as OrderStatus] ?? "order_status_pending_payment",
                )}
              </p>
              {current && <p className="mt-0.5 text-xs text-primary">{t("timeline_current")}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
