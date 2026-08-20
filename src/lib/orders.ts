import { supabase } from "@/integrations/supabase/client";

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
