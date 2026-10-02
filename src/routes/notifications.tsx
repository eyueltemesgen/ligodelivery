import { createFileRoute, Navigate } from "@tanstack/react-router";

// Backward-compatible shim: notifications now live in the account center at
// /account/notifications.
export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Ligo Delivery" },
      {
        name: "description",
        content: "Order updates, delivery alerts and payment confirmations from Ligo.",
      },
    ],
  }),
  component: () => <Navigate to="/account/notifications" replace />,
});
