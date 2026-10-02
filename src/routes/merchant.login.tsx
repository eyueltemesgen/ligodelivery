import { createFileRoute } from "@tanstack/react-router";
import { AuthPortal } from "@/components/auth/AuthPortal";

export const Route = createFileRoute("/merchant/login")({
  head: () => ({
    meta: [
      { title: "Store Partner sign-in — የኔ Go" },
      { name: "description", content: "Sign in to your የኔ Go Store Partner portal." },
      { property: "og:title", content: "Store Partner sign-in — የኔ Go" },
      { property: "og:description", content: "Manage your የኔ Go store, orders and menu." },
    ],
  }),
  component: () => <AuthPortal kind="merchant" />,
});
