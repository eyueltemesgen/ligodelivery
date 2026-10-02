import { createFileRoute } from "@tanstack/react-router";
import { AuthPortal } from "@/components/auth/AuthPortal";

export const Route = createFileRoute("/rider/login")({
  head: () => ({
    meta: [
      { title: "Driver sign-in — የኔ Go" },
      { name: "description", content: "Sign in to your የኔ Go Driver portal to go online." },
      { property: "og:title", content: "Driver sign-in — የኔ Go" },
      { property: "og:description", content: "Go online and deliver with የኔ Go." },
    ],
  }),
  component: () => <AuthPortal kind="rider" />,
});
