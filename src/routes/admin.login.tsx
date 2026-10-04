import { translations } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { AuthPortal } from "@/components/auth/AuthPortal";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: translations.en.al_meta_title },
      { name: "description", content: translations.en.al_meta_desc },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <AuthPortal kind="admin" />,
});
