import { createFileRoute, Navigate } from "@tanstack/react-router";

// Backward-compatible shim: notifications now live in the account center at
// /account/notifications.
export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — የኔ Go" },
      {
        name: "description",
        content: "Order updates, delivery alerts and payment confirmations from የኔ Go.",
      },
    ],
  }),
  component: () => <Navigate to="/account/notifications" replace />,
});
