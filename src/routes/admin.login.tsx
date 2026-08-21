import { createFileRoute } from "@tanstack/react-router";
import { AuthPortal } from "@/components/auth/AuthPortal";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin sign-in — Ligo Delivery" },
      { name: "description", content: "Restricted administrative access." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <AuthPortal kind="admin" />,
});
