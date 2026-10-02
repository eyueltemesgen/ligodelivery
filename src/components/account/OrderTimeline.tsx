import { Check, CircleDot, XCircle } from "lucide-react";
import { STATUS_LABEL, TIMELINE, timelineIndex, type OrderStatus } from "@/lib/orders";
import { cn } from "@/lib/utils";

/** Short, mobile-friendly labels for the vertical progress timeline. */
const STEP_LABEL: Partial<Record<OrderStatus, string>> = {
  pending_payment: "Order placed",
  confirmed: "Order confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for delivery",
  dispatched: "Assigned for delivery",
  accepted: "Rider assigned",
  arrived_at_merchant: "Rider at shop",
  picked_up: "Picked up",
  on_the_way: "Out for delivery",
  delivered: "Delivered",
};

/**
 * Vertical order timeline. Completed steps are marked, the current step is
 * highlighted, and everything after it stays muted — easy to scan on a phone.
 */
export function OrderTimeline({ status }: { status: string }) {
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
            <p className="text-sm font-semibold text-destructive">Order cancelled</p>
            <p className="text-xs text-muted-foreground">
              This order was cancelled and is no longer being fulfilled.
            </p>
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
                {STEP_LABEL[step] ?? STATUS_LABEL[step]}
              </p>
              {current && <p className="mt-0.5 text-xs text-primary">Current status</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
