import { createFileRoute } from "@tanstack/react-router";
import { AuthPortal } from "@/components/auth/AuthPortal";

export const Route = createFileRoute("/rider/login")({
  head: () => ({
    meta: [
      { title: "Driver sign-in — Ligo Delivery" },
      { name: "description", content: "Sign in to your Ligo Driver portal to go online." },
      { property: "og:title", content: "Driver sign-in — Ligo Delivery" },
      { property: "og:description", content: "Go online and deliver with Ligo." },
    ],
  }),
  component: () => <AuthPortal kind="rider" />,
});
