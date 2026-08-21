import { createFileRoute } from "@tanstack/react-router";
import { AuthPortal } from "@/components/auth/AuthPortal";

export const Route = createFileRoute("/merchant/login")({
  head: () => ({
    meta: [
      { title: "Store Partner sign-in — Ligo Delivery" },
      { name: "description", content: "Sign in to your Ligo Store Partner portal." },
      { property: "og:title", content: "Store Partner sign-in — Ligo Delivery" },
      { property: "og:description", content: "Manage your Ligo store, orders and menu." },
    ],
  }),
  component: () => <AuthPortal kind="merchant" />,
});
