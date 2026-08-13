import { supabase } from "@/integrations/supabase/client";

export const ORDER_STATUSES = [
  "pending",
  "payment_verification",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "rider_assigned",
  "picked_up",
  "on_the_way",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  payment_verification: "Payment verification",
  confirmed: "Order confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  rider_assigned: "Rider assigned",
  picked_up: "Picked up",
  on_the_way: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const TIMELINE: OrderStatus[] = [
  "pending",
  "payment_verification",
  "confirmed",
  "preparing",
  "rider_assigned",
  "picked_up",
  "on_the_way",
  "delivered",
];

export const statusTone = (status: string) => {
  if (status === "delivered") return "bg-primary-soft text-accent-foreground";
  if (status === "cancelled") return "bg-destructive/10 text-destructive";
  if (status === "pending" || status === "payment_verification") return "bg-warning/20 text-warning-foreground";
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