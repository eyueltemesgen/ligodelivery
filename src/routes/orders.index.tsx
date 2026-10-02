import { createFileRoute, Navigate } from "@tanstack/react-router";

// Backward-compatible shim: the customer order list now lives inside the
// account center at /account/orders.
export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "My orders — Ligo Delivery" },
      { name: "description", content: "Track your current and past Ligo deliveries in Bishoftu." },
    ],
  }),
  component: () => <Navigate to="/account/orders" replace />,
});
