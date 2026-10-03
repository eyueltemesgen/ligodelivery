import { createFileRoute, Navigate } from "@tanstack/react-router";

// Backward-compatible shim: the customer order list now lives inside the
// account center at /account/orders.
export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "My orders — የኔ Go" },
      { name: "description", content: "Track your current and past የኔ Go deliveries in Bishoftu." },
    ],
  }),
  component: () => <Navigate to="/account/orders" replace />,
});
