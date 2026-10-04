import { supabase } from "@/integrations/supabase/client";
import type { TranslationKey } from "@/lib/i18n";

export const ORDER_STATUSES = [
  "pending_payment",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "dispatched",
  "accepted",
  "arrived_at_merchant",
  "picked_up",
  "on_the_way",
  "delivered",
  "cancelled",
  // Legacy statuses kept so older orders still render
  "pending",
  "payment_verification",
  "rider_assigned",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pending Payment",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for Pickup",
  dispatched: "Dispatched",
  accepted: "Rider Accepted",
  arrived_at_merchant: "At Merchant",
  picked_up: "Picked Up",
  on_the_way: "On the Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
  pending: "Pending Payment",
  payment_verification: "Pending Payment",
  rider_assigned: "Rider Accepted",
};

/** Localized equivalents of STATUS_LABEL, resolved through the i18n dictionary. */
export const STATUS_LABEL_KEY: Record<OrderStatus, TranslationKey> = {
  pending_payment: "order_status_pending_payment",
  confirmed: "order_status_confirmed",
  preparing: "order_status_preparing",
  ready_for_pickup: "order_status_ready_for_pickup",
  dispatched: "order_status_dispatched",
  accepted: "order_status_accepted",
  arrived_at_merchant: "order_status_arrived_at_merchant",
  picked_up: "order_status_picked_up",
  on_the_way: "order_status_on_the_way",
  delivered: "order_status_delivered",
  cancelled: "order_status_cancelled",
  pending: "order_status_pending_payment",
  payment_verification: "order_status_pending_payment",
  rider_assigned: "order_status_accepted",
};

export const TIMELINE: OrderStatus[] = [
  "pending_payment",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "dispatched",
  "accepted",
  "arrived_at_merchant",
  "picked_up",
  "on_the_way",
  "delivered",
];

// Legacy statuses mapped onto the current timeline for progress display
const TIMELINE_ALIASES: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "pending_payment",
  payment_verification: "pending_payment",
  rider_assigned: "accepted",
};

export const timelineIndex = (status: string) => {
  const normalized = TIMELINE_ALIASES[status as OrderStatus] ?? status;
  return TIMELINE.indexOf(normalized as OrderStatus);
};

export const statusTone = (status: string) => {
  if (status === "delivered") return "bg-primary-soft text-accent-foreground";
  if (status === "cancelled") return "bg-destructive/10 text-destructive";
  if (["pending", "payment_verification", "pending_payment"].includes(status))
    return "bg-warning/20 text-warning-foreground";
  return "bg-secondary text-secondary-foreground";
};

/** Statuses where the order is still being fulfilled (not final). */
const OPEN_STATUSES = new Set<string>([
  "pending",
  "payment_verification",
  "pending_payment",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "dispatched",
  "accepted",
  "rider_assigned",
  "arrived_at_merchant",
  "picked_up",
  "on_the_way",
]);

export const isOrderOpen = (status: string) => OPEN_STATUSES.has(status);

/** Customer-facing order tabs. Backend statuses are folded into these groups. */
export const ORDER_TABS = [
  { id: "all", label: "All", labelKey: "order_tab_all" },
  { id: "pending", label: "Pending", labelKey: "order_tab_pending" },
  { id: "confirmed", label: "Confirmed", labelKey: "order_tab_confirmed" },
  { id: "preparing", label: "Preparing", labelKey: "order_tab_preparing" },
  { id: "out_for_delivery", label: "Out for delivery", labelKey: "order_tab_out_for_delivery" },
  { id: "delivered", label: "Delivered", labelKey: "order_tab_delivered" },
  { id: "cancelled", label: "Cancelled", labelKey: "order_tab_cancelled" },
] as const satisfies readonly { id: string; label: string; labelKey: TranslationKey }[];

export type OrderTab = (typeof ORDER_TABS)[number]["id"];

const TAB_STATUSES: Record<Exclude<OrderTab, "all">, string[]> = {
  pending: ["pending", "pending_payment", "payment_verification"],
  confirmed: ["confirmed"],
  preparing: ["preparing", "ready_for_pickup"],
  out_for_delivery: [
    "dispatched",
    "accepted",
    "rider_assigned",
    "arrived_at_merchant",
    "picked_up",
    "on_the_way",
  ],
  delivered: ["delivered"],
  cancelled: ["cancelled"],
};

export const matchesOrderTab = (status: string, tab: OrderTab) =>
  tab === "all" ? true : TAB_STATUSES[tab].includes(status);

/** A customer may cancel until the order is dispatched to a rider. */
export const canCancelOrder = (status: string) =>
  ["pending", "pending_payment", "payment_verification", "confirmed", "preparing"].includes(status);

export const tabCounts = (statuses: string[]) =>
  ORDER_TABS.reduce<Record<OrderTab, number>>(
    (acc, t) => {
      acc[t.id] = statuses.filter((s) => matchesOrderTab(s, t.id)).length;
      return acc;
    },
    {
      all: 0,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
    },
  );

export async function notify(
  userId: string,
  title: string,
  body: string,
  type = "order",
  orderId?: string,
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    body,
    type,
    order_id: orderId ?? null,
  });
}
