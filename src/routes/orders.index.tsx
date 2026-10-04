import { translations } from "@/lib/i18n";
import { createFileRoute, Navigate } from "@tanstack/react-router";

// Backward-compatible shim: the customer order list now lives inside the
// account center at /account/orders.
export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: translations.en.aoi_meta_title },
      { name: "description", content: "Track your current and past የኔ Go deliveries in Bishoftu." },
    ],
  }),
  component: () => <Navigate to="/account/orders" replace />,
});
