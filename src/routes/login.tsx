import { createFileRoute } from "@tanstack/react-router";
import { AuthPortal } from "@/components/auth/AuthPortal";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => {
    const out: { redirect?: string } = {};
    if (typeof s["redirect"] === "string") out.redirect = s["redirect"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Sign in — የኔ Go" },
      {
        name: "description",
        content: "Sign in to your የኔ Go customer account to order in Bishoftu.",
      },
      { property: "og:title", content: "Sign in — የኔ Go" },
      { property: "og:description", content: "Access your የኔ Go customer account." },
    ],
  }),
  component: () => <AuthPortal kind="customer" />,
});
